import type { ReactNode } from "react";
import { motion } from "motion/react";

type AnimatedPanelProps = {
  children: ReactNode;
  delay?: number;
};

export default function AnimatedPanel({ children, delay = 0 }: AnimatedPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
