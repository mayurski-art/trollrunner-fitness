"use client";

import { useState } from "react";
import { logRecovery } from "@/lib/recovery/api";
import { interpretScore, scoreFor } from "@/lib/recovery/score";
import type { RecoveryLog } from "@/lib/recovery/types";
import { awardActivityXp } from "@/lib/gamification/xp-bridge";

const SORENESS_EMOJI = ["", "💪", "🙂", "😐", "😣", "🤕"];
const STRESS_EMOJI = ["", "😌", "🙂", "😐", "😰", "🥴"];

function ScaleSlider({
  label,
  emoji,
  value,
  onChange,
}: {
  label: string;
  emoji: string[];
  value: number | null;
  onChange: (v: number) => void;
}) {
  const current = value ?? 3;
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted">{label}</p>
        <span className="text-xl">{emoji[current]}</span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="mt-1 h-2 w-full cursor-pointer appearance-none rounded-full bg-raised accent-[var(--brand)]"
      />
    </div>
  );
}

export function RecoveryCheckin({
  userId,
  today,
  onLogged,
}: {
  userId: string;
  today: RecoveryLog | null;
  onLogged: () => void;
}) {
  const [editing, setEditing] = useState(!today);
  const [sleepHours, setSleepHours] = useState(today?.sleepHours?.toString() ?? "");
  const [soreness, setSoreness] = useState<number | null>(today?.soreness ?? null);
  const [stress, setStress] = useState<number | null>(today?.stress ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!editing && today) {
    const score = scoreFor(today);
    const status = interpretScore(score);
    return (
      <div className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Today&apos;s recovery: {status.label}</p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-semibold text-brand"
          >
            Edit
          </button>
        </div>
        {score !== null && <p className="mt-1 text-xs text-muted">Score {score}/100</p>}
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await logRecovery(userId, { sleepHours, soreness, stress, notes: "" });
      void awardActivityXp();
      setEditing(false);
      onLogged();
    } catch {
      setError("Couldn't save your check-in — try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <p className="text-sm font-semibold">How are you feeling today?</p>
      <div>
        <label htmlFor="sleep-hours" className="mb-1 block text-xs font-medium text-muted">
          Sleep (hours)
        </label>
        <input
          id="sleep-hours"
          type="number"
          step="0.5"
          value={sleepHours}
          onChange={(e) => setSleepHours(e.target.value)}
          className="w-full rounded-xl border border-line bg-raised px-3.5 py-2.5 text-sm outline-none focus:border-brand"
        />
      </div>
      <ScaleSlider label="Soreness" emoji={SORENESS_EMOJI} value={soreness} onChange={setSoreness} />
      <ScaleSlider label="Stress" emoji={STRESS_EMOJI} value={stress} onChange={setStress} />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full bg-brand py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:opacity-60"
      >
        {busy ? "Saving…" : "Log check-in"}
      </button>
    </form>
  );
}
