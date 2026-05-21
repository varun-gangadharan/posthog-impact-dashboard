import { scoreContribution, scoreEngineers } from "./score-engineers";
import { classifyContribution } from "./classify-work";
import type {
  NormalizedContribution,
  ClassifiedContribution,
  ClassifiedData,
} from "../src/types";

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

function classify(overrides: Partial<NormalizedContribution>): ClassifiedContribution {
  return classifyContribution(makeContribution(overrides));
}

function makeClassifiedData(
  contributions: ClassifiedContribution[],
  bots: string[] = []
): ClassifiedData {
  const engineers = [
    ...new Set(contributions.map((c) => c.author)),
  ].filter((a) => !bots.includes(a));
  return {
    classifiedAt: new Date().toISOString(),
    sourceDate: "2026-01-01T00:00:00Z",
    days: 90,
    contributions,
    uniqueEngineers: engineers,
    botAccounts: bots,
  };
}

// ==========================================================
// Phase 4: Scoring tests
// ==========================================================

console.log("=== Major E2E/Testing Work vs Simple UI Tweak ===\n");

{
  const e2ePR = scoreContribution(
    classify({
      id: "pr-100",
      title: "feat: add comprehensive e2e test suite for session recordings",
      labels: ["test"],
      changedFiles: [
        "cypress/e2e/session-recordings/playback.spec.ts",
        "cypress/e2e/session-recordings/filters.spec.ts",
        "cypress/e2e/session-recordings/events.spec.ts",
        "cypress/support/session-recording-helpers.ts",
        "playwright/tests/session-recordings.spec.ts",
      ],
      additions: 800,
      deletions: 50,
      reviewCount: 3,
      linkedIssueNumbers: [500, 501],
      milestone: "0.62",
    })
  );

  const uiTweak = scoreContribution(
    classify({
      id: "pr-101",
      title: "fix: update button color",
      labels: [],
      changedFiles: ["frontend/src/components/Button.tsx"],
      additions: 3,
      deletions: 3,
      reviewCount: 1,
      linkedIssueNumbers: [],
    })
  );

  const e2eTotal =
    e2ePR.deliveryScore * 0.35 +
    e2ePR.productScore * 0.25 +
    e2ePR.leverageScore * 0.25 +
    e2ePR.qualityScore * 0.15;

  const tweakTotal =
    uiTweak.deliveryScore * 0.35 +
    uiTweak.productScore * 0.25 +
    uiTweak.leverageScore * 0.25 +
    uiTweak.qualityScore * 0.15;

  assert(
    e2eTotal > tweakTotal,
    `Major e2e testing work (${e2eTotal.toFixed(1)}) scores higher than simple UI tweak (${tweakTotal.toFixed(1)})`
  );
  assert(
    e2ePR.leverageScore > uiTweak.leverageScore,
    `E2E testing has higher leverage (${e2ePR.leverageScore} vs ${uiTweak.leverageScore})`
  );
}

// --- Large PR cap ---

console.log("\n=== Large PR Cap ===\n");

{
  const normalPR = scoreContribution(
    classify({
      id: "pr-200",
      title: "feat: add retention CSV export",
      labels: ["feature"],
      changedFiles: Array.from({ length: 5 }, (_, i) => `frontend/src/file${i}.tsx`),
      additions: 400,
      deletions: 50,
      reviewCount: 2,
      linkedIssueNumbers: [200],
    })
  );

  const giantPR = scoreContribution(
    classify({
      id: "pr-201",
      title: "feat: add retention CSV export (giant version)",
      labels: ["feature"],
      changedFiles: Array.from({ length: 80 }, (_, i) => `frontend/src/file${i}.tsx`),
      additions: 5000,
      deletions: 2000,
      reviewCount: 2,
      linkedIssueNumbers: [201],
    })
  );

  // Giant PR should NOT be dramatically higher than normal PR
  const normalTotal =
    normalPR.deliveryScore * 0.35 +
    normalPR.productScore * 0.25 +
    normalPR.leverageScore * 0.25 +
    normalPR.qualityScore * 0.15;

  const giantTotal =
    giantPR.deliveryScore * 0.35 +
    giantPR.productScore * 0.25 +
    giantPR.leverageScore * 0.25 +
    giantPR.qualityScore * 0.15;

  assert(
    giantTotal < normalTotal * 2,
    `Giant PR (${giantTotal.toFixed(1)}) is less than 2x normal PR (${normalTotal.toFixed(1)}) due to cap`
  );
  assert(
    giantPR.evidence.some((e) => e.includes("capped")),
    "Giant PR evidence mentions capping"
  );
}

