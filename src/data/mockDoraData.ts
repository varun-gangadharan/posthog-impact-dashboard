function generateDays(n: number, baseDateStr: string = "2026-05-21"): string[] {
  const base = new Date(baseDateStr);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().split("T")[0];
  });
}

function jitter(base: number, variance: number): number {
  return Math.max(0, +(base + (Math.random() - 0.5) * 2 * variance).toFixed(1));
}

const days30 = generateDays(30);

export const deploymentFrequencyData = days30.map((date, i) => ({
  date,
  deploys: Math.round(3.5 + Math.sin(i * 0.4) * 1.8 + (Math.random() - 0.3) * 2),
  failures: Math.random() < 0.12 ? 1 : 0,
}));

export const leadTimeData = days30.map((date) => ({
  date,
  hours: jitter(2.4, 1.2),
}));

export const cfrData = days30.map((date) => ({
  date,
  rate: jitter(3.2, 2.0),
}));

export const mttrData = days30.map((date) => ({
  date,
  minutes: jitter(45, 20),
}));

export const doraMetrics = {
  deploymentFrequency: {
    value: 4.2,
    unit: "deploys/day",
    trend: +12.3,
    status: "elite" as const,
    sparkline: deploymentFrequencyData.map((d) => d.deploys),
  },
  leadTime: {
    value: 2.4,
    unit: "hours",
    trend: -18.1,
    status: "elite" as const,
    sparkline: leadTimeData.map((d) => d.hours),
  },
  changeFailureRate: {
    value: 3.2,
    unit: "%",
    trend: -0.8,
    status: "elite" as const,
    sparkline: cfrData.map((d) => d.rate),
  },
  mttr: {
    value: 45,
    unit: "min",
    trend: -22.4,
    status: "elite" as const,
    sparkline: mttrData.map((d) => d.minutes),
  },
};

export type DoraStatus = "elite" | "high" | "medium" | "low";

export const leadTimeByTeam = [
  { team: "Pipeline", p50: 1.2, p75: 2.8, p95: 6.1 },
  { team: "Product Analytics", p50: 2.1, p75: 4.2, p95: 9.3 },
  { team: "Session Replay", p50: 1.8, p75: 3.5, p95: 7.8 },
  { team: "Feature Flags", p50: 3.2, p75: 5.1, p95: 11.2 },
  { team: "Infrastructure", p50: 0.9, p75: 1.8, p95: 4.5 },
  { team: "Web Analytics", p50: 2.6, p75: 4.8, p95: 10.1 },
];

export const teamVelocityData = [
  { sprint: "S22", planned: 42, completed: 38, carryover: 4, prsMerged: 67 },
  { sprint: "S23", planned: 45, completed: 41, carryover: 4, prsMerged: 72 },
  { sprint: "S24", planned: 40, completed: 40, carryover: 0, prsMerged: 81 },
  { sprint: "S25", planned: 48, completed: 43, carryover: 5, prsMerged: 75 },
  { sprint: "S26", planned: 44, completed: 42, carryover: 2, prsMerged: 84 },
  { sprint: "S27", planned: 46, completed: 44, carryover: 2, prsMerged: 89 },
];

export const codeQualityData = {
  testCoverage: 78.4,
  testCoverageTrend: +2.1,
  techDebtScore: 23,
  techDebtTrend: -4,
  criticalIssues: 3,
  criticalIssuesTrend: -2,
  lintPassRate: 96.8,
  avgReviewTime: 3.2,
  openPRs: 18,
};

export const deployAnnotations = [
  { date: "2026-05-05", label: "v3.42 Release" },
  { date: "2026-05-12", label: "Hotfix deploy" },
  { date: "2026-05-19", label: "v3.43 Release" },
];
