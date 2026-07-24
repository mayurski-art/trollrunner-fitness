"use client";

import { AnimatePresence, motion } from "framer-motion";

export function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round(((step + 1) / total) * 100);
  return (
    <div aria-label={`Step ${step + 1} of ${total}`} className="space-y-1.5">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-raised">
        <motion.div
          className="h-full rounded-full bg-brand"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
      <p className="text-xs text-muted">
        Step {step + 1} of {total}
      </p>
    </div>
  );
}

export function StepTransition({
  stepKey,
  children,
}: {
  stepKey: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepKey}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
