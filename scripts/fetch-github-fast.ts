import fs from "node:fs";
import path from "node:path";

const REPO = "PostHog/posthog";
const API_BASE = "https://api.github.com";
const PER_PAGE = 100;
const SEARCH_PER_PAGE = 100;
const MAX_SEARCH_RESULTS = 1000;

let rateLimitRemaining = 5000;
let rateLimitReset = 0;

function getToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error("GITHUB_TOKEN is not set.");
    process.exit(1);
  }
  return token;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ghFetch(url: string, token: string): Promise<Response> {
  if (rateLimitRemaining <= 10 && rateLimitReset > 0) {
    const waitMs = (rateLimitReset - Math.floor(Date.now() / 1000)) * 1000 + 2000;
    if (waitMs > 0 && waitMs < 120000) {
      console.log(`  Rate limit low (${rateLimitRemaining}). Pausing ${Math.ceil(waitMs / 1000)}s...`);
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

  const rlHeader = res.headers.get("x-ratelimit-remaining");
  if (rlHeader) {
    rateLimitRemaining = parseInt(rlHeader, 10);
    rateLimitReset = parseInt(res.headers.get("x-ratelimit-reset") ?? "0", 10);
  }

  if (res.status === 403) {
    const body = await res.text();
    if (body.includes("rate limit") || body.includes("secondary")) {
      console.log("  Secondary rate limit hit. Waiting 60s...");
      await sleep(60000);
      return ghFetch(url, token);
    }
    throw new Error(`GitHub API 403: ${body.slice(0, 200)}`);
  }

  if (res.status === 422) {
    return res;
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status}: ${body.slice(0, 200)}`);
  }

  return res;
}

function parseLinkedIssues(body: string | null): number[] {
  if (!body) return [];
  const patterns = [
    /(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi,
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

async function searchMergedPRs(token: string, sinceDate: string, untilDate: string): Promise<any[]> {
  const allResults: any[] = [];

  const chunkDays = 7;
  const start = new Date(sinceDate);
  const end = new Date(untilDate);
  const chunks: Array<[string, string]> = [];

  let cursor = new Date(start);
  while (cursor < end) {
    const chunkEnd = new Date(cursor);
    chunkEnd.setDate(chunkEnd.getDate() + chunkDays);
    const effectiveEnd = chunkEnd > end ? end : chunkEnd;
    chunks.push([cursor.toISOString().split("T")[0], effectiveEnd.toISOString().split("T")[0]]);
    cursor = new Date(effectiveEnd);
    cursor.setDate(cursor.getDate() + 1);
  }

  console.log(`  Searching in ${chunks.length} weekly chunks...`);

  for (let ci = 0; ci < chunks.length; ci++) {
    const [from, to] = chunks[ci];
    let page = 1;
    let chunkCount = 0;

    while (page <= 10) {
      const q = encodeURIComponent(`repo:${REPO} is:pr is:merged merged:${from}..${to}`);
      const url = `${API_BASE}/search/issues?q=${q}&per_page=${SEARCH_PER_PAGE}&page=${page}&sort=updated&order=desc`;

      process.stdout.write(`  Chunk ${ci + 1}/${chunks.length} (${from}..${to}) page ${page}  \r`);

      const res = await ghFetch(url, token);
      if (res.status === 422) break;

      const data = await res.json();
      const items = data.items ?? [];
      if (items.length === 0) break;

      allResults.push(...items);
      chunkCount += items.length;

      if (items.length < SEARCH_PER_PAGE) break;
      if (chunkCount >= MAX_SEARCH_RESULTS) break;

      page++;
      await sleep(700);
    }
  }

  console.log(`  Total merged PRs found: ${allResults.length}                       `);
  return allResults;
}

async function main() {
  const token = getToken();

  const daysArg = process.argv.find((a) => a.startsWith("--days="));
  const days = daysArg ? parseInt(daysArg.split("=")[1], 10) : 90;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const now = new Date();

  console.log(`Fast-fetching ${REPO} (last ${days} days)`);
  console.log(`Range: ${since.toISOString().split("T")[0]} to ${now.toISOString().split("T")[0]}`);
  console.log("Mode: search API (metadata only, no per-PR enrichment)\n");

  const rawPRs = await searchMergedPRs(token, since.toISOString(), now.toISOString());

  const seen = new Set<number>();
  const pullRequests = rawPRs
    .filter((pr: any) => {
      if (seen.has(pr.number)) return false;
      seen.add(pr.number);
      return true;
    })
    .map((pr: any) => ({
      number: pr.number,
      title: pr.title ?? "",
      body: (pr.body ?? "").slice(0, 500),
      state: "MERGED",
      author: pr.user?.login ?? "unknown",
      authorType: pr.user?.type ?? "User",
      labels: (pr.labels ?? []).map((l: any) => l.name),
      milestone: pr.milestone?.title ?? null,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      mergedAt: pr.pull_request?.merged_at ?? pr.closed_at,
      closedAt: pr.closed_at,
      url: pr.html_url,
      additions: 0,
      deletions: 0,
      changedFiles: [],
      reviews: [],
      linkedIssueNumbers: parseLinkedIssues(pr.body),
      isRevert: /^revert\s/i.test((pr.title ?? "").trim()),
    }));

  console.log(`\n  Unique merged PRs: ${pullRequests.length}`);

  console.log("\nFetching closed issues...");
  const issueResults: any[] = [];
  const chunks2: Array<[string, string]> = [];
  let cursor2 = new Date(since);
  while (cursor2 < now) {
    const chunkEnd = new Date(cursor2);
    chunkEnd.setDate(chunkEnd.getDate() + 14);
    const effectiveEnd = chunkEnd > now ? now : chunkEnd;
    chunks2.push([cursor2.toISOString().split("T")[0], effectiveEnd.toISOString().split("T")[0]]);
    cursor2 = new Date(effectiveEnd);
    cursor2.setDate(cursor2.getDate() + 1);
  }

  for (let ci = 0; ci < chunks2.length; ci++) {
    const [from, to] = chunks2[ci];
    const q = encodeURIComponent(`repo:${REPO} is:issue is:closed closed:${from}..${to}`);
    const url = `${API_BASE}/search/issues?q=${q}&per_page=${SEARCH_PER_PAGE}&page=1&sort=updated&order=desc`;

    process.stdout.write(`  Issues chunk ${ci + 1}/${chunks2.length} (${from}..${to})  \r`);
    const res = await ghFetch(url, token);
    if (res.status !== 422) {
      const data = await res.json();
      issueResults.push(...(data.items ?? []));
    }
    await sleep(700);
  }

  const seenIssues = new Set<number>();
  const issues = issueResults
    .filter((i: any) => {
      if (!i || i.pull_request) return false;
      if (seenIssues.has(i.number)) return false;
      seenIssues.add(i.number);
      return true;
    })
    .map((i: any) => ({
      number: i.number,
      title: i.title ?? "",
      body: (i.body ?? "").slice(0, 500),
      state: "CLOSED",
      author: i.user?.login ?? "unknown",
      labels: (i.labels ?? []).map((l: any) => l.name),
      milestone: i.milestone?.title ?? null,
      createdAt: i.created_at,
      closedAt: i.closed_at,
      url: i.html_url,
    }));

  console.log(`  Closed issues: ${issues.length}                       `);

  const result = {
    fetchedAt: new Date().toISOString(),
    days,
    sinceDate: since.toISOString(),
    pullRequests,
    issues,
  };

  const outDir = path.resolve(import.meta.dirname ?? ".", "..", "data");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, "raw-github.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));

  const uniqueAuthors = new Set(pullRequests.map((p: any) => p.author));
  console.log(`\nDone! Wrote ${outPath}`);
  console.log(`  PRs:             ${pullRequests.length}`);
  console.log(`  Issues:          ${issues.length}`);
  console.log(`  Unique authors:  ${uniqueAuthors.size}`);
  console.log(`  Rate limit left: ${rateLimitRemaining}`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error("Fetch failed:", message.replace(/Bearer\s+\S+/g, "Bearer [REDACTED]"));
  process.exit(1);
});
