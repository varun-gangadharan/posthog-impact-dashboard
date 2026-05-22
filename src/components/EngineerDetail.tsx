import type { EngineerScore } from "../types";

type EngineerDetailProps = {
  engineer: EngineerScore | null;
};

export default function EngineerDetail({ engineer }: EngineerDetailProps) {
  if (!engineer) {
    return (
      <div className="engineer-detail">
        <div className="detail-body empty-state">No engineer matches the current filters.</div>
      </div>
    );
  }

  return (
    <div className="engineer-detail">
      <div className="panel-header">
        <h2>@{engineer.handle}</h2>
        <span className="score-pill">{engineer.totalScore}</span>
      </div>
      <div className="detail-body">
        <div className="metric-grid">
          <Metric label="Delivery" value={engineer.deliveryScore} />
          <Metric label="Product" value={engineer.productScore} />
          <Metric label="Leverage" value={engineer.leverageScore} />
          <Metric label="Quality" value={engineer.qualityScore} />
        </div>
        <p className="summary">{engineer.summary}</p>
        <div className="tag-list">
          <span className="tag">{engineer.primaryImpactType}</span>
          <span className="tag">{engineer.confidence} confidence</span>
          <span className="tag">{engineer.topEvidence.length} evidence items</span>
        </div>
        {engineer.caveats.length > 0 && (
          <p className="summary">
            <strong>Caveat:</strong> {engineer.caveats[0]}
          </p>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