// --- Revert/fix-forward penalty ---

console.log("\n=== Revert Penalty ===\n");

{
  const normalPR = scoreContribution(
    classify({
      id: "pr-300",
      title: "feat: add feature",
      labels: ["feature"],
      changedFiles: ["frontend/src/feature.tsx"],
      additions: 100,
      deletions: 10,
      reviewCount: 2,
    })
  );

  const revertPR = scoreContribution(
    classify({
      id: "pr-301",
      title: 'Revert "feat: add feature"',
      isRevert: true,
      labels: [],
      changedFiles: ["frontend/src/feature.tsx"],
      additions: 10,
      deletions: 100,
      reviewCount: 1,
    })
  );

  assert(
    revertPR.qualityScore < normalPR.qualityScore,
    `Revert has lower quality (${revertPR.qualityScore} vs ${normalPR.qualityScore})`
  );
  assert(
    revertPR.deliveryScore < normalPR.deliveryScore,
    `Revert has lower delivery (${revertPR.deliveryScore} vs ${normalPR.deliveryScore})`
  );
  assert(
    revertPR.evidence.some((e) => e.includes("Revert")),
    "Revert evidence is noted"
  );
}

// --- Bot exclusion ---

console.log("\n=== Bot Exclusion ===\n");

{
  const botContrib = classify({
    id: "pr-400",
    author: "dependabot[bot]",
    isBot: true,
    title: "chore(deps): bump axios from 1.6.0 to 1.7.0",
    labels: ["dependencies"],
    changedFiles: ["package.json", "yarn.lock"],
    additions: 50,
    deletions: 30,
    reviewCount: 0,
  });

  const humanContrib = classify({
    id: "pr-401",
    author: "realengineer",
    isBot: false,
    title: "feat: add real feature",
    labels: ["feature"],
    changedFiles: ["frontend/src/feature.tsx"],
    additions: 100,
    deletions: 10,
    reviewCount: 2,
  });

  const data = makeClassifiedData(
    [botContrib, humanContrib],
    ["dependabot[bot]"]
  );
  const result = scoreEngineers(data);

  assert(
    !result.engineers.some((e) => e.handle === "dependabot[bot]"),
    "Bot excluded from engineer rankings"
  );
  assert(
    result.engineers.some((e) => e.handle === "realengineer"),
    "Human engineer included in rankings"
  );
}

// --- Review impact ---

console.log("\n=== Review Impact ===\n");

{
  const wellReviewed = scoreContribution(
    classify({
      id: "pr-500",
      title: "feat: add feature with good reviews",
      labels: ["feature"],
      changedFiles: ["frontend/src/feature.tsx"],
      additions: 100,
      deletions: 10,
      reviewCount: 4,
      reviewers: ["a", "b", "c", "d"],
    })
  );

  const noReview = scoreContribution(
    classify({
      id: "pr-501",
      title: "feat: add feature without reviews",
      labels: ["feature"],
      changedFiles: ["frontend/src/feature.tsx"],
      additions: 100,
      deletions: 10,
      reviewCount: 0,
      reviewers: [],
    })
  );

  assert(
    wellReviewed.qualityScore > noReview.qualityScore,
    `Well-reviewed PR has higher quality (${wellReviewed.qualityScore} vs ${noReview.qualityScore})`
  );
}

// --- Product feature with linked issue scores meaningfully ---

console.log("\n=== Product Feature with Linked Issue ===\n");

