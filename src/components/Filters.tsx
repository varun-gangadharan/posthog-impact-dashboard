type Props = {
  repoArea: string;
  onRepoAreaChange: (area: string) => void;
  workType: string;
  onWorkTypeChange: (type: string) => void;
  timeWindow: string;
  onTimeWindowChange: (window: string) => void;
};

const AREA_OPTIONS = [
  "All",
  "Product",
  "Frontend",
  "Backend",
  "Infrastructure",
  "CI/testing",
  "Docs",
  "Other",
] as const;

const TYPE_OPTIONS = [
  "All",
  "Product Feature",
  "Bug Fix",
  "Reliability",
  "Developer Experience",
  "Test Infrastructure",
  "CI / Build",
  "Migration",
  "Refactor",
  "Documentation",
  "Experiment",
  "Maintenance",
  "Security",
  "Performance",
] as const;

const TIME_WINDOW_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "1h", label: "Past hour" },
  { value: "1d", label: "Past day" },
  { value: "1w", label: "Past week" },
  { value: "1m", label: "Past month" },
  { value: "3m", label: "Past 3 months" },
] as const;

const VALID_WINDOWS = new Set<string>(TIME_WINDOW_OPTIONS.map((o) => o.value));

export default function Filters({
  repoArea,
  onRepoAreaChange,
  workType,
  onWorkTypeChange,
  timeWindow,
  onTimeWindowChange,
}: Props) {
  return (
    <div className="filters" role="group" aria-label="Dashboard filters">
      <label>
        Time window
        <select
          value={timeWindow}
          onChange={(e) => {
            const val = e.target.value;
            if (VALID_WINDOWS.has(val)) {
              onTimeWindowChange(val);
            }
          }}
        >
          {TIME_WINDOW_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Repo area
        <select
          value={repoArea}
          onChange={(e) => {
            const val = e.target.value;
            if ((AREA_OPTIONS as readonly string[]).includes(val)) {
              onRepoAreaChange(val);
            }
          }}
        >
          {AREA_OPTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>

      <label>
        Work type
        <select
          value={workType}
          onChange={(e) => {
            const val = e.target.value;
            if ((TYPE_OPTIONS as readonly string[]).includes(val)) {
              onWorkTypeChange(val);
            }
          }}
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
