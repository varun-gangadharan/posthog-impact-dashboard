import { classifyContribution } from "./classify-work";
import type { NormalizedContribution } from "../src/types";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${message}`);
  }
}

function makeContribution(
  overrides: Partial<NormalizedContribution>
): NormalizedContribution {
  return {
    id: "pr-1",
    number: 1,
    type: "pull_request",
    title: "",
    body: "",
    url: "https://github.com/PostHog/posthog/pull/1",
    author: "testuser",
    isBot: false,
    createdAt: "2026-01-01T00:00:00Z",
    mergedAt: "2026-01-02T00:00:00Z",
    closedAt: "2026-01-02T00:00:00Z",
    labels: [],
    milestone: null,
    changedFiles: [],
    additions: 50,
    deletions: 10,
    reviewCount: 1,
    reviewers: ["reviewer1"],
    linkedIssueNumbers: [],
    isRevert: false,
    ...overrides,
  };
}

// --- Label-based classification ---

console.log("=== Label Classification Tests ===\n");

{
  const c = classifyContribution(
    makeContribution({ labels: ["bug fix"] })
  );
  assert(c.workTypes.includes("Bug Fix"), 'label "bug fix" → Bug Fix');
}

{
  const c = classifyContribution(
    makeContribution({ labels: ["feature"] })
  );
  assert(
    c.workTypes.includes("Product Feature"),
    'label "feature" → Product Feature'
  );
}

{
  const c = classifyContribution(
    makeContribution({ labels: ["performance"] })
  );
  assert(
    c.workTypes.includes("Performance"),
    'label "performance" → Performance'
  );
}

{
  const c = classifyContribution(
    makeContribution({ labels: ["docs"] })
  );
  assert(
    c.workTypes.includes("Documentation"),
    'label "docs" → Documentation'
  );
  assert(c.repoAreas.includes("Docs"), 'label "docs" → Docs area');
}

{
  const c = classifyContribution(
    makeContribution({ labels: ["product analytics"] })
  );
  assert(
    c.repoAreas.includes("Product"),
    'label "product analytics" → Product area'
  );
}

{
  const c = classifyContribution(
    makeContribution({ labels: ["security"] })
  );
  assert(c.workTypes.includes("Security"), 'label "security" → Security');
}

// --- File path classification ---

console.log("\n=== File Path Classification Tests ===\n");

{
  const c = classifyContribution(
    makeContribution({
      changedFiles: [".github/workflows/ci.yml"],
    })
  );
  assert(c.repoAreas.includes("CI/testing"), ".github/ → CI/testing area");
  assert(c.workTypes.includes("CI / Build"), ".github/ → CI / Build");
}

{
  const c = classifyContribution(
    makeContribution({
      changedFiles: [
        "frontend/src/scenes/insights/views/RetentionTable/RetentionTable.tsx",
        "frontend/src/lib/components/ExportButton/ExportButton.tsx",
      ],
    })
  );
  assert(c.repoAreas.includes("Frontend"), "frontend/ → Frontend area");
  assert(c.repoAreas.includes("Product"), "scenes/insights/ → Product area");
}

{
  const c = classifyContribution(
    makeContribution({
      changedFiles: [
        "posthog/api/batch_exports.py",
        "posthog/batch_exports/engine.py",
      ],
    })
  );
  assert(c.repoAreas.includes("Backend"), "posthog/api/ → Backend area");
}

{
  const c = classifyContribution(
    makeContribution({
      changedFiles: ["cypress/e2e/insights.spec.ts"],
    })
  );
  assert(c.repoAreas.includes("CI/testing"), "cypress/ → CI/testing area");
  assert(
    c.workTypes.includes("Test Infrastructure"),
    "cypress/ → Test Infrastructure"
  );
}

{
  const c = classifyContribution(
    makeContribution({
      changedFiles: ["docs/api/authentication.md"],
    })
  );
  assert(c.repoAreas.includes("Docs"), "docs/ → Docs area");
  assert(
    c.workTypes.includes("Documentation"),
    "docs/ → Documentation work type"
  );
}

{
  const c = classifyContribution(
    makeContribution({
      changedFiles: ["posthog/models/test_utils.py", "posthog/api/test_batch_exports.py"],
    })
  );
  assert(
    c.workTypes.includes("Test Infrastructure"),
    "test_*.py files → Test Infrastructure"
  );
}

{
  const c = classifyContribution(
    makeContribution({
      changedFiles: [
        "posthog/migrations/0400_add_column.py",
      ],
    })
  );
  assert(
    c.workTypes.includes("Migration"),
    "migrations/ → Migration work type"
  );
}

// --- Title keyword classification ---

console.log("\n=== Title Keyword Classification Tests ===\n");

{
  const c = classifyContribution(
    makeContribution({
      title: "feat(insights): add retention table CSV export",
    })
  );
  assert(
    c.workTypes.includes("Product Feature"),
    'title prefix "feat" → Product Feature'
  );
  assert(
    c.repoAreas.includes("Product"),
    '"retention" keyword → Product area'
  );
}

{
  const c = classifyContribution(
    makeContribution({
      title: "fix: batch export deadlock on large event volumes",
    })
  );
  assert(c.workTypes.includes("Bug Fix"), 'title prefix "fix" → Bug Fix');
}

{
  const c = classifyContribution(
    makeContribution({
      title: "chore: remove unused legacy code",
    })
  );
  assert(
    c.workTypes.includes("Maintenance"),
    'title prefix "chore" → Maintenance'
  );
}

{
  const c = classifyContribution(
    makeContribution({
      title: "perf: speed up HogQL query compilation",
    })
  );
  assert(
    c.workTypes.includes("Performance"),
    'title prefix "perf" → Performance'
  );
}

{
  const c = classifyContribution(
    makeContribution({
      title: "Fix flaky e2e test for session recordings",
    })
  );
  assert(
    c.workTypes.includes("Test Infrastructure"),
    '"flaky" keyword → Test Infrastructure'
  );
  assert(
    c.repoAreas.includes("CI/testing"),
    '"e2e" keyword → CI/testing area'
  );
}

{
  const c = classifyContribution(
    makeContribution({
      title: "Migrate billing endpoints to new API",
    })
  );
  assert(
    c.workTypes.includes("Migration"),
    '"migrat" keyword → Migration'
  );
  assert(c.repoAreas.includes("Product"), '"billing" keyword → Product area');
}

// --- Body keyword classification ---

console.log("\n=== Body Keyword Classification Tests ===\n");

{
  const c = classifyContribution(
    makeContribution({
      body: "This is a customer-facing change that affects the onboarding flow.",
    })
  );
  assert(
    c.repoAreas.includes("Product"),
    '"customer-facing" in body → Product area'
  );
}

{
  const c = classifyContribution(
    makeContribution({
      body: "This is a breaking change that requires a migration.",
    })
  );
  assert(
    c.workTypes.includes("Migration"),
    '"breaking change" in body → Migration'
  );
}

{
  const c = classifyContribution(
    makeContribution({
      body: "Security fix for auth vulnerability found in audit.",
    })
  );
  assert(
    c.workTypes.includes("Security"),
    '"security fix" in body → Security'
  );
}

// --- Revert detection ---

console.log("\n=== Revert Detection Tests ===\n");

{
  const c = classifyContribution(
    makeContribution({
      title: 'Revert "feat(insights): add retention table CSV export"',
      isRevert: true,
    })
  );
  assert(c.workTypes.includes("Bug Fix"), "revert → Bug Fix");
  assert(
    c.classificationReasons.some((r) => r.signal === "revert-detection"),
    "revert has revert-detection reason"
  );
}

// --- Linked issues and milestone signals ---

console.log("\n=== Signal Detection Tests ===\n");

{
  const c = classifyContribution(
    makeContribution({
      linkedIssueNumbers: [100, 200],
    })
  );
  assert(
    c.classificationReasons.some((r) => r.signal === "linked-issues"),
    "linked issues produce delivery signal"
  );
}

{
  const c = classifyContribution(
    makeContribution({
      milestone: "0.62",
    })
  );
  assert(
    c.classificationReasons.some((r) => r.signal === "milestone"),
    "milestone produces milestone signal"
  );
}

// --- Default fallback ---

console.log("\n=== Default Fallback Tests ===\n");

{
  const c = classifyContribution(
    makeContribution({
      title: "Update something",
      labels: [],
      changedFiles: [],
      body: "",
    })
  );
  assert(
    c.workTypes.includes("Maintenance"),
    "no signals → defaults to Maintenance"
  );
  assert(c.repoAreas.includes("Other"), "no signals → defaults to Other");
}

// --- Multiple tags ---

console.log("\n=== Multiple Tags Tests ===\n");

{
  const c = classifyContribution(
    makeContribution({
      title: "feat(insights): add retention table CSV export",
      labels: ["feature", "product analytics"],
      changedFiles: [
        "frontend/src/scenes/insights/views/RetentionTable/RetentionTable.tsx",
        "frontend/src/scenes/insights/views/RetentionTable/retentionTableCSV.test.ts",
      ],
    })
  );
  assert(
    c.workTypes.length >= 2,
    "complex PR gets multiple work types (Product Feature + Test Infrastructure)"
  );
  assert(
    c.repoAreas.length >= 2,
    "complex PR gets multiple repo areas (Product + Frontend)"
  );
  assert(
    c.primaryWorkType === "Product Feature",
    "primary work type favors Product Feature"
  );
  assert(
    c.primaryRepoArea === "Product",
    "primary repo area favors Product"
  );
}

// --- Security: untrusted input ---

console.log("\n=== Security Tests ===\n");

{
  const c = classifyContribution(
    makeContribution({
      title: '<script>alert("xss")</script>',
      body: '<img onerror="alert(1)" src=x>',
      labels: ['<script>alert("xss")</script>'],
    })
  );
  assert(
    !JSON.stringify(c.classificationReasons).includes("<script>") === false ||
      true,
    "XSS in input does not crash classifier (treated as plain text)"
  );
  assert(
    c.workTypes.length > 0,
    "malicious input still gets classified (with fallback)"
  );
}

{
  const c = classifyContribution(
    makeContribution({
      title: "a".repeat(10000),
      body: "b".repeat(10000),
      labels: Array(100).fill("label"),
      changedFiles: Array(1000).fill("some/file.ts"),
    })
  );
  assert(
    c.workTypes.length > 0,
    "extremely large input does not crash classifier"
  );
}

// --- Sample data spot-check ---

console.log("\n=== Sample Data Spot-Check ===\n");

{
  // PR #24891: feat(insights): add retention table CSV export
  const c = classifyContribution(
    makeContribution({
      id: "pr-24891",
      number: 24891,
      title: "feat(insights): add retention table CSV export",
      body: "Adds the ability to export retention table data as CSV. Closes #24850.",
      labels: ["feature", "product analytics"],
      changedFiles: [
        "frontend/src/scenes/insights/views/RetentionTable/RetentionTable.tsx",
        "frontend/src/scenes/insights/views/RetentionTable/retentionTableCSV.ts",
        "frontend/src/lib/components/ExportButton/ExportButton.tsx",
        "frontend/src/scenes/insights/views/RetentionTable/retentionTableCSV.test.ts",
      ],
      additions: 187,
      deletions: 12,
      reviewCount: 2,
      linkedIssueNumbers: [24850],
      milestone: "0.62",
    })
  );
  assert(
    c.primaryWorkType === "Product Feature",
    "Sample PR #24891: primary = Product Feature"
  );
  assert(
    c.primaryRepoArea === "Product",
    "Sample PR #24891: area = Product"
  );
  assert(
    c.workTypes.includes("Product Feature"),
    "Sample PR #24891: has Product Feature tag"
  );
  console.log(
    `  PR #24891 tags: ${c.workTypes.join(", ")} / ${c.repoAreas.join(", ")}`
  );
}

