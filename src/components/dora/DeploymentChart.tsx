import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { deploymentFrequencyData, deployAnnotations } from "../../data/mockDoraData";

export default function DeploymentChart() {
  return (
    <div className="rounded-xl border border-navy-700 bg-navy-900/80 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Deployment Frequency</h3>
          <p className="text-xs text-slate-500">30-day window | daily deploys</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-indigo-accent" />
            Deploys
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-rose-signal" />
            Failures
          </span>
        </div>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={deploymentFrequencyData} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2a4a" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#64748b" }}
              tickFormatter={(d: string) => d.slice(5)}
              axisLine={{ stroke: "#1e2a4a" }}
              tickLine={false}
              interval={4}
            />
            <YAxis
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
            <Bar dataKey="deploys" fill="#6366f1" radius={[3, 3, 0, 0]} />
            <Bar dataKey="failures" fill="#f87171" radius={[3, 3, 0, 0]} />
            {deployAnnotations.map((a) => (
              <ReferenceLine
                key={a.date}
                x={a.date}
                stroke="#8b5cf6"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{
                  value: a.label,
                  position: "top",
                  fill: "#8b5cf6",
                  fontSize: 9,
                }}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
