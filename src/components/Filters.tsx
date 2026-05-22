const repoAreas = ["All", "Product", "Infrastructure", "Data", "Developer Experience", "Unknown"];
const workTypes = ["All", "Feature", "Bug Fix", "Refactor", "Maintenance", "Testing", "Documentation"];
const windows = [
  { value: "all", label: "All time" },
  { value: "1h", label: "Last hour" },
  { value: "1d", label: "Last day" },
  { value: "1w", label: "Last week" },
  { value: "1m", label: "Last month" },
  { value: "3m", label: "Last 3 months" },
];

type FiltersProps = {
  repoArea: string;
  onRepoAreaChange: (value: string) => void;
  workType: string;
  onWorkTypeChange: (value: string) => void;
  timeWindow: string;
  onTimeWindowChange: (value: string) => void;
};

export default function Filters({
  repoArea,
  onRepoAreaChange,
  workType,
  onWorkTypeChange,
  timeWindow,
  onTimeWindowChange,
}: FiltersProps) {
  return (
    <div className="filters-panel" aria-label="Dashboard filters">
      <div className="filter-field">
        <label htmlFor="repo-area">Repo area</label>
        <select id="repo-area" value={repoArea} onChange={(e) => onRepoAreaChange(e.target.value)}>
          {repoAreas.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
      </div>
      <div className="filter-field">
        <label htmlFor="work-type">Work type</label>
        <select id="work-type" value={workType} onChange={(e) => onWorkTypeChange(e.target.value)}>
          {workTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
      <div className="filter-field">
        <label htmlFor="time-window">Time window</label>
        <select id="time-window" value={timeWindow} onChange={(e) => onTimeWindowChange(e.target.value)}>
          {windows.map((window) => (
            <option key={window.value} value={window.value}>
              {window.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
