import { Activity, Globe, Clock } from "lucide-react";
import { motion } from "motion/react";

const ENVIRONMENTS = ["Production", "Staging", "Development"] as const;

type Props = {
  environment: string;
  onEnvironmentChange: (env: string) => void;
};

export default function DashboardHeader({ environment, onEnvironmentChange }: Props) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative mb-8 overflow-hidden rounded-xl border border-navy-700 bg-navy-900/80 px-6 py-5 backdrop-blur-sm"
    >
      <div className="absolute inset-0 opacity-[0.06]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="header-threads" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M0 40 Q20 20 40 40 Q60 60 80 40" fill="none" stroke="#6366f1" strokeWidth="0.8" />
              <path d="M0 20 Q20 40 40 20 Q60 0 80 20" fill="none" stroke="#8b5cf6" strokeWidth="0.5" />
              <path d="M0 60 Q20 80 40 60 Q60 40 80 60" fill="none" stroke="#8b5cf6" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#header-threads)" />
        </svg>
      </div>

      <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Activity className="h-6 w-6 text-indigo-accent" />
          </motion.div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Engineering Productivity
            </h1>
            <p className="text-sm text-slate-400">DORA Metrics & Team Performance</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            <span>Updated {new Date().toLocaleTimeString()}</span>
            <span className="ml-1 inline-block h-2 w-2 rounded-full bg-emerald-signal animate-pulse" />
          </div>

          <div className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-slate-500" />
            <select
              value={environment}
              onChange={(e) => onEnvironmentChange(e.target.value)}
              className="rounded-md border border-navy-600 bg-navy-800 px-2 py-1 text-xs text-slate-300 outline-none focus:border-indigo-accent transition-colors"
            >
              {ENVIRONMENTS.map((env) => (
                <option key={env} value={env}>{env}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
