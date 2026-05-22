import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { leadTimeByTeam } from "../../data/mockDoraData";

export default function LeadTimeDistribution() {
  return (
    <div className="rounded-xl border border-navy-700 bg-navy-900/80 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">Lead Time Distribution</h3>
        <p className="text-xs text-slate-500">Hours to production by team | P50 / P75 / P95</p>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={leadTimeByTeam} layout="vertical" barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2a4a" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: "#64748b" }}
              axisLine={{ stroke: "#1e2a4a" }}
              tickLine={false}
              unit="h"
            />
            <YAxis
              dataKey="team"
              type="category"
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              width={110}
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
            <Legend
              wrapperStyle={{ fontSize: 10, color: "#64748b" }}
            />
            <Bar dataKey="p50" name="P50" fill="#6366f1" radius={[0, 3, 3, 0]} />
            <Bar dataKey="p75" name="P75" fill="#8b5cf6" radius={[0, 3, 3, 0]} />
            <Bar dataKey="p95" name="P95" fill="#2a3a5c" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
