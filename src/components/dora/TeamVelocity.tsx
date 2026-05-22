import {
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Line,
  ComposedChart,
} from "recharts";
import { teamVelocityData } from "../../data/mockDoraData";

export default function TeamVelocity() {
  return (
    <div className="rounded-xl border border-navy-700 bg-navy-900/80 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Team Velocity</h3>
          <p className="text-xs text-slate-500">Sprint-over-sprint | Story points and PRs merged</p>
        </div>
        <div className="flex gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-indigo-accent" />
            Completed
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-navy-600" />
            Carryover
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-3 bg-emerald-signal" />
            PRs Merged
          </span>
        </div>
      </div>

      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={teamVelocityData} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2a4a" vertical={false} />
            <XAxis
              dataKey="sprint"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={{ stroke: "#1e2a4a" }}
              tickLine={false}
            />
            <YAxis
              yAxisId="sp"
              tick={{ fontSize: 10, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <YAxis
              yAxisId="prs"
              orientation="right"
              tick={{ fontSize: 10, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#151d35",
                border: "1px solid #2a3a5c",
                borderRadius: 8,
                fontSize: 12,
                color: "#e2e8f0",
              }}
            />
            <Bar yAxisId="sp" dataKey="completed" name="Completed SP" fill="#6366f1" radius={[3, 3, 0, 0]} stackId="sp" />
            <Bar yAxisId="sp" dataKey="carryover" name="Carryover SP" fill="#2a3a5c" radius={[3, 3, 0, 0]} stackId="sp" />
            <Line yAxisId="prs" type="monotone" dataKey="prsMerged" name="PRs Merged" stroke="#34d399" strokeWidth={2} dot={{ r: 3, fill: "#34d399" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
