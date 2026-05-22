import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from "fs";
import type {
  ClassifiedContribution,
  ClassifiedData,
  ContributionScore,
  EngineerScore,
  DashboardData,
  Confidence,
  WorkType,
  RepoArea,
} from "../src/types";

const CLASSIFIED_PATH = "data/classified.json";
const OUT_PATH = "data/scored-engineers.json";
const PUBLIC_PATH = "public/data/scored-engineers.json";

// --- Scoring constants ---

const WEIGHTS = {
  delivery: 0.35,
  product: 0.25,
  leverage: 0.25,
  quality: 0.15,
} as const;

const LARGE_PR_CAP_ADDITIONS = 1500;
const LARGE_PR_CAP_FACTOR = 0.6;
const REVIEW_IMPACT_FACTOR = 0.3;
const REVERT_QUALITY_PENALTY = 0.5;
const MAX_CONTRIBUTIONS_FOR_SCORE = 50;
const TOP_EVIDENCE_COUNT = 10;

// Work types that count as product-proximate
const PRODUCT_WORK_TYPES: Set<WorkType> = new Set([
  "Product Feature",
  "Bug Fix",
  "Experiment",
]);

// Work types that count as leverage
const LEVERAGE_WORK_TYPES: Set<WorkType> = new Set([
  "Developer Experience",
  "Test Infrastructure",
  "CI / Build",
  "Migration",
  "Reliability",
  "Performance",
]);

// Repo areas that count as product-proximate
const PRODUCT_AREAS: Set<RepoArea> = new Set(["Product", "Frontend"]);

// Repo areas that count as leverage
const LEVERAGE_AREAS: Set<RepoArea> = new Set([
  "Infrastructure",
  "CI/testing",
]);

// --- Contribution-level scoring ---

