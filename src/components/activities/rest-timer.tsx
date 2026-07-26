"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const PRESETS = [60, 90, 120, 180];

export function RestTimer() {
  const [duration, setDuration] = useState(90);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function start(seconds: number) {
    setDuration(seconds);
    setRemaining(seconds);
    setDone(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r === null) return null;
        if (r <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setDone(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
  }

  function stop() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRemaining(null);
    setDone(false);
  }

  const pct = remaining !== null ? ((duration - remaining) / duration) * 100 : 0;

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs font-medium text-muted">Rest timer</p>

      {remaining === null ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => start(s)}
              className="rounded-full border border-line px-3.5 py-1.5 text-sm text-muted transition-colors hover:border-brand hover:text-foreground"
            >
              {s}s
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-3">
          <div className="relative h-14 w-14 shrink-0">
            <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
              <circle cx="18" cy="18" r="16" fill="none" stroke="var(--raised)" strokeWidth="3" />
              <motion.circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke={done ? "var(--brand)" : "var(--brand)"}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 16}
                animate={{ strokeDashoffset: 2 * Math.PI * 16 * (1 - pct / 100) }}
                transition={{ duration: 0.3 }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-semibold">
              {done ? "🔔" : remaining}
            </span>
          </div>
          <div className="flex-1">
            {done ? (
              <p className="text-sm font-medium text-brand">Rest&apos;s over — go again.</p>
            ) : (
              <p className="text-sm text-muted">Resting… {remaining}s left</p>
            )}
          </div>
          <button
            type="button"
            onClick={stop}
            className="rounded-full border border-line px-3 py-1.5 text-xs text-muted hover:text-foreground"
          >
            {done ? "Dismiss" : "Cancel"}
          </button>
        </div>
      )}
    </div>
  );
}
