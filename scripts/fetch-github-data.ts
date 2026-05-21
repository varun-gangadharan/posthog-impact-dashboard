import fs from "node:fs";
import path from "node:path";

const REPO_OWNER = "PostHog";
const REPO_NAME = "posthog";
const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;
const PER_PAGE = 100;
const RATE_LIMIT_BUFFER = 50;

interface RawPR {
  number: number;
  title: string;
  body: string;
  state: string;
  author: string;
  authorType: string;
  labels: string[];
  milestone: string | null;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  url: string;
  changedFiles: Array<{ filename: string; additions: number; deletions: number }>;
  reviews: Array<{ reviewer: string; state: string; submittedAt: string }>;
  linkedIssueNumbers: number[];
  isRevert: boolean;
}

interface RawIssue {
  number: number;
  title: string;
  body: string;
  state: string;
  author: string;
  labels: string[];
  milestone: string | null;
  createdAt: string;
  closedAt: string | null;
  url: string;
}

interface RawGitHubData {
  fetchedAt: string;
  days: number;
  sinceDate: string;
  pullRequests: RawPR[];
  issues: RawIssue[];
}

let rateLimitRemaining = 5000;
let rateLimitReset = 0;

function getToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error("GITHUB_TOKEN is not set. Export it in your shell or add to .env");
    console.error("See .env.example for instructions.");
    process.exit(1);
  }
  return token;
}

