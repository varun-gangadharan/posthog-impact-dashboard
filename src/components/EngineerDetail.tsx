import type { EngineerScore } from "../types";

type Props = {
  engineer: EngineerScore | null;
};

const DIMENSIONS = [
  { key: "deliveryScore" as const, label: "Delivery", weight: "35%", desc: "Shipped, merged work with linked issues" },
  { key: "productScore" as const, label: "Product", weight: "25%", desc: "Customer-facing feature and bug fix work" },
  { key: "leverageScore" as const, label: "Leverage", weight: "25%", desc: "Platform, shared libs, cross-cutting impact" },
  { key: "qualityScore" as const, label: "Quality", weight: "15%", desc: "Review depth, scope, revert absence" },
];

function confidenceExplanation(c: string): string {
  if (c === "high") return "Multiple dimensions, 5+ contributions, strong evidence breadth.";
  if (c === "medium") return "Some evidence across dimensions, but gaps remain.";
  return "Limited contributions or narrow evidence — interpret with caution.";
}

export default function EngineerDetail({ engineer }: Props) {
  if (!engineer) {
    return (
      <div className="engineer-detail empty">
        <p>Select an engineer from the leaderboard to see details.</p>
      </div>
    );
  }

  return (
    <div className="engineer-detail">
      <h2>Why @{engineer.handle} ranks here</h2>

      <div className="score-summary">
        <span className="total-score">{Math.round(engineer.totalScore)}</span>
        <div className="confidence-block">
          <span className="confidence-label">{engineer.confidence} confidence</span>
          <span className="confidence-explanation">
            {confidenceExplanation(engineer.confidence)}
          </span>
        </div>
      </div>

      <div className="primary-impact">
        Primary impact: <strong>{engineer.primaryImpactType}</strong>
      </div>

      <div className="score-breakdown" aria-label="Score breakdown">
        <h3>Score Breakdown</h3>
        <div className="breakdown-bars">
          {DIMENSIONS.map((d) => (
            <BreakdownBar
              key={d.key}
              label={`${d.label} (${d.weight})`}
              value={engineer[d.key]}
              description={d.desc}
            />
          ))}
        </div>
      </div>

      <div className="explanation">
        <p>{engineer.summary}</p>
      </div>

      {engineer.caveats.length > 0 && (
        <div className="caveats">
          <h4>Caveats</h4>
          <ul>
            {engineer.caveats.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function BreakdownBar({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  const pct = Math.min(Math.max(value, 0), 100);
  return (
    <div className="breakdown-row" title={description}>
      <span className="breakdown-label">{label}</span>
      <div className="breakdown-track" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="breakdown-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="breakdown-value">{Math.round(value)}</span>
    </div>
  );
}
