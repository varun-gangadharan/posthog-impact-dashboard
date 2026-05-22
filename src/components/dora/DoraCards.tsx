import { TrendingUp, TrendingDown, Timer, Rocket, AlertTriangle, RotateCcw } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { motion } from "motion/react";
import { doraMetrics } from "../../data/mockDoraData";
import type { DoraStatus } from "../../data/mockDoraData";

type MetricCardProps = {
  title: string;
  value: number;
  unit: string;
  trend: number;
  sparkline: number[];
  icon: React.ReactNode;
  status: DoraStatus;
  invertTrend?: boolean;
  index: number;
};

const statusColors: Record<DoraStatus, { bg: string; text: string; label: string }> = {
  elite: { bg: "bg-emerald-signal/10", text: "text-emerald-signal", label: "Elite" },
  high: { bg: "bg-blue-500/10", text: "text-blue-400", label: "High" },
  medium: { bg: "bg-amber-signal/10", text: "text-amber-signal", label: "Medium" },
  low: { bg: "bg-rose-signal/10", text: "text-rose-signal", label: "Low" },
};

function MetricCard({ title, value, unit, trend, sparkline, icon, status, invertTrend, index }: MetricCardProps) {
  const isPositive = invertTrend ? trend < 0 : trend > 0;
  const trendColor = isPositive ? "text-emerald-signal" : "text-rose-signal";
  const sparkColor = isPositive ? "#34d399" : "#f87171";
  const chartData = sparkline.map((v, i) => ({ i, v }));
  const s = statusColors[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
      className="group relative overflow-hidden rounded-xl border border-navy-700 bg-navy-900/80 p-5 transition-colors hover:border-navy-600">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-navy-800 p-2 text-indigo-accent">
            {icon}
          </div>
          <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-slate-500">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider ${s.bg} ${s.text}`}>
            {s.label}
          </span>
          <div className="relative">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-signal" />
            <div className="absolute inset-0 h-1.5 w-1.5 rounded-full bg-emerald-signal animate-ping opacity-30" />
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold tracking-tight text-white" style={{ fontVariantNumeric: "tabular-nums" }}>
              {value}
            </span>
            <span className="font-mono text-xs font-normal text-slate-500">{unit}</span>
          </div>
          <div className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{Math.abs(trend)}%</span>
            <span className="text-slate-600 text-[10px] ml-0.5">vs prior 30d</span>
          </div>
        </div>

        <div className="h-12 w-24 min-w-0 opacity-80 group-hover:opacity-100 transition-opacity">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={`spark-${title.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sparkColor} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={sparkColor}
                strokeWidth={1.5}
                fill={`url(#spark-${title.replace(/\s/g, "")})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

export default function DoraCards() {
  const m = doraMetrics;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
      <MetricCard
        title="Deploy Frequency"
        value={m.deploymentFrequency.value}
        unit={m.deploymentFrequency.unit}
        trend={m.deploymentFrequency.trend}
        sparkline={m.deploymentFrequency.sparkline}
        status={m.deploymentFrequency.status}
        icon={<Rocket className="h-4 w-4" />}
        index={0}
      />
      <MetricCard
        title="Lead Time"
        value={m.leadTime.value}
        unit={m.leadTime.unit}
        trend={m.leadTime.trend}
        sparkline={m.leadTime.sparkline}
        status={m.leadTime.status}
        icon={<Timer className="h-4 w-4" />}
        invertTrend
        index={1}
      />
      <MetricCard
        title="Change Failure Rate"
        value={m.changeFailureRate.value}
        unit={m.changeFailureRate.unit}
        trend={m.changeFailureRate.trend}
        sparkline={m.changeFailureRate.sparkline}
        status={m.changeFailureRate.status}
        icon={<AlertTriangle className="h-4 w-4" />}
        invertTrend
        index={2}
      />
      <MetricCard
        title="MTTR"
        value={m.mttr.value}
        unit={m.mttr.unit}
        trend={m.mttr.trend}
        sparkline={m.mttr.sparkline}
        status={m.mttr.status}
        icon={<RotateCcw className="h-4 w-4" />}
        invertTrend
        index={3}
      />
    </div>
  );
}