export function scoreContribution(c: ClassifiedContribution): ContributionScore {
  const evidence: string[] = [];
  let deliveryRaw = 0;
  let productRaw = 0;
  let leverageRaw = 0;
  let qualityRaw = 0;

  const totalChanges = c.additions + c.deletions;
  const isLargePR = totalChanges > LARGE_PR_CAP_ADDITIONS;

  // Size factor: diminishing returns on large PRs
  const sizeFactor = isLargePR ? LARGE_PR_CAP_FACTOR : Math.min(1, totalChanges / 500);

  // --- Delivery Impact ---

  if (c.type === "pull_request" && c.mergedAt) {
    deliveryRaw += 30;
    evidence.push("Merged PR");
  }

  if (c.linkedIssueNumbers.length > 0) {
    deliveryRaw += 15 * Math.min(c.linkedIssueNumbers.length, 3);
    evidence.push(`Closes ${c.linkedIssueNumbers.length} issue(s)`);
  }

  if (c.milestone) {
    deliveryRaw += 10;
    evidence.push(`On milestone ${String(c.milestone)}`);
  }

  // Scope signal from file count (capped)
  const fileCount = c.changedFiles.length;
  if (fileCount >= 3 && fileCount <= 20) {
    deliveryRaw += 10;
    evidence.push(`Meaningful scope: ${fileCount} files`);
  } else if (fileCount > 20) {
    deliveryRaw += 5;
    evidence.push(`Wide scope: ${fileCount} files (capped)`);
  }

  // Size contribution (capped for large PRs)
  if (totalChanges > 20) {
    deliveryRaw += Math.round(15 * sizeFactor);
    if (isLargePR) {
      evidence.push(
        `Large PR (${totalChanges} lines) — delivery contribution capped`
      );
    } else {
      evidence.push(`${totalChanges} lines changed`);
    }
  } else if (totalChanges === 0 && c.type === "pull_request" && c.mergedAt) {
    deliveryRaw += 8;
    evidence.push("Merged PR (size data unavailable)");
  }

  // Issues get less delivery score (they represent requests, not shipped work)
  if (c.type === "issue") {
    deliveryRaw = Math.round(deliveryRaw * 0.3);
    evidence.push("Issue (not shipped code — reduced delivery weight)");
  }

  // --- Product Proximity ---

  if (PRODUCT_WORK_TYPES.has(c.primaryWorkType)) {
    productRaw += 30;
    evidence.push(`Product work type: ${c.primaryWorkType}`);
  }

  if (PRODUCT_AREAS.has(c.primaryRepoArea)) {
    productRaw += 25;
    evidence.push(`Product area: ${c.primaryRepoArea}`);
  }

  // Additional product signals from secondary tags
  for (const wt of c.workTypes) {
    if (PRODUCT_WORK_TYPES.has(wt) && wt !== c.primaryWorkType) {
      productRaw += 5;
    }
  }
  for (const a of c.repoAreas) {
    if (PRODUCT_AREAS.has(a) && a !== c.primaryRepoArea) {
      productRaw += 5;
    }
  }

  // Bug fix in product area is high product proximity
  if (c.primaryWorkType === "Bug Fix" && PRODUCT_AREAS.has(c.primaryRepoArea)) {
    productRaw += 10;
    evidence.push("Bug fix in product area");
  }

  // --- Leverage ---

  if (LEVERAGE_WORK_TYPES.has(c.primaryWorkType)) {
    leverageRaw += 30;
    evidence.push(`Leverage work type: ${c.primaryWorkType}`);
  }

  if (LEVERAGE_AREAS.has(c.primaryRepoArea)) {
    leverageRaw += 25;
    evidence.push(`Leverage area: ${c.primaryRepoArea}`);
  }

  // Shared library signal
  const hasSharedLib = c.changedFiles.some(
    (f) =>
      /^frontend\/src\/lib\//.test(f) ||
      /^posthog\/management\//.test(f) ||
      /^ee\/clickhouse\//.test(f)
  );
  if (hasSharedLib) {
    leverageRaw += 15;
    evidence.push("Touches shared library/platform code");
  }

  // Multi-area contribution
  if (c.repoAreas.length >= 3) {
    leverageRaw += 10;
    evidence.push(`Cross-cutting: spans ${c.repoAreas.length} areas`);
  }

  // Secondary leverage tags
  for (const wt of c.workTypes) {
    if (LEVERAGE_WORK_TYPES.has(wt) && wt !== c.primaryWorkType) {
      leverageRaw += 5;
    }
  }

  // --- Execution Quality ---

  // Base quality for any merged work
  if (c.type === "pull_request" && c.mergedAt) {
    qualityRaw += 20;
  }

  // Reviews received signal
  if (c.reviewCount >= 2) {
    qualityRaw += 15;
    evidence.push(`${c.reviewCount} reviews received`);
  } else if (c.reviewCount === 1) {
    qualityRaw += 10;
  }

  // Revert penalty
  if (c.isRevert) {
    qualityRaw -= Math.round(qualityRaw * REVERT_QUALITY_PENALTY);
    deliveryRaw = Math.round(deliveryRaw * 0.5);
    evidence.push("Revert detected — quality and delivery penalized");
  }

  // Reasonable scope (not too tiny, not too huge)
  if (totalChanges >= 10 && totalChanges <= 800) {
    qualityRaw += 10;
  } else if (totalChanges === 0 && c.type === "pull_request" && c.mergedAt) {
    qualityRaw += 5;
  }

  // Normalize each dimension to 0-100
  const deliveryScore = clamp(deliveryRaw, 0, 100);
  const productScore = clamp(productRaw, 0, 100);
  const leverageScore = clamp(leverageRaw, 0, 100);
  const qualityScore = clamp(qualityRaw, 0, 100);

  const confidence = scoreContributionConfidence(c, evidence);

  return {
    id: c.id,
    number: c.number,
    url: c.url,
    title: String(c.title).slice(0, 200),
    author: String(c.author),
    date: c.mergedAt ?? c.closedAt ?? c.createdAt,
    type: c.primaryWorkType,
    repoArea: c.primaryRepoArea,
    deliveryScore,
    productScore,
    leverageScore,
    qualityScore,
    confidence,
    evidence,
  };
}

