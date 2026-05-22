import { motion } from "motion/react";

const threads = [
  "M -120 180 C 120 40 280 330 520 170 S 900 80 1180 220 S 1520 320 1740 130",
  "M -80 520 C 160 340 340 620 580 470 S 960 300 1210 500 S 1510 690 1780 420",
  "M -140 760 C 80 660 300 830 520 710 S 920 590 1160 760 S 1480 940 1740 700",
];

export default function ThreadBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden bg-navy-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.10),transparent_30%)]" />
      <svg
        className="absolute inset-0 h-full w-full opacity-60"
        viewBox="0 0 1600 900"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {threads.map((path, index) => (
          <motion.path
            key={path}
            d={path}
            fill="none"
            stroke={index === 1 ? "#10b981" : "#6366f1"}
            strokeWidth={index === 1 ? 1.2 : 0.9}
            strokeOpacity={index === 1 ? 0.22 : 0.18}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.5, delay: 0.2 + index * 0.15, ease: "easeOut" }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.25)_1px,transparent_1px)] bg-[size:48px_48px]" />
    </div>
  );
}
