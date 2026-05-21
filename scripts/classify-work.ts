import { readFileSync, writeFileSync, existsSync } from "fs";
import type {
  NormalizedContribution,
  NormalizedData,
  ClassifiedContribution,
  ClassifiedData,
  ClassificationReason,
  WorkType,
  RepoArea,
} from "../src/types";

const NORMALIZED_PATH = "data/normalized.json";
const SAMPLE_PATH = "data/normalized-sample.json";
const OUT_PATH = "data/classified.json";

// --- Label rules ---

const LABEL_WORK_TYPE_RULES: Array<{
  pattern: RegExp;
  workType: WorkType;
  signal: string;
}> = [
  { pattern: /^bug[\s_-]?fix$/i, workType: "Bug Fix", signal: "label" },
  { pattern: /^bug$/i, workType: "Bug Fix", signal: "label" },
  { pattern: /^fix$/i, workType: "Bug Fix", signal: "label" },
  { pattern: /^feature$/i, workType: "Product Feature", signal: "label" },
  { pattern: /^enhancement$/i, workType: "Product Feature", signal: "label" },
  { pattern: /^new[\s_-]?feature$/i, workType: "Product Feature", signal: "label" },
  { pattern: /^performance$/i, workType: "Performance", signal: "label" },
  { pattern: /^security$/i, workType: "Security", signal: "label" },
  { pattern: /^documentation$/i, workType: "Documentation", signal: "label" },
  { pattern: /^docs$/i, workType: "Documentation", signal: "label" },
  { pattern: /^refactor$/i, workType: "Refactor", signal: "label" },
  { pattern: /^migration$/i, workType: "Migration", signal: "label" },
  { pattern: /^maintenance$/i, workType: "Maintenance", signal: "label" },
  { pattern: /^chore$/i, workType: "Maintenance", signal: "label" },
  { pattern: /^experiment$/i, workType: "Experiment", signal: "label" },
  { pattern: /^test/i, workType: "Test Infrastructure", signal: "label" },
  { pattern: /^ci$/i, workType: "CI / Build", signal: "label" },
  { pattern: /^reliability$/i, workType: "Reliability", signal: "label" },
  { pattern: /^devex$/i, workType: "Developer Experience", signal: "label" },
  { pattern: /^developer[\s_-]?experience$/i, workType: "Developer Experience", signal: "label" },
  { pattern: /^dx$/i, workType: "Developer Experience", signal: "label" },
];

const LABEL_REPO_AREA_RULES: Array<{
  pattern: RegExp;
  repoArea: RepoArea;
  signal: string;
}> = [
  { pattern: /^frontend$/i, repoArea: "Frontend", signal: "label" },
  { pattern: /^backend$/i, repoArea: "Backend", signal: "label" },
  { pattern: /^infrastructure$/i, repoArea: "Infrastructure", signal: "label" },
  { pattern: /^infra$/i, repoArea: "Infrastructure", signal: "label" },
  { pattern: /^ci$/i, repoArea: "CI/testing", signal: "label" },
  { pattern: /^docs$/i, repoArea: "Docs", signal: "label" },
  { pattern: /^documentation$/i, repoArea: "Docs", signal: "label" },
  { pattern: /product[\s_-]?analytics/i, repoArea: "Product", signal: "label" },
  { pattern: /^pipeline$/i, repoArea: "Backend", signal: "label" },
  { pattern: /^ingestion$/i, repoArea: "Backend", signal: "label" },
  { pattern: /^session[\s_-]?recording/i, repoArea: "Product", signal: "label" },
  { pattern: /^feature[\s_-]?flags?/i, repoArea: "Product", signal: "label" },
  { pattern: /^experiments?$/i, repoArea: "Product", signal: "label" },
  { pattern: /^surveys?$/i, repoArea: "Product", signal: "label" },
  { pattern: /^web[\s_-]?analytics/i, repoArea: "Product", signal: "label" },
  { pattern: /^data[\s_-]?warehouse/i, repoArea: "Product", signal: "label" },
];

// --- File path rules ---

type FilePathRule = {
  pattern: RegExp;
  workType?: WorkType;
  repoArea?: RepoArea;
  signal: string;
};

