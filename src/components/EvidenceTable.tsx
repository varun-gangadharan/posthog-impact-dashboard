import type { ContributionScore } from "../types";

type EvidenceTableProps = {
  evidence: ContributionScore[];
};

export default function EvidenceTable({ evidence }: EvidenceTableProps) {
  return (
    <div>
      <div className="panel-header">
        <h3>Evidence</h3>
        <span className="meta-line">{evidence.length} items</span>
      </div>
      <div className="evidence-table-wrap">
        <table className="evidence-table">
          <thead>
            <tr>
              <th>Work</th>
              <th>Area</th>
              <th>Type</th>
              <th>Date</th>
              <th>Scores</th>
              <th>Signals</th>
            </tr>
          </thead>
          <tbody>
            {evidence.map((item) => (
              <tr key={item.id}>
                <td>
                  <a href={item.url} target="_blank" rel="noreferrer">
                    #{item.number}
                  </a>
                  <div className="evidence-title">{item.title}</div>
                </td>
                <td>{item.repoArea}</td>
                <td>{item.type}</td>
                <td>{new Date(item.date).toLocaleDateString()}</td>
                <td>
                  D {item.deliveryScore} · P {item.productScore} · L {item.leverageScore} · Q{" "}
                  {item.qualityScore}
                </td>
                <td>{item.evidence.slice(0, 2).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