{
  const productPR = scoreContribution(
    classify({
      id: "pr-600",
      title: "feat(insights): add funnel conversion export",
      labels: ["feature", "product analytics"],
      changedFiles: [
        "frontend/src/scenes/insights/views/Funnels/FunnelExport.tsx",
        "frontend/src/scenes/insights/views/Funnels/FunnelExport.test.ts",
      ],
      additions: 200,
      deletions: 20,
      reviewCount: 3,
      linkedIssueNumbers: [1000],
      milestone: "0.63",
    })
  );

  assert(
    productPR.deliveryScore >= 40,
    `Product PR with linked issue has meaningful delivery (${productPR.deliveryScore})`
  );
  assert(
    productPR.productScore >= 30,
    `Product PR has meaningful product proximity (${productPR.productScore})`
  );
}

// --- Score normalization ---

console.log("\n=== Score Normalization ===\n");

{
  const scored = scoreContribution(
    classify({
      id: "pr-700",
      title: "feat: normal feature",
      labels: ["feature"],
      changedFiles: ["frontend/src/thing.tsx"],
      additions: 100,
      deletions: 10,
      reviewCount: 2,
    })
  );

  assert(
    scored.deliveryScore >= 0 && scored.deliveryScore <= 100,
    `Delivery score in 0-100 range (${scored.deliveryScore})`
  );
  assert(
    scored.productScore >= 0 && scored.productScore <= 100,
    `Product score in 0-100 range (${scored.productScore})`
  );
  assert(
    scored.leverageScore >= 0 && scored.leverageScore <= 100,
    `Leverage score in 0-100 range (${scored.leverageScore})`
  );
  assert(
    scored.qualityScore >= 0 && scored.qualityScore <= 100,
    `Quality score in 0-100 range (${scored.qualityScore})`
  );
}

// ==========================================================
// Phase 5: Confidence and explanation tests
// ==========================================================

console.log("\n=== Confidence Labels ===\n");

{
  // High confidence: many signals
  const contributions = Array.from({ length: 8 }, (_, i) =>
    classify({
      id: `pr-${800 + i}`,
      number: 800 + i,
      author: "prolific-dev",
      title: `feat: feature ${i}`,
      labels: ["feature", "product analytics"],
      changedFiles: [
        `frontend/src/scenes/insights/view${i}.tsx`,
        `posthog/api/endpoint${i}.py`,
      ],
      additions: 100 + i * 20,
      deletions: 10 + i * 5,
      reviewCount: 2,
      linkedIssueNumbers: [900 + i],
      milestone: "0.62",
    })
  );

  const data = makeClassifiedData(contributions);
  const result = scoreEngineers(data);
  const eng = result.engineers.find((e) => e.handle === "prolific-dev");

  assert(eng !== undefined, "Prolific dev found in results");
  assert(
    eng!.confidence === "high",
    `Prolific dev with 8 PRs, linked issues, reviews → high confidence (got ${eng!.confidence})`
  );
  assert(eng!.summary.length > 20, "Summary is non-trivial");
  assert(eng!.topEvidence.length >= 3, "Has >= 3 evidence items");
  assert(
    eng!.topEvidence.every((e) => e.url.startsWith("https://github.com/")),
    "All evidence has GitHub URLs"
  );
}

{
  // Low confidence: single contribution
  const contributions = [
    classify({
      id: "pr-850",
      number: 850,
      author: "one-hit-wonder",
      title: "Update readme",
      labels: [],
      changedFiles: ["README.md"],
      additions: 5,
      deletions: 2,
      reviewCount: 0,
    }),
  ];

  const data = makeClassifiedData(contributions);
  const result = scoreEngineers(data);
  const eng = result.engineers.find((e) => e.handle === "one-hit-wonder");

  assert(eng !== undefined, "One-hit-wonder found in results");
  assert(
    eng!.confidence === "low",
    `Single small contribution → low confidence (got ${eng!.confidence})`
  );
  assert(
    eng!.caveats.some((c) => c.includes("single contribution")),
    "Has caveat about single contribution"
  );
}

