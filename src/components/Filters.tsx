type Props = {
  repoArea: string;
  onRepoAreaChange: (area: string) => void;
  workType: string;
  onWorkTypeChange: (type: string) => void;
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

export default function Filters({
  repoArea,
  onRepoAreaChange,
  workType,
  onWorkTypeChange,
}: Props) {
  return (
    <div className="filters" role="group" aria-label="Dashboard filters">
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
