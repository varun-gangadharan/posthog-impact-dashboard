import { useState } from "react";

export default function Methodology() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="methodology">
      <div className="methodology-always-visible">
        <p className="methodology-caveat-inline">
          Scores are a heuristic based on public GitHub signals. They do not
          capture mentoring, planning, incident response, or private work.
        </p>
      </div>

      <button
        className="methodology-toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        {expanded ? "Hide methodology" : "How scoring works"}
      </button>

      {expanded && (
        <div className="methodology-content">
          <h3>Scoring Dimensions</h3>
          <table>
            <thead>
              <tr>
                <th>Dimension</th>
                <th>Weight</th>
                <th>Signals</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Delivery Impact</td>
                <td>35%</td>
                <td>
                  Merged PRs, linked issues resolved, milestone presence, file
                  scope, size with diminishing returns
                </td>
              </tr>
              <tr>
                <td>Product Proximity</td>
                <td>25%</td>
                <td>
                  Product feature or bug fix type, product repo area, customer-facing signals
                </td>
              </tr>
              <tr>
                <td>Leverage</td>
                <td>25%</td>
                <td>
                  Platform/infra types, shared library paths, cross-cutting
                  changes, developer experience work
                </td>
              </tr>
              <tr>
                <td>Execution Quality</td>
                <td>15%</td>
                <td>
                  Merged status, review count bonus, scope bonus, revert
                  penalty (−50%)
                </td>
              </tr>
            </tbody>
          </table>

          <h3>Why Not Raw Activity?</h3>
          <p>
            Raw commit count, lines of code, and file count reward volume over
            impact. This model weights shipped outcomes (merged PRs linked to
            issues) and applies diminishing returns on large diffs to avoid
            rewarding boilerplate.
          </p>

          <h3>Confidence Labels</h3>
          <ul className="methodology-list">
            <li>
              <strong>High:</strong> 5+ contributions, 3+ evidence items,
              multiple scoring dimensions active, no reverts.
            </li>
            <li>
              <strong>Medium:</strong> 2–3 qualifying signals present.
            </li>
            <li>
              <strong>Low:</strong> Few contributions or narrow evidence — treat
              as directional only.
            </li>
          </ul>

          <h3>What GitHub Data Misses</h3>
          <ul className="methodology-list">
            <li>Mentoring and pair programming</li>
            <li>Design discussions and architecture reviews</li>
            <li>Incident response and on-call work</li>
            <li>Sprint planning and project management</li>
            <li>Private repositories and internal tools</li>
            <li>Customer context and support work</li>
          </ul>

          <h3>How to Audit a Score</h3>
          <p>
            Every score links to its source evidence. Click the GitHub link in
            the evidence table to verify the PR or issue. Compare the evidence
            reasons against the scoring dimensions above to understand why a
            contribution scored the way it did.
          </p>

          <p className="methodology-caveat">
            Use this dashboard as a starting point for investigation, not a
            final judgment. Always combine with 1:1 context before drawing
            conclusions about an engineer's impact.
          </p>
        </div>
      )}
    </div>
  );
}