function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const redacted = { ...headers };
  if (redacted["Authorization"] || redacted["authorization"]) {
    redacted["Authorization"] = "[REDACTED]";
    delete redacted["authorization"];
  }
  return redacted;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ghFetch(url: string, token: string): Promise<Response> {
  if (rateLimitRemaining <= RATE_LIMIT_BUFFER && rateLimitReset > 0) {
    const waitMs = (rateLimitReset - Math.floor(Date.now() / 1000)) * 1000 + 1000;
    if (waitMs > 0) {
      console.log(`  Rate limit low (${rateLimitRemaining} remaining). Pausing ${Math.ceil(waitMs / 1000)}s...`);
      await sleep(waitMs);
    }
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "posthog-impact-dashboard",
    },
  });

  rateLimitRemaining = parseInt(res.headers.get("x-ratelimit-remaining") ?? "5000", 10);
  rateLimitReset = parseInt(res.headers.get("x-ratelimit-reset") ?? "0", 10);

  if (res.status === 403 && rateLimitRemaining === 0) {
    const resetDate = new Date(rateLimitReset * 1000);
    console.error(`Rate limited. Resets at ${resetDate.toISOString()}`);
    process.exit(1);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status} for ${url}: ${body}`);
  }

  return res;
}

function getNextPageUrl(res: Response): string | null {
  const link = res.headers.get("link");
  if (!link) return null;
  const match = link.match(/<([^>]+)>;\s*rel="next"/);
  return match ? match[1] : null;
}

async function fetchAllPages<T>(startUrl: string, token: string, label: string): Promise<T[]> {
  const results: T[] = [];
  let url: string | null = startUrl;
  let page = 1;

  while (url) {
    process.stdout.write(`  ${label}... page ${page}\r`);
    const res = await ghFetch(url, token);
    const data = (await res.json()) as T[];
    if (data.length === 0) break;
    results.push(...data);
    url = getNextPageUrl(res);
    page++;
  }

  console.log(`  ${label}... ${results.length} items (${page - 1} pages)`);
  return results;
}

function parseLinkedIssues(body: string | null): number[] {
  if (!body) return [];
  const patterns = [
    /(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi,
    /(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/(\d+)/gi,
  ];
  const numbers = new Set<number>();
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(body)) !== null) {
      numbers.add(parseInt(match[1], 10));
    }
  }
  return [...numbers];
}

function isRevert(title: string): boolean {
  return /^revert\s/i.test(title.trim());
}

async function fetchPRFiles(prNumber: number, token: string): Promise<RawPR["changedFiles"]> {
  const files: RawPR["changedFiles"] = [];
  let url: string | null = `${API_BASE}/pulls/${prNumber}/files?per_page=${PER_PAGE}`;

  while (url) {
    const res = await ghFetch(url, token);
    const data = (await res.json()) as Array<{ filename: string; additions: number; deletions: number }>;
    for (const f of data) {
      files.push({ filename: f.filename, additions: f.additions, deletions: f.deletions });
    }
    url = getNextPageUrl(res);
  }

  return files;
}

async function fetchPRReviews(prNumber: number, token: string): Promise<RawPR["reviews"]> {
  const reviews: RawPR["reviews"] = [];
  let url: string | null = `${API_BASE}/pulls/${prNumber}/reviews?per_page=${PER_PAGE}`;

  while (url) {
    const res = await ghFetch(url, token);
    const data = (await res.json()) as Array<{
      user: { login: string } | null;
      state: string;
      submitted_at: string;
    }>;
    for (const r of data) {
      if (!r.user) continue;
      reviews.push({
        reviewer: r.user.login,
        state: r.state,
        submittedAt: r.submitted_at,
      });
    }
    url = getNextPageUrl(res);
  }

  return reviews;
}

async function main() {
  const token = getToken();

  const daysArg = process.argv.find((a) => a.startsWith("--days="));
  const days = daysArg ? parseInt(daysArg.split("=")[1], 10) : 90;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  console.log(`Fetching GitHub data for ${REPO_OWNER}/${REPO_NAME} (last ${days} days, since ${sinceISO.split("T")[0]})`);

  const rawPRs = await fetchAllPages<any>(
    `${API_BASE}/pulls?state=closed&sort=updated&direction=desc&per_page=${PER_PAGE}&since=${sinceISO}`,
    token,
    "Fetching PRs"
  );

  const mergedPRs = rawPRs.filter(
    (pr: any) => pr.merged_at && new Date(pr.merged_at) >= since
  );
  console.log(`  Merged PRs in window: ${mergedPRs.length}`);

  const pullRequests: RawPR[] = [];
  for (let i = 0; i < mergedPRs.length; i++) {
    const pr = mergedPRs[i];
    process.stdout.write(`  Enriching PR ${i + 1}/${mergedPRs.length} (#${pr.number})\r`);

    const [changedFiles, reviews] = await Promise.all([
      fetchPRFiles(pr.number, token),
      fetchPRReviews(pr.number, token),
    ]);

    pullRequests.push({
      number: pr.number,
      title: pr.title,
      body: pr.body ?? "",
      state: pr.state,
      author: pr.user?.login ?? "unknown",
      authorType: pr.user?.type ?? "User",
      labels: (pr.labels ?? []).map((l: any) => l.name),
      milestone: pr.milestone?.title ?? null,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      mergedAt: pr.merged_at,
      closedAt: pr.closed_at,
      url: pr.html_url,
      changedFiles,
      reviews,
      linkedIssueNumbers: parseLinkedIssues(pr.body),
      isRevert: isRevert(pr.title),
    });
  }
  console.log(`  Enriched ${pullRequests.length} PRs with files + reviews`);

  const rawIssues = await fetchAllPages<any>(
    `${API_BASE}/issues?state=closed&sort=updated&direction=desc&per_page=${PER_PAGE}&since=${sinceISO}`,
    token,
    "Fetching issues"
  );

  const issues: RawIssue[] = rawIssues
    .filter((i: any) => !i.pull_request && i.closed_at && new Date(i.closed_at) >= since)
    .map((i: any) => ({
      number: i.number,
      title: i.title,
      body: i.body ?? "",
      state: i.state,
      author: i.user?.login ?? "unknown",
      labels: (i.labels ?? []).map((l: any) => l.name),
      milestone: i.milestone?.title ?? null,
      createdAt: i.created_at,
      closedAt: i.closed_at,
      url: i.html_url,
    }));

  const result: RawGitHubData = {
    fetchedAt: new Date().toISOString(),
    days,
    sinceDate: sinceISO,
    pullRequests,
    issues,
  };

  const outDir = path.resolve(import.meta.dirname ?? ".", "..", "data");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, "raw-github.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));

  console.log(`\nDone! Wrote ${outPath}`);
  console.log(`  PRs:              ${pullRequests.length}`);
  console.log(`  Issues:           ${issues.length}`);
  console.log(`  Reviews:          ${pullRequests.reduce((s, p) => s + p.reviews.length, 0)}`);
  console.log(`  Changed-file sets:${pullRequests.filter((p) => p.changedFiles.length > 0).length}`);
  console.log(`  Rate limit left:  ${rateLimitRemaining}`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  const safeMessage = message.replace(/Bearer\s+\S+/g, "Bearer [REDACTED]");
  console.error("Fetch failed:", safeMessage);
  process.exit(1);
});
