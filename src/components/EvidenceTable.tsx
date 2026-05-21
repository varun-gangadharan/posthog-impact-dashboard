import type { ContributionScore } from "../types";

type Props = {
  evidence: ContributionScore[];
};

const GITHUB_URL_RE = /^https:\/\/github\.com\/PostHog\/posthog\/(pull|issues)\/\d+$/;

export default function EvidenceTable({ evidence }: Props) {
  if (evidence.length === 0) {
    return (
      <div className="evidence-table-empty">
        <p>No evidence items match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="evidence-table-wrap">
      <h3>Evidence</h3>
      <p className="evidence-subtitle">
        Each row links back to GitHub so scores are auditable.
      </p>
      <div className="evidence-table-scroll">
        <table className="evidence-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Type</th>
              <th>Area</th>
              <th>Date</th>
              <th>Score</th>
              <th>Confidence</th>
              <th>Reason</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>
            {evidence.map((ev) => {
              const safeUrl = GITHUB_URL_RE.test(ev.url) ? ev.url : null;
              const weighted =
                ev.deliveryScore * 0.35 +
                ev.productScore * 0.25 +
                ev.leverageScore * 0.25 +
                ev.qualityScore * 0.15;

              return (
                <tr key={ev.id}>
                  <td>{ev.number}</td>
                  <td className="ev-title-cell">{ev.title}</td>
                  <td>{ev.type}</td>
                  <td>{ev.repoArea}</td>
                  <td>{new Date(ev.date).toLocaleDateString()}</td>
                  <td>{Math.round(weighted)}</td>
                  <td>
                    <span className={`confidence-badge confidence-${ev.confidence}`}>
                      {ev.confidence}
                    </span>
                  </td>
                  <td className="ev-reason-cell">
                    {ev.evidence.slice(0, 3).join("; ")}
                  </td>
                  <td>
                    {safeUrl ? (
                      <a href={safeUrl} target="_blank" rel="noreferrer">
                        GitHub
                      </a>
                    ) : (
                      <span className="no-link">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
