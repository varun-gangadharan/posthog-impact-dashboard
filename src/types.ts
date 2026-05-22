export type Confidence = "low" | "medium" | "high" | string;

export type ContributionScore = {
  id: string;
  number: number;
  url: string;
  title: string;
  author: string;
  date: string;
  type: string;
  repoArea: string;
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
