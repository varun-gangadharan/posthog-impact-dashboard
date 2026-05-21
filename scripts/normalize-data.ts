import { readFileSync, writeFileSync, existsSync } from "fs";
import type { NormalizedContribution, NormalizedData } from "../src/types";

const RAW_PATH = "data/raw-github.json";
const OUT_PATH = "data/normalized.json";
const BODY_MAX_LENGTH = 500;

const KNOWN_BOTS = new Set([
  "dependabot",
  "renovate",
  "github-actions",
  "posthog-bot",
  "codecov",
  "netlify",
  "vercel",
]);

function isBot(login: string, authorType?: string): boolean {
  if (login.includes("[bot]")) return true;
  if (authorType === "Bot") return true;
  if (KNOWN_BOTS.has(login.toLowerCase())) return true;
  return false;
}

function truncate(text: string | null | undefined, max: number): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "..." : text;
}

function main() {
  if (!existsSync(RAW_PATH)) {
    console.error(`Error: ${RAW_PATH} not found. Run fetch:data first.`);
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(RAW_PATH, "utf-8"));

  const issueMap = new Map<number, (typeof raw.issues)[0]>();
  for (const issue of raw.issues ?? []) {
    issueMap.set(issue.number, issue);
  }

  const contributions: NormalizedContribution[] = [];
  const engineerSet = new Set<string>();
  const botSet = new Set<string>();
  const missing: string[] = [];

  let mergedPRCount = 0;
  let closedIssueCount = 0;

  for (const pr of raw.pullRequests ?? []) {
    if (pr.state !== "MERGED" && !pr.mergedAt) continue;

    const bot = isBot(pr.author, pr.authorType);
    if (bot) {
      botSet.add(pr.author);
    } else {
      engineerSet.add(pr.author);
    }

    if (!pr.title || !pr.url || !pr.author) {
      missing.push(`pr-${pr.number}`);
    }

    const resolvedIssues = (pr.linkedIssueNumbers ?? []).filter(
      (n: number) => issueMap.has(n)
    );

    contributions.push({
      id: `pr-${pr.number}`,
      number: pr.number,
      type: "pull_request",
      title: pr.title ?? "",
      body: truncate(pr.body, BODY_MAX_LENGTH),
      url: pr.url ?? "",
      author: pr.author ?? "",
      isBot: bot,
      createdAt: pr.createdAt,
      mergedAt: pr.mergedAt ?? null,
      closedAt: pr.closedAt ?? null,
      labels: pr.labels ?? [],
      milestone: pr.milestone ?? null,
      changedFiles: (pr.changedFiles ?? []).map(
        (f: { filename: string }) => f.filename
      ),
      additions: (pr.changedFiles ?? []).reduce(
        (sum: number, f: { additions: number }) => sum + (f.additions ?? 0),
        0
      ),
      deletions: (pr.changedFiles ?? []).reduce(
        (sum: number, f: { deletions: number }) => sum + (f.deletions ?? 0),
        0
      ),
      reviewCount: (pr.reviews ?? []).length,
      reviewers: Array.from(
        new Set<string>(
          (pr.reviews ?? []).map((r: { reviewer: string }) => r.reviewer)
        )
      ),
      linkedIssueNumbers: resolvedIssues,
      isRevert: pr.isRevert ?? false,
    });
    mergedPRCount++;
  }

  for (const issue of raw.issues ?? []) {
    if (issue.state !== "CLOSED" && !issue.closedAt) continue;

    const bot = isBot(issue.author);
    if (bot) {
      botSet.add(issue.author);
    } else {
      engineerSet.add(issue.author);
    }

    if (!issue.title || !issue.url || !issue.author) {
      missing.push(`issue-${issue.number}`);
    }

    contributions.push({
      id: `issue-${issue.number}`,
      number: issue.number,
      type: "issue",
      title: issue.title ?? "",
      body: truncate(issue.body, BODY_MAX_LENGTH),
      url: issue.url ?? "",
      author: issue.author ?? "",
      isBot: bot,
      createdAt: issue.createdAt,
      mergedAt: null,
      closedAt: issue.closedAt ?? null,
      labels: issue.labels ?? [],
      milestone: issue.milestone ?? null,
      changedFiles: [],
      additions: 0,
      deletions: 0,
      reviewCount: 0,
      reviewers: [],
      linkedIssueNumbers: [],
      isRevert: false,
    });
    closedIssueCount++;
  }

  const uniqueEngineers = [...engineerSet].sort();
  const botAccounts = [...botSet].sort();

  const output: NormalizedData = {
    normalizedAt: new Date().toISOString(),
    sourceDate: raw.sinceDate ?? raw.fetchedAt,
    days: raw.days ?? 0,
    contributions,
    uniqueEngineers,
    botAccounts,
  };

  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));

  const dates = contributions
    .map((c) => c.createdAt)
    .filter(Boolean)
    .sort();
  const dateRange =
    dates.length > 0
      ? `${dates[0]} → ${dates[dates.length - 1]}`
      : "no dates";

  console.log("\n=== Normalization Summary ===");
  console.log(`Total contributions: ${contributions.length}`);
  console.log(`  Merged PRs:       ${mergedPRCount}`);
  console.log(`  Closed issues:    ${closedIssueCount}`);
  console.log(`Unique engineers:   ${uniqueEngineers.length}`);
  console.log(`Bot accounts:       ${botAccounts.length} (${botAccounts.join(", ") || "none"})`);
  console.log(`Date range:         ${dateRange}`);
  if (missing.length > 0) {
    console.log(`Missing fields:     ${missing.length} contributions (${missing.join(", ")})`);
  } else {
    console.log(`Missing fields:     none`);
  }
  console.log(`\nOutput written to ${OUT_PATH}`);
}

main();