const FILE_PATH_RULES: FilePathRule[] = [
  // CI/testing
  { pattern: /^\.github\//, repoArea: "CI/testing", workType: "CI / Build", signal: "file-path" },
  { pattern: /^\.circleci\//, repoArea: "CI/testing", workType: "CI / Build", signal: "file-path" },
  { pattern: /Dockerfile/i, repoArea: "Infrastructure", workType: "CI / Build", signal: "file-path" },
  { pattern: /docker-compose/i, repoArea: "Infrastructure", workType: "CI / Build", signal: "file-path" },

  // Test infrastructure
  { pattern: /cypress\//i, repoArea: "CI/testing", workType: "Test Infrastructure", signal: "file-path" },
  { pattern: /playwright\//i, repoArea: "CI/testing", workType: "Test Infrastructure", signal: "file-path" },
  { pattern: /e2e\//i, repoArea: "CI/testing", workType: "Test Infrastructure", signal: "file-path" },
  { pattern: /\.test\.[jt]sx?$/, workType: "Test Infrastructure", signal: "file-path" },
  { pattern: /\.spec\.[jt]sx?$/, workType: "Test Infrastructure", signal: "file-path" },
  { pattern: /_test\.py$/, workType: "Test Infrastructure", signal: "file-path" },
  { pattern: /test_.*\.py$/, workType: "Test Infrastructure", signal: "file-path" },
  { pattern: /conftest\.py$/, workType: "Test Infrastructure", signal: "file-path" },
  { pattern: /fixtures?\//i, workType: "Test Infrastructure", signal: "file-path" },

  // Docs
  { pattern: /^docs\//, repoArea: "Docs", workType: "Documentation", signal: "file-path" },
  { pattern: /\.mdx?$/, workType: "Documentation", signal: "file-path" },
  { pattern: /CHANGELOG/i, workType: "Documentation", signal: "file-path" },
  { pattern: /README/i, workType: "Documentation", signal: "file-path" },

  // Frontend
  { pattern: /^frontend\//, repoArea: "Frontend", signal: "file-path" },
  { pattern: /\.tsx$/, repoArea: "Frontend", signal: "file-path" },
  { pattern: /\.scss$/, repoArea: "Frontend", signal: "file-path" },
  { pattern: /\.css$/, repoArea: "Frontend", signal: "file-path" },

  // Backend
  { pattern: /^posthog\/api\//, repoArea: "Backend", signal: "file-path" },
  { pattern: /^posthog\/models\//, repoArea: "Backend", signal: "file-path" },
  { pattern: /^posthog\/queries\//, repoArea: "Backend", signal: "file-path" },
  { pattern: /^posthog\/hogql\//, repoArea: "Backend", signal: "file-path" },
  { pattern: /^posthog\/clickhouse\//, repoArea: "Backend", signal: "file-path" },
  { pattern: /^posthog\/batch_exports\//, repoArea: "Backend", signal: "file-path" },
  { pattern: /^posthog\/celery\//, repoArea: "Backend", signal: "file-path" },
  { pattern: /^posthog\/warehouse\//, repoArea: "Backend", signal: "file-path" },
  { pattern: /^ee\//, repoArea: "Backend", signal: "file-path" },
  { pattern: /\.py$/, repoArea: "Backend", signal: "file-path" },

  // Infrastructure
  { pattern: /^infra\//, repoArea: "Infrastructure", signal: "file-path" },
  { pattern: /^deploy\//, repoArea: "Infrastructure", signal: "file-path" },
  { pattern: /^helm\//, repoArea: "Infrastructure", signal: "file-path" },
  { pattern: /^bin\//, repoArea: "Infrastructure", signal: "file-path" },
  { pattern: /requirements.*\.txt$/, repoArea: "Infrastructure", signal: "file-path" },
  { pattern: /package\.json$/, repoArea: "Infrastructure", signal: "file-path" },
  { pattern: /yarn\.lock$/, repoArea: "Infrastructure", signal: "file-path" },
  { pattern: /pnpm-lock\.yaml$/, repoArea: "Infrastructure", signal: "file-path" },

  // Product areas via file paths
  { pattern: /scenes\/insights\//, repoArea: "Product", signal: "file-path" },
  { pattern: /scenes\/dashboard\//, repoArea: "Product", signal: "file-path" },
  { pattern: /scenes\/session-recordings\//, repoArea: "Product", signal: "file-path" },
  { pattern: /scenes\/feature-flags\//, repoArea: "Product", signal: "file-path" },
  { pattern: /scenes\/experiments\//, repoArea: "Product", signal: "file-path" },
  { pattern: /scenes\/surveys\//, repoArea: "Product", signal: "file-path" },
  { pattern: /scenes\/web-analytics\//, repoArea: "Product", signal: "file-path" },
  { pattern: /scenes\/data-warehouse\//, repoArea: "Product", signal: "file-path" },
  { pattern: /scenes\/onboarding\//, repoArea: "Product", signal: "file-path" },
  { pattern: /scenes\/billing\//, repoArea: "Product", signal: "file-path" },
  { pattern: /scenes\/authentication\//, repoArea: "Product", signal: "file-path" },
  { pattern: /scenes\/pipeline\//, repoArea: "Product", signal: "file-path" },
  { pattern: /scenes\/batch_exports\//, repoArea: "Product", signal: "file-path" },

  // Shared libraries (leverage signal)
  { pattern: /^frontend\/src\/lib\//, workType: "Developer Experience", signal: "file-path" },
  { pattern: /^frontend\/src\/queries\//, repoArea: "Product", signal: "file-path" },
  { pattern: /^posthog\/management\//, repoArea: "Infrastructure", signal: "file-path" },

  // Migrations
  { pattern: /migrations\//, workType: "Migration", signal: "file-path" },
];

// --- Title/body keyword rules ---

type KeywordRule = {
  pattern: RegExp;
  workType?: WorkType;
  repoArea?: RepoArea;
  signal: string;
};

const TITLE_KEYWORD_RULES: KeywordRule[] = [
  // Work type from title prefixes (conventional commits)
  { pattern: /^feat[\s(:/]/i, workType: "Product Feature", signal: "title-prefix" },
  { pattern: /^fix[\s(:/]/i, workType: "Bug Fix", signal: "title-prefix" },
  { pattern: /^chore[\s(:/]/i, workType: "Maintenance", signal: "title-prefix" },
  { pattern: /^refactor[\s(:/]/i, workType: "Refactor", signal: "title-prefix" },
  { pattern: /^perf[\s(:/]/i, workType: "Performance", signal: "title-prefix" },
  { pattern: /^docs[\s(:/]/i, workType: "Documentation", signal: "title-prefix" },
  { pattern: /^test[\s(:/]/i, workType: "Test Infrastructure", signal: "title-prefix" },
  { pattern: /^ci[\s(:/]/i, workType: "CI / Build", signal: "title-prefix" },
  { pattern: /^security[\s(:/]/i, workType: "Security", signal: "title-prefix" },
  { pattern: /^revert[\s:]/i, workType: "Bug Fix", signal: "title-prefix" },

  // Product keywords in title
  { pattern: /\bonboarding\b/i, repoArea: "Product", workType: "Product Feature", signal: "title-keyword" },
  { pattern: /\bbilling\b/i, repoArea: "Product", workType: "Product Feature", signal: "title-keyword" },
  { pattern: /\bauth(?:entication)?\b/i, repoArea: "Product", signal: "title-keyword" },
  { pattern: /\binsights?\b/i, repoArea: "Product", signal: "title-keyword" },
  { pattern: /\bretention\b/i, repoArea: "Product", signal: "title-keyword" },
  { pattern: /\bfunnels?\b/i, repoArea: "Product", signal: "title-keyword" },
  { pattern: /\btrends?\b/i, repoArea: "Product", signal: "title-keyword" },
  { pattern: /\bdashboard\b/i, repoArea: "Product", signal: "title-keyword" },
  { pattern: /\bsession[\s_-]?record/i, repoArea: "Product", signal: "title-keyword" },
  { pattern: /\bfeature[\s_-]?flag/i, repoArea: "Product", signal: "title-keyword" },
  { pattern: /\bexperiment/i, repoArea: "Product", workType: "Experiment", signal: "title-keyword" },
  { pattern: /\bsurvey/i, repoArea: "Product", signal: "title-keyword" },
  { pattern: /\bweb[\s_-]?analytics/i, repoArea: "Product", signal: "title-keyword" },
  { pattern: /\bdata[\s_-]?warehouse/i, repoArea: "Product", signal: "title-keyword" },

  // Infrastructure/DevEx keywords
  { pattern: /\bmigrat/i, workType: "Migration", signal: "title-keyword" },
  { pattern: /\bflaky\b/i, workType: "Test Infrastructure", repoArea: "CI/testing", signal: "title-keyword" },
  { pattern: /\bci\b/i, workType: "CI / Build", repoArea: "CI/testing", signal: "title-keyword" },
  { pattern: /\bbuild\b/i, workType: "CI / Build", signal: "title-keyword" },
  { pattern: /\bperformance\b/i, workType: "Performance", signal: "title-keyword" },
  { pattern: /\bspeed\s*up\b/i, workType: "Performance", signal: "title-keyword" },
  { pattern: /\boptimiz/i, workType: "Performance", signal: "title-keyword" },
  { pattern: /\brefactor/i, workType: "Refactor", signal: "title-keyword" },
  { pattern: /\bdeprecate/i, workType: "Maintenance", signal: "title-keyword" },
  { pattern: /\bremove\s+(unused|dead|old|legacy)/i, workType: "Maintenance", signal: "title-keyword" },
  { pattern: /\bcleanup\b/i, workType: "Maintenance", signal: "title-keyword" },
  { pattern: /\bclean\s+up\b/i, workType: "Maintenance", signal: "title-keyword" },
  { pattern: /\breliability\b/i, workType: "Reliability", signal: "title-keyword" },
  { pattern: /\bstabilit/i, workType: "Reliability", signal: "title-keyword" },
  { pattern: /\be2e\b/i, workType: "Test Infrastructure", repoArea: "CI/testing", signal: "title-keyword" },
  { pattern: /\bplaywright\b/i, workType: "Test Infrastructure", repoArea: "CI/testing", signal: "title-keyword" },
  { pattern: /\bcypress\b/i, workType: "Test Infrastructure", repoArea: "CI/testing", signal: "title-keyword" },
];

const BODY_KEYWORD_RULES: KeywordRule[] = [
  { pattern: /\bcustomer[\s-]?facing\b/i, repoArea: "Product", signal: "body-keyword" },
  { pattern: /\buser[\s-]?facing\b/i, repoArea: "Product", signal: "body-keyword" },
  { pattern: /\bcustomer\s+request/i, repoArea: "Product", signal: "body-keyword" },
  { pattern: /\bsupport\s+ticket/i, repoArea: "Product", signal: "body-keyword" },
  { pattern: /\bbreaking\s+change/i, workType: "Migration", signal: "body-keyword" },
  { pattern: /\bbackward[\s-]?compat/i, workType: "Migration", signal: "body-keyword" },
  { pattern: /\bsecurity\s+(fix|patch|vuln|issue)/i, workType: "Security", signal: "body-keyword" },
];

// --- Classification engine ---

export function classifyContribution(
  c: NormalizedContribution
): ClassifiedContribution {
  const workTypes = new Set<WorkType>();
  const repoAreas = new Set<RepoArea>();
  const reasons: ClassificationReason[] = [];

  // 1. Label-based classification
  for (const label of c.labels) {
    const safeLabel = String(label);
    for (const rule of LABEL_WORK_TYPE_RULES) {
      if (rule.pattern.test(safeLabel)) {
        workTypes.add(rule.workType);
        reasons.push({
          rule: `label → ${rule.workType}`,
          signal: rule.signal,
          matched: safeLabel,
        });
      }
    }
    for (const rule of LABEL_REPO_AREA_RULES) {
      if (rule.pattern.test(safeLabel)) {
        repoAreas.add(rule.repoArea);
        reasons.push({
          rule: `label → ${rule.repoArea}`,
          signal: rule.signal,
          matched: safeLabel,
        });
      }
    }
  }

  // 2. File path classification (majority vote for repo area)
  const fileAreaCounts = new Map<RepoArea, number>();
  const fileWorkCounts = new Map<WorkType, number>();
  for (const file of c.changedFiles) {
    const safeFile = String(file);
    for (const rule of FILE_PATH_RULES) {
      if (rule.pattern.test(safeFile)) {
        if (rule.repoArea) {
          fileAreaCounts.set(
            rule.repoArea,
            (fileAreaCounts.get(rule.repoArea) ?? 0) + 1
          );
        }
        if (rule.workType) {
          fileWorkCounts.set(
            rule.workType,
            (fileWorkCounts.get(rule.workType) ?? 0) + 1
          );
        }
      }
    }
  }

  // Add top file-path area signals
  for (const [area, count] of fileAreaCounts) {
    repoAreas.add(area);
    reasons.push({
      rule: `file-path → ${area}`,
      signal: "file-path",
      matched: `${count} file(s) matched`,
    });
  }
  for (const [wt, count] of fileWorkCounts) {
    workTypes.add(wt);
    reasons.push({
      rule: `file-path → ${wt}`,
      signal: "file-path",
      matched: `${count} file(s) matched`,
    });
  }

  // 3. Title keyword classification
  const safeTitle = String(c.title);
  for (const rule of TITLE_KEYWORD_RULES) {
    if (rule.pattern.test(safeTitle)) {
      if (rule.workType) {
        workTypes.add(rule.workType);
        reasons.push({
          rule: `title → ${rule.workType}`,
          signal: rule.signal,
          matched: safeTitle.slice(0, 80),
        });
      }
      if (rule.repoArea) {
        repoAreas.add(rule.repoArea);
        reasons.push({
          rule: `title → ${rule.repoArea}`,
          signal: rule.signal,
          matched: safeTitle.slice(0, 80),
        });
      }
    }
  }

  // 4. Body keyword classification
  const safeBody = String(c.body);
  for (const rule of BODY_KEYWORD_RULES) {
    if (rule.pattern.test(safeBody)) {
      if (rule.workType) {
        workTypes.add(rule.workType);
        reasons.push({
          rule: `body → ${rule.workType}`,
          signal: rule.signal,
          matched: rule.pattern.source,
        });
      }
      if (rule.repoArea) {
        repoAreas.add(rule.repoArea);
        reasons.push({
          rule: `body → ${rule.repoArea}`,
          signal: rule.signal,
          matched: rule.pattern.source,
        });
      }
    }
  }

  // 5. Milestone signal
  if (c.milestone) {
    reasons.push({
      rule: "milestone → Delivery signal",
      signal: "milestone",
      matched: String(c.milestone),
    });
  }

  // 6. Linked issue signal (issues closed = delivery)
  if (c.linkedIssueNumbers.length > 0) {
    reasons.push({
      rule: "linked-issues → Delivery signal",
      signal: "linked-issues",
      matched: `closes ${c.linkedIssueNumbers.length} issue(s)`,
    });
  }

  // 7. Revert signal
  if (c.isRevert) {
    workTypes.add("Bug Fix");
    reasons.push({
      rule: "revert → Bug Fix",
      signal: "revert-detection",
      matched: "title starts with Revert",
    });
  }

  // 8. Defaults if nothing matched
  if (workTypes.size === 0) {
    workTypes.add("Maintenance");
    reasons.push({
      rule: "default → Maintenance",
      signal: "fallback",
      matched: "no other work type matched",
    });
  }
  if (repoAreas.size === 0) {
    repoAreas.add("Other");
    reasons.push({
      rule: "default → Other",
      signal: "fallback",
      matched: "no repo area matched",
    });
  }

  const workTypesArr = [...workTypes];
  const repoAreasArr = [...repoAreas];

  return {
    ...c,
    workTypes: workTypesArr,
    repoAreas: repoAreasArr,
    classificationReasons: reasons,
    primaryWorkType: pickPrimary(workTypesArr),
    primaryRepoArea: pickPrimaryArea(repoAreasArr),
  };
}

const WORK_TYPE_PRIORITY: WorkType[] = [
  "Product Feature",
  "Bug Fix",
  "Reliability",
  "Security",
  "Performance",
  "Experiment",
  "Developer Experience",
  "Test Infrastructure",
  "CI / Build",
  "Migration",
  "Refactor",
  "Documentation",
  "Maintenance",
];

function pickPrimary(types: WorkType[]): WorkType {
  for (const wt of WORK_TYPE_PRIORITY) {
    if (types.includes(wt)) return wt;
  }
  return types[0];
}

const AREA_PRIORITY: RepoArea[] = [
  "Product",
  "Frontend",
  "Backend",
  "Infrastructure",
  "CI/testing",
  "Docs",
  "Other",
];

function pickPrimaryArea(areas: RepoArea[]): RepoArea {
  for (const a of AREA_PRIORITY) {
    if (areas.includes(a)) return a;
  }
  return areas[0];
}

export function classifyAll(data: NormalizedData): ClassifiedData {
  const contributions = data.contributions.map(classifyContribution);
  return {
    classifiedAt: new Date().toISOString(),
    sourceDate: data.sourceDate,
    days: data.days,
    contributions,
    uniqueEngineers: data.uniqueEngineers,
    botAccounts: data.botAccounts,
  };
}

function main() {
  const inputPath = existsSync(NORMALIZED_PATH)
    ? NORMALIZED_PATH
    : SAMPLE_PATH;

  if (!existsSync(inputPath)) {
    console.error(
      `Error: Neither ${NORMALIZED_PATH} nor ${SAMPLE_PATH} found.`
    );
    process.exit(1);
  }

  console.log(`Reading from ${inputPath}...`);
  const data: NormalizedData = JSON.parse(readFileSync(inputPath, "utf-8"));
  const classified = classifyAll(data);

  writeFileSync(OUT_PATH, JSON.stringify(classified, null, 2));

  // Report
  const reasonCounts = new Map<string, number>();
  const workTypeCounts = new Map<string, number>();
  const areaCounts = new Map<string, number>();

  for (const c of classified.contributions) {
    for (const wt of c.workTypes) {
      workTypeCounts.set(wt, (workTypeCounts.get(wt) ?? 0) + 1);
    }
    for (const a of c.repoAreas) {
      areaCounts.set(a, (areaCounts.get(a) ?? 0) + 1);
    }
    for (const r of c.classificationReasons) {
      reasonCounts.set(r.rule, (reasonCounts.get(r.rule) ?? 0) + 1);
    }
  }

  console.log("\n=== Classification Summary ===");
  console.log(`Total classified: ${classified.contributions.length}`);

  console.log("\nWork Types:");
  for (const [wt, count] of [...workTypeCounts.entries()].sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${wt}: ${count}`);
  }

  console.log("\nRepo Areas:");
  for (const [area, count] of [...areaCounts.entries()].sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${area}: ${count}`);
  }

  console.log("\nTop Classification Reasons:");
  const topReasons = [...reasonCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  for (const [reason, count] of topReasons) {
    console.log(`  ${reason}: ${count}`);
  }

  // Spot-check: print first 20 contributions with their classification
  const spotCheckCount = Math.min(20, classified.contributions.length);
  console.log(`\n=== Spot-Check (first ${spotCheckCount}) ===`);
  for (let i = 0; i < spotCheckCount; i++) {
    const c = classified.contributions[i];
    console.log(
      `\n[${i + 1}] ${c.id} — "${String(c.title).slice(0, 60)}"`
    );
    console.log(`  Author: ${String(c.author)}`);
    console.log(`  Work types: ${c.workTypes.join(", ")}`);
    console.log(`  Repo areas: ${c.repoAreas.join(", ")}`);
    console.log(`  Primary: ${c.primaryWorkType} / ${c.primaryRepoArea}`);
    console.log(
      `  Reasons: ${c.classificationReasons
        .map((r) => `${r.rule} [${String(r.matched).slice(0, 40)}]`)
        .join("; ")}`
    );
  }

  console.log(`\nOutput written to ${OUT_PATH}`);
}

main();