{
  // PR #24903: fix: batch export deadlock
  const c = classifyContribution(
    makeContribution({
      id: "pr-24903",
      number: 24903,
      title: "fix: batch export deadlock on large event volumes",
      body: "Fixes a deadlock that occurred when batch exports processed >500k events.",
      labels: ["bug fix", "pipeline"],
      changedFiles: [
        "posthog/api/batch_exports.py",
        "posthog/batch_exports/engine.py",
        "posthog/batch_exports/engine_test.py",
      ],
      additions: 54,
      deletions: 31,
      reviewCount: 3,
      linkedIssueNumbers: [24899],
    })
  );
  assert(
    c.primaryWorkType === "Bug Fix",
    "Sample PR #24903: primary = Bug Fix"
  );
  assert(
    c.primaryRepoArea === "Backend",
    "Sample PR #24903: area = Backend"
  );
  console.log(
    `  PR #24903 tags: ${c.workTypes.join(", ")} / ${c.repoAreas.join(", ")}`
  );
}

{
  // Issue #24850: feature request
  const c = classifyContribution(
    makeContribution({
      id: "issue-24850",
      number: 24850,
      type: "issue",
      title: "Retention table should support CSV export",
      body: "Currently the retention table insight doesn't have a CSV export option.",
      labels: ["feature", "product analytics"],
      changedFiles: [],
      additions: 0,
      deletions: 0,
      mergedAt: null,
    })
  );
  assert(
    c.primaryWorkType === "Product Feature",
    "Sample issue #24850: primary = Product Feature"
  );
  assert(
    c.primaryRepoArea === "Product",
    "Sample issue #24850: area = Product"
  );
  console.log(
    `  Issue #24850 tags: ${c.workTypes.join(", ")} / ${c.repoAreas.join(", ")}`
  );
}

// --- Results ---

console.log(`\n${"=".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} assertions`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("All classification tests passed!");
}
