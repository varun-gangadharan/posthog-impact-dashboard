import { Shield, Bug, GitPullRequest, Clock, CheckCircle } from "lucide-react";
import { codeQualityData } from "../../data/mockDoraData";

function QualityMetric({
  icon,
  label,
  value,
  unit,
  trend,
  invertTrend,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
  trend: number;
  invertTrend?: boolean;
}) {
  const isPositive = invertTrend ? trend < 0 : trend > 0;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-navy-700 bg-navy-800/50 px-4 py-3">
      <div className="text-slate-500">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-lg font-bold text-white tabular-nums">
          {value}
          <span className="text-xs font-normal text-slate-500 ml-0.5">{unit}</span>
        </div>
      </div>
      {trend !== 0 && (
        <span className={`text-xs font-medium ${isPositive ? "text-emerald-signal" : "text-rose-signal"}`}>
          {trend > 0 ? "+" : ""}{trend}
        </span>
      )}
    </div>
  );
}

export default function CodeQuality() {
  const q = codeQualityData;
  return (
    <div className="rounded-xl border border-navy-700 bg-navy-900/80 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">Code Quality</h3>
        <p className="text-xs text-slate-500">Health indicators across the codebase</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <QualityMetric
          icon={<Shield className="h-4 w-4" />}
          label="Test Coverage"
          value={q.testCoverage}
          unit="%"
          trend={q.testCoverageTrend}
        />
        <QualityMetric
          icon={<Bug className="h-4 w-4" />}
          label="Critical Issues"
          value={q.criticalIssues}
          unit="open"
          trend={q.criticalIssuesTrend}
          invertTrend
        />
        <QualityMetric
          icon={<CheckCircle className="h-4 w-4" />}
          label="Lint Pass Rate"
          value={q.lintPassRate}
          unit="%"
          trend={0}
        />
        <QualityMetric
          icon={<Clock className="h-4 w-4" />}
          label="Avg Review Time"
          value={q.avgReviewTime}
          unit="hrs"
          trend={0}
        />
        <QualityMetric
          icon={<GitPullRequest className="h-4 w-4" />}
          label="Open PRs"
          value={q.openPRs}
          unit=""
          trend={0}
        />
        <QualityMetric
          icon={<Bug className="h-4 w-4" />}
          label="Tech Debt Score"
          value={q.techDebtScore}
          unit="/100"
          trend={q.techDebtTrend}
          invertTrend
        />
      </div>
    </div>
  );
}