function scoreContributionConfidence(
  c: ClassifiedContribution,
  evidence: string[]
): Confidence {
  let signals = 0;
  if (c.type === "pull_request" && c.mergedAt) signals++;
  if (c.linkedIssueNumbers.length > 0) signals++;
  if (c.reviewCount > 0) signals++;
  if (c.changedFiles.length > 0) signals++;
  if (c.labels.length > 0) signals++;
  if (c.classificationReasons.length > 2) signals++;

  if (signals >= 4) return "high";
  if (signals >= 2) return "medium";
  return "low";
}

// --- Engineer-level aggregation ---

export function scoreEngineers(
  data: ClassifiedData
): DashboardData {
  // Filter out bots
  const botSet = new Set(data.botAccounts.map((b) => b.toLowerCase()));
  const humanContributions = data.contributions.filter(
    (c) => !c.isBot && !botSet.has(String(c.author).toLowerCase())
  );

  // Score all contributions
  const scoredContributions = humanContributions.map(scoreContribution);

  // Group by engineer
  const byEngineer = new Map<string, ContributionScore[]>();
  for (const sc of scoredContributions) {
    const handle = sc.author;
    if (!byEngineer.has(handle)) {
      byEngineer.set(handle, []);
    }
    byEngineer.get(handle)!.push(sc);
  }

  // Aggregate per engineer
  const engineerScores: EngineerScore[] = [];

  for (const [handle, contributions] of byEngineer) {
    // Sort by weighted total, take top N for scoring (prevents volume gaming)
    const sorted = contributions
      .map((c) => ({
        ...c,
        weighted:
          c.deliveryScore * WEIGHTS.delivery +
          c.productScore * WEIGHTS.product +
          c.leverageScore * WEIGHTS.leverage +
          c.qualityScore * WEIGHTS.quality,
      }))
      .sort((a, b) => b.weighted - a.weighted);

    const topContributions = sorted.slice(0, MAX_CONTRIBUTIONS_FOR_SCORE);

    // Weighted average across top contributions (with diminishing returns)
    let totalDelivery = 0;
    let totalProduct = 0;
    let totalLeverage = 0;
    let totalQuality = 0;
    let weightSum = 0;

    for (let i = 0; i < topContributions.length; i++) {
      // Diminishing weight: 1st contribution counts full, subsequent decay
      const positionWeight = 1 / (1 + i * 0.15);
      const c = topContributions[i];
      totalDelivery += c.deliveryScore * positionWeight;
      totalProduct += c.productScore * positionWeight;
      totalLeverage += c.leverageScore * positionWeight;
      totalQuality += c.qualityScore * positionWeight;
      weightSum += positionWeight;
    }

    if (weightSum === 0) continue;

    const avgDelivery = totalDelivery / weightSum;
    const avgProduct = totalProduct / weightSum;
    const avgLeverage = totalLeverage / weightSum;
    const avgQuality = totalQuality / weightSum;

    // Breadth bonus: having more quality contributions is a secondary signal
    const breadthBonus = Math.min(20, Math.log2(topContributions.length + 1) * 5);

    const rawTotal =
      avgDelivery * WEIGHTS.delivery +
      avgProduct * WEIGHTS.product +
      avgLeverage * WEIGHTS.leverage +
      avgQuality * WEIGHTS.quality +
      breadthBonus;

    const totalScore = clamp(Math.round(rawTotal), 0, 100);

    // Determine primary impact type
    const impactScores: Array<[string, number]> = [
      ["Delivery", avgDelivery],
      ["Product", avgProduct],
      ["Leverage", avgLeverage],
      ["Quality", avgQuality],
    ];
    impactScores.sort((a, b) => b[1] - a[1]);
    const primaryImpactType = impactScores[0][0];

    // Top evidence (highest weighted contributions)
    const topEvidence = topContributions
      .slice(0, TOP_EVIDENCE_COUNT)
      .map(({ weighted: _w, ...rest }) => rest);

    // Confidence and explanation (Phase 5 integration)
    const { confidence, summary, caveats } = generateExplanation(
      handle,
      totalScore,
      { delivery: avgDelivery, product: avgProduct, leverage: avgLeverage, quality: avgQuality },
      topContributions.length,
      contributions.length,
      topEvidence,
      primaryImpactType
    );

    engineerScores.push({
      handle: String(handle),
      totalScore,
      deliveryScore: Math.round(avgDelivery),
      productScore: Math.round(avgProduct),
      leverageScore: Math.round(avgLeverage),
      qualityScore: Math.round(avgQuality),
      confidence,
      primaryImpactType,
      summary,
      caveats,
      topEvidence,
    });
  }

  // Sort by total score, descending
  engineerScores.sort((a, b) => b.totalScore - a.totalScore);

  return {
    generatedAt: new Date().toISOString(),
    timeWindowDays: data.days,
    engineers: engineerScores,
  };
}

