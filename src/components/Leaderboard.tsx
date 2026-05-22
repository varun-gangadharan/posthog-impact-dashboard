import type { EngineerScore } from "../types";

type Props = {
  engineers: EngineerScore[];
  selectedHandle: string | null;
  onSelect: (handle: string) => void;
};

function confidenceBadgeColor(c: string): string {
  if (c === "high") return "#22c55e";
  if (c === "medium") return "#eab308";
  return "#ef4444";
}

const MAX_DISPLAY = 20;

export default function Leaderboard({
  engineers,
  selectedHandle,
  onSelect,
}: Props) {
  if (engineers.length === 0) {
    return (
      <div className="leaderboard leaderboard-empty">
        <h2>Engineers by Impact</h2>
        <p>No engineers match the current filters. Try broadening your selection.</p>
      </div>
    );
  }

  const displayed = engineers.slice(0, MAX_DISPLAY);

  return (
    <div className="leaderboard">
      <h2>Top {displayed.length} Engineers by Impact</h2>
      <p className="score-explainer">
        Scores are 0–100, combining Delivery (35%), Product (25%), Leverage (25%), and Quality (15%) signals from public GitHub activity.
      </p>
      <ol role="listbox" aria-label="Engineer rankings" className="leaderboard-list">
        {displayed.map((eng, i) => (
          <li
            key={eng.handle}
            className={`leaderboard-row ${selectedHandle === eng.handle ? "selected" : ""}`}
            onClick={() => onSelect(eng.handle)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(eng.handle);
              }
            }}
            tabIndex={0}
            role="option"
            aria-selected={selectedHandle === eng.handle}
          >
            <span className="rank">#{i + 1}</span>
            <span className="handle">@{eng.handle}</span>
            <span className="score">{Math.round(eng.totalScore)}<span className="score-max">/100</span></span>
            <span
              className="confidence"
              style={{ color: confidenceBadgeColor(eng.confidence) }}
            >
              {eng.confidence}
            </span>
            <span className="impact-type">{eng.primaryImpactType}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
