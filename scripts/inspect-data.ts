import fs from "node:fs";
import path from "node:path";

const dataPath = path.resolve(import.meta.dirname ?? ".", "..", "data", "raw-github.json");

function main() {
  if (!fs.existsSync(dataPath)) {
    console.error(`No data file found at ${dataPath}`);
    console.error("Run 'npm run fetch:data' first.");
    process.exit(1);
  }

  const raw = fs.readFileSync(dataPath, "utf-8");
  const data = JSON.parse(raw);

  const prs = data.pullRequests ?? [];
  const issues = data.issues ?? [];
  const totalReviews = prs.reduce((s: number, p: any) => s + (p.reviews?.length ?? 0), 0);

  console.log("=== PostHog GitHub Data Inspection ===\n");
  console.log(`Fetched at:    ${data.fetchedAt}`);
  console.log(`Days:          ${data.days}`);
  console.log(`Since:         ${data.sinceDate}\n`);

  console.log(`PRs:           ${prs.length}`);
  console.log(`Issues:        ${issues.length}`);
  console.log(`Reviews:       ${totalReviews}`);

  if (prs.length > 0) {
    const mergedDates = prs
      .map((p: any) => p.mergedAt)
      .filter(Boolean)
      .sort();
    console.log(`\nPR date range: ${mergedDates[0]?.split("T")[0]} — ${mergedDates[mergedDates.length - 1]?.split("T")[0]}`);

    console.log("\nSample PRs:");
    for (const pr of prs.slice(0, 3)) {
      console.log(`  #${pr.number}: ${pr.title}`);
      console.log(`    ${pr.url}`);
    }
  }

  if (issues.length > 0) {
    const closedDates = issues
      .map((i: any) => i.closedAt)
      .filter(Boolean)
      .sort();
    console.log(`\nIssue date range: ${closedDates[0]?.split("T")[0]} — ${closedDates[closedDates.length - 1]?.split("T")[0]}`);
  }

  const revertCount = prs.filter((p: any) => p.isRevert).length;
  const withLinkedIssues = prs.filter((p: any) => p.linkedIssueNumbers?.length > 0).length;
  const botPRs = prs.filter((p: any) => p.authorType === "Bot").length;

  console.log(`\nReverts:       ${revertCount}`);
  console.log(`PRs w/ linked issues: ${withLinkedIssues}`);
  console.log(`Bot PRs:       ${botPRs}`);

  const tokenPattern = /gh[ps]_[A-Za-z0-9_]{36,}|github_pat_[A-Za-z0-9_]{22,}/;
  if (tokenPattern.test(raw)) {
    console.error("\n!! WARNING: Possible token-like string found in data file !!");
    process.exit(1);
  } else {
    console.log("\nToken check:   PASS (no token-like strings found)");
  }
}

main();