// --- Phase 5: Confidence labels and explanation generation ---

function generateExplanation(
  handle: string,
  totalScore: number,
  dimensions: { delivery: number; product: number; leverage: number; quality: number },
  scoredCount: number,
  totalCount: number,
  topEvidence: ContributionScore[],
  primaryImpactType: string
): { confidence: Confidence; summary: string; caveats: string[] } {
  const caveats: string[] = [];

  // --- Confidence determination ---
  let confidenceSignals = 0;

  // Multiple meaningful evidence items
  if (topEvidence.length >= 3) confidenceSignals++;
  if (topEvidence.length >= 5) confidenceSignals++;

  // Multiple dimensions have signal
  const activeDimensions = [
    dimensions.delivery,
    dimensions.product,
    dimensions.leverage,
    dimensions.quality,
  ].filter((d) => d > 15).length;
  if (activeDimensions >= 3) confidenceSignals++;
  if (activeDimensions >= 2) confidenceSignals++;

  // Volume of scored contributions
  if (scoredCount >= 5) confidenceSignals++;
  if (scoredCount >= 10) confidenceSignals++;

  // No major contradictions
  const hasReverts = topEvidence.some((e) =>
    e.evidence.some((ev) => ev.includes("Revert"))
  );
  if (hasReverts) {
    confidenceSignals--;
    caveats.push(
      "Some contributions are reverts, which may indicate rework."
    );
  }

  // Score driven by single PR
  if (scoredCount === 1) {
    confidenceSignals -= 2;
    caveats.push(
      "Ranking based on a single contribution — limited evidence."
    );
  }

  let confidence: Confidence;
  if (confidenceSignals >= 4) {
    confidence = "high";
  } else if (confidenceSignals >= 2) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  // --- Caveats for non-high confidence ---
  if (confidence === "medium") {
    if (activeDimensions < 3) {
      caveats.push(
        "Impact concentrated in fewer scoring dimensions — broader evidence would increase confidence."
      );
    }
  }
  if (confidence === "low") {
    if (scoredCount < 3) {
      caveats.push(
        "Sparse data for this engineer — score may not be representative."
      );
    }
    if (topEvidence.length < 2) {
      caveats.push(
        "Very few evidence items available."
      );
    }
  }

  // General caveat
  caveats.push(
    "Based on public GitHub activity only. Does not reflect mentoring, design discussions, incident response, planning, or private work."
  );

  // --- Summary generation ---
  const topDimension = primaryImpactType;
  const evidenceSample = topEvidence
    .slice(0, 3)
    .map((e) => `#${e.number}`)
    .join(", ");

  const dimensionDescriptions: Record<string, string> = {
    Delivery: "shipped meaningful work consistently",
    Product: "focused on customer-facing and product areas",
    Leverage: "invested in infrastructure, tooling, and shared capabilities",
    Quality: "maintained high execution quality with thorough reviews",
  };

  const dimDesc =
    dimensionDescriptions[topDimension] ?? "contributed across multiple areas";

  let summary: string;
  if (totalCount === 1) {
    summary = `${String(handle)} had one notable contribution (${evidenceSample}) in this period. ${capitalize(dimDesc)}.`;
  } else {
    summary = `${String(handle)} ${dimDesc} across ${totalCount} contribution${totalCount > 1 ? "s" : ""}. Key work includes ${evidenceSample}.`;
  }

  if (confidence !== "high") {
    summary += ` Confidence is ${confidence} due to limited evidence breadth.`;
  }

  return { confidence, summary, caveats };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// --- Main ---

function main() {
  if (!existsSync(CLASSIFIED_PATH)) {
    console.error(
      `Error: ${CLASSIFIED_PATH} not found. Run classify:data first.`
    );
    process.exit(1);
  }

  console.log("Reading classified data...");
  const data: ClassifiedData = JSON.parse(
    readFileSync(CLASSIFIED_PATH, "utf-8")
  );

  console.log("Scoring engineers...");
  const result = scoreEngineers(data);

  writeFileSync(OUT_PATH, JSON.stringify(result, null, 2));

  // Copy to public
  mkdirSync("public/data", { recursive: true });
  copyFileSync(OUT_PATH, PUBLIC_PATH);

  // Report
  console.log("\n=== Scoring Summary ===");
  console.log(`Engineers scored: ${result.engineers.length}`);
  console.log(`Time window: ${result.timeWindowDays} days`);

  console.log("\nTop 10 Engineers:");
  const top10 = result.engineers.slice(0, 10);
  for (let i = 0; i < top10.length; i++) {
    const e = top10[i];
    console.log(
      `  ${i + 1}. ${String(e.handle)} — Score: ${e.totalScore} (${e.confidence} confidence)`
    );
    console.log(
      `     D:${e.deliveryScore} P:${e.productScore} L:${e.leverageScore} Q:${e.qualityScore} | ${e.primaryImpactType}`
    );
    console.log(`     ${e.summary}`);
    if (e.caveats.length > 0) {
      console.log(
        `     Caveats: ${e.caveats.filter((c) => !c.includes("public GitHub")).join("; ")}`
      );
    }
  }

  // Confidence distribution
  const confDist = { high: 0, medium: 0, low: 0 };
  for (const e of result.engineers) {
    confDist[e.confidence]++;
  }
  console.log(
    `\nConfidence: ${confDist.high} high, ${confDist.medium} medium, ${confDist.low} low`
  );

  // Validate: check no explanation overclaims
  for (const e of result.engineers) {
    const badPhrases = [
      "best engineer",
      "top performer",
      "most talented",
      "performance review",
      "promotion",
      "underperforming",
    ];
    for (const phrase of badPhrases) {
      if (e.summary.toLowerCase().includes(phrase)) {
        console.error(
          `WARNING: Engineer ${String(e.handle)} summary contains prohibited phrase "${phrase}"`
        );
      }
    }
  }

  // Validate: all top evidence has URLs
  for (const e of result.engineers.slice(0, 5)) {
    for (const ev of e.topEvidence) {
      if (!ev.url || !ev.url.startsWith("https://github.com/")) {
        console.error(
          `WARNING: Evidence ${ev.id} for ${String(e.handle)} missing valid GitHub URL`
        );
      }
    }
  }

  console.log(`\nScored data written to ${OUT_PATH}`);
  console.log(`Public copy written to ${PUBLIC_PATH}`);
}

main();
