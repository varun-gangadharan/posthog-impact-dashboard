export type Confidence = "high" | "medium" | "low";

export type WorkType =
  | "Product Feature"
  | "Bug Fix"
  | "Reliability"
  | "Developer Experience"
  | "Test Infrastructure"
  | "CI / Build"
  | "Migration"
  | "Refactor"
  | "Documentation"
  | "Experiment"
  | "Maintenance"
  | "Security"
  | "Performance";

export type RepoArea =
  | "Product"
  | "Frontend"
  | "Backend"
  | "Infrastructure"
  | "CI/testing"
  | "Docs"
  | "Other";

export type ContributionScore = {
  id: string;
  number: number;
  url: string;
  title: string;
  author: string;
  date: string;
  type: WorkType;
  repoArea: RepoArea;
  deliveryScore: number;
  productScore: number;
  leverageScore: number;
  qualityScore: number;
  confidence: Confidence;
  evidence: string[];
};

export type EngineerScore = {
  handle: string;
  totalScore: number;
  deliveryScore: number;
  productScore: number;
  leverageScore: number;
  qualityScore: number;
  confidence: Confidence;
  primaryImpactType: string;
  summary: string;
  caveats: string[];
  topEvidence: ContributionScore[];
};

export type DashboardData = {
  generatedAt: string;
  timeWindowDays: number;
  engineers: EngineerScore[];
};

// --- Normalized data types (Phase 2) ---

export type NormalizedContribution = {
  id: string;
  number: number;
  type: "pull_request" | "issue";
  title: string;
  body: string;
  url: string;
  author: string;
  isBot: boolean;
  createdAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  labels: string[];
  milestone: string | null;
  changedFiles: string[];
  additions: number;
  deletions: number;
  reviewCount: number;
  reviewers: string[];
  linkedIssueNumbers: number[];
  isRevert: boolean;
};

export type NormalizedData = {
  normalizedAt: string;
  sourceDate: string;
  days: number;
  contributions: NormalizedContribution[];
  uniqueEngineers: string[];
  botAccounts: string[];
};

// --- Classified data types (Phase 3) ---

export type ClassificationReason = {
  rule: string;
  signal: string;
  matched: string;
};

export type ClassifiedContribution = NormalizedContribution & {
  workTypes: WorkType[];
  repoAreas: RepoArea[];
  classificationReasons: ClassificationReason[];
  primaryWorkType: WorkType;
  primaryRepoArea: RepoArea;
};

export type ClassifiedData = {
  classifiedAt: string;
  sourceDate: string;
  days: number;
  contributions: ClassifiedContribution[];
  uniqueEngineers: string[];
  botAccounts: string[];
};
