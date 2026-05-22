import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { cfrData, mttrData, doraMetrics } from "../../data/mockDoraData";

function GaugeRing({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = Math.min(value / max, 1);
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);

  return (
    <div className="flex flex-col items-center flex-shrink-0">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#1e2a4a" strokeWidth="6" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
        <text x="60" y="55" textAnchor="middle" fill="white" fontSize="22" fontWeight="700" fontFamily="Inter, sans-serif">
          {value}
        </text>
        <text x="60" y="72" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="JetBrains Mono, monospace">
          {label}
        </text>
      </svg>
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: "#151d35",
  border: "1px solid #2a3a5c",
  borderRadius: 8,
  fontSize: 12,
  color: "#e2e8f0",
};

export default function FailureRateMTTR() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div className="rounded-xl border border-navy-700 bg-navy-900/80 p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-white">Change Failure Rate</h3>
          <p className="font-mono text-[10px] text-slate-500 mt-0.5">Percentage of deploys causing incidents</p>
        </div>

        <div className="flex items-center gap-5">
          <GaugeRing value={doraMetrics.changeFailureRate.value} max={15} color="#f87171" label="% failures" />
          <div className="flex-1 h-28">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cfrData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2a4a" vertical={false} />
                <XAxis dataKey="date" hide />
                <YAxis tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} width={25} unit="%" />
                <Tooltip contentStyle={tooltipStyle} />
                <defs>
                  <linearGradient id="cfr-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f87171" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="rate" stroke="#f87171" fill="url(#cfr-grad)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-navy-700 bg-navy-900/80 p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-white">Mean Time to Recovery</h3>
          <p className="font-mono text-[10px] text-slate-500 mt-0.5">Average time to restore service after failure</p>
        </div>

        <div className="flex items-center gap-5">
          <GaugeRing value={doraMetrics.mttr.value} max={120} color="#fbbf24" label="minutes" />
          <div className="flex-1 h-28">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mttrData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2a4a" vertical={false} />
                <XAxis dataKey="date" hide />
                <YAxis tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} width={25} unit="m" />
                <Tooltip contentStyle={tooltipStyle} />
                <defs>
                  <linearGradient id="mttr-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="minutes" stroke="#fbbf24" fill="url(#mttr-grad)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