{
  // Medium confidence: a few contributions, limited dimensions
  const contributions = Array.from({ length: 3 }, (_, i) =>
    classify({
      id: `pr-${860 + i}`,
      number: 860 + i,
      author: "decent-dev",
      title: `chore: maintenance task ${i}`,
      labels: ["chore"],
      changedFiles: [`posthog/utils/helper${i}.py`],
      additions: 30 + i * 10,
      deletions: 5,
      reviewCount: 1,
      linkedIssueNumbers: [],
    })
  );

  const data = makeClassifiedData(contributions);
  const result = scoreEngineers(data);
  const eng = result.engineers.find((e) => e.handle === "decent-dev");

  assert(eng !== undefined, "Decent dev found in results");
  assert(
    eng!.confidence === "medium" || eng!.confidence === "low",
    `Maintenance-only dev → medium or low confidence (got ${eng!.confidence})`
  );
}

// --- Explanation quality checks ---

console.log("\n=== Explanation Quality ===\n");

{
  const contributions = Array.from({ length: 5 }, (_, i) =>
    classify({
      id: `pr-${900 + i}`,
      number: 900 + i,
      author: "product-person",
      title: `feat: product improvement ${i}`,
      labels: ["feature", "product analytics"],
      changedFiles: [
        `frontend/src/scenes/insights/view${i}.tsx`,
      ],
      additions: 150 + i * 20,
      deletions: 10,
      reviewCount: 2,
      linkedIssueNumbers: [1000 + i],
    })
  );

  const data = makeClassifiedData(contributions);
  const result = scoreEngineers(data);
  const eng = result.engineers.find((e) => e.handle === "product-person");

  assert(eng !== undefined, "Product person found in results");

  // No performance-review language
  const badPhrases = [
    "best engineer",
    "top performer",
    "most talented",
    "performance review",
    "promotion",
    "underperforming",
    "worst",
    "fired",
  ];
  for (const phrase of badPhrases) {
    assert(
      !eng!.summary.toLowerCase().includes(phrase),
      `Summary does not contain "${phrase}"`
    );
  }

  // Has evidence links
  assert(
    eng!.topEvidence.length >= 3,
    "Has at least 3 evidence items"
  );

  // Summary references contributions
  assert(
    eng!.summary.includes("#"),
    "Summary references PR numbers"
  );
}

// --- Engineer-level score is 0-100 ---

console.log("\n=== Engineer Score Range ===\n");

{
  const contributions = Array.from({ length: 20 }, (_, i) =>
    classify({
      id: `pr-${950 + i}`,
      number: 950 + i,
      author: "power-user",
      title: `feat: big feature ${i}`,
      labels: ["feature", "product analytics"],
      changedFiles: Array.from({ length: 10 }, (_, j) => `frontend/src/f${i}_${j}.tsx`),
      additions: 500,
      deletions: 100,
      reviewCount: 3,
      linkedIssueNumbers: [2000 + i],
      milestone: "0.62",
    })
  );

  const data = makeClassifiedData(contributions);
  const result = scoreEngineers(data);
  const eng = result.engineers.find((e) => e.handle === "power-user");

  assert(eng !== undefined, "Power user found");
  assert(
    eng!.totalScore >= 0 && eng!.totalScore <= 100,
    `Total score in 0-100 range (${eng!.totalScore})`
  );
  assert(
    eng!.deliveryScore >= 0 && eng!.deliveryScore <= 100,
    `Delivery in range (${eng!.deliveryScore})`
  );
  assert(
    eng!.productScore >= 0 && eng!.productScore <= 100,
    `Product in range (${eng!.productScore})`
  );
  assert(
    eng!.leverageScore >= 0 && eng!.leverageScore <= 100,
    `Leverage in range (${eng!.leverageScore})`
  );
  assert(
    eng!.qualityScore >= 0 && eng!.qualityScore <= 100,
    `Quality in range (${eng!.qualityScore})`
  );
}

// --- Results ---

console.log(`\n${"=".repeat(40)}`);
console.log(
  `Results: ${passed} passed, ${failed} failed out of ${passed + failed} assertions`
);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("All scoring and confidence tests passed!");
}
