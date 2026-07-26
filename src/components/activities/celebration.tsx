"use client";

import { motion } from "framer-motion";
import type { ExerciseBest } from "@/lib/strength/prs";

const CONFETTI = ["🧌", "🔥", "💪", "🏃", "⭐", "🎉"];

const MESSAGES = [
  "Logged. The troll approves.",
  "Another one in the books.",
  "Future you says thanks.",
  "That's going in the streak.",
  "Nice work out there.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function Celebration({
  streak,
  newPRs = [],
  onDone,
}: {
  streak: number;
  newPRs?: ExerciseBest[];
  onDone: () => void;
}) {
  const message = pick(MESSAGES);

  return (
    <motion.div
      role="status"
      className="relative mx-auto max-w-sm space-y-5 overflow-hidden rounded-2xl border border-line bg-surface p-8 text-center"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute text-xl"
            style={{ left: `${(i * 37) % 100}%` }}
            initial={{ y: -20, opacity: 0, rotate: 0 }}
            animate={{ y: 220, opacity: [0, 1, 1, 0], rotate: 180 }}
            transition={{
              duration: 1.6 + (i % 5) * 0.2,
              delay: (i % 7) * 0.06,
              ease: "easeIn",
            }}
          >
            {CONFETTI[i % CONFETTI.length]}
          </motion.span>
        ))}
      </div>

      <motion.p
        className="text-5xl"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 12, delay: 0.1 }}
      >
        🧌
      </motion.p>
      <div>
        <p className="text-lg font-bold tracking-tight">{message}</p>
        {streak > 1 && (
          <p className="mt-1 text-sm text-muted">🔥 {streak}-day streak — keep it up.</p>
        )}
      </div>

      {newPRs.length > 0 && (
        <div className="space-y-1.5 rounded-xl border border-brand/30 bg-brand-soft p-3">
          <p className="text-xs font-semibold text-brand">🏆 New PR{newPRs.length > 1 ? "s" : ""}</p>
          {newPRs.map((pr) => (
            <p key={pr.exercise} className="text-sm">
              {pr.exercise} — {pr.weightLb} lb × {pr.reps}
            </p>
          ))}
        </div>
      )}

      <button
        onClick={onDone}
        className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong"
      >
        Back to dashboard
      </button>
    </motion.div>
  );
}
