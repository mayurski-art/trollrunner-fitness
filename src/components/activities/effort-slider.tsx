"use client";

import { motion } from "framer-motion";

const LEVELS = [
  { max: 2, emoji: "😴", label: "Recovery" },
  { max: 4, emoji: "🙂", label: "Easy" },
  { max: 6, emoji: "😅", label: "Moderate" },
  { max: 8, emoji: "😤", label: "Hard" },
  { max: 10, emoji: "🥵", label: "All-out" },
];

function levelFor(value: number) {
  return LEVELS.find((l) => value <= l.max) ?? LEVELS[LEVELS.length - 1];
}

export function EffortSlider({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
  const current = value ?? 5;
  const level = levelFor(current);

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted">How did it feel?</p>
        {value !== null && (
          <span className="text-xs font-semibold text-brand">{level.label}</span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-3">
        <motion.span
          key={level.emoji}
          initial={{ scale: 0.6, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="text-4xl"
          aria-hidden="true"
        >
          {value === null ? "🤔" : level.emoji}
        </motion.span>
        <input
          type="range"
          min={1}
          max={10}
          value={current}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Effort, 1 to 10"
          className="h-2 w-full flex-1 cursor-pointer appearance-none rounded-full bg-raised accent-[var(--brand)]"
        />
      </div>
    </div>
  );
}
