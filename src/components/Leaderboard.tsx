import type { EngineerScore } from "../types";

type LeaderboardProps = {
  engineers: EngineerScore[];
  selectedHandle: string | null;
  onSelect: (handle: string) => void;
};

export default function Leaderboard({ engineers, selectedHandle, onSelect }: LeaderboardProps) {
  return (
    <div className="leaderboard">
      <div className="panel-header">
        <h2>Engineer Leaderboard</h2>
        <span className="meta-line">Top 20</span>
      </div>
      <div className="leaderboard-list">
        {engineers.slice(0, 20).map((engineer, index) => (
          <button
            key={engineer.handle}
            className={`leaderboard-row ${engineer.handle === selectedHandle ? "is-selected" : ""}`}
            onClick={() => onSelect(engineer.handle)}
            type="button"
          >
            <span className="rank">#{index + 1}</span>
            <span>
              <span className="handle">@{engineer.handle}</span>
              <span className="meta-line">
                {engineer.primaryImpactType} impact · {engineer.confidence} confidence
              </span>
            </span>
            <span className="score-pill">{engineer.totalScore}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
