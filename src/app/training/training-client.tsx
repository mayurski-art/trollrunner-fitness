"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/accounts/session-context";
import { getStrengthSplit } from "@/lib/onboarding/api";
import { AVAILABLE_SPLITS, programFor } from "@/lib/strength/programs";

export function TrainingClient() {
  const { status, session } = useSession();
  const [split, setSplit] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (status !== "authed" || !session) return;
    let cancelled = false;
    void getStrengthSplit(session.userId).then((s) => {
      if (!cancelled) {
        setSplit(s);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [status, session]);

  if (status === "loading") {
    return <p className="text-sm text-muted">Loading…</p>;
  }
  if (status !== "authed") {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">Training</h1>
        <p className="text-sm text-muted">Sign in to see your strength program.</p>
      </div>
    );
  }

  const program = programFor(split);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Training</h1>
        <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
          Phase 7 · strength module
        </span>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{program.split}</h2>
          {loaded && !split && (
            <span className="text-xs text-muted">
              Defaulted — no split saved from onboarding
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted">{program.description}</p>
      </section>

      <div>
        <p className="mb-2 text-xs font-medium text-muted">Switch split</p>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_SPLITS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSplit(s)}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                program.split === s
                  ? "border-brand bg-brand-soft font-semibold text-brand"
                  : "border-line text-muted hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {program.days.map((day, i) => (
          <div key={day.day} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-semibold">{day.day}</h3>
              <span className="text-xs text-muted">{day.focus}</span>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              {day.exercises.map((ex) => (
                <li key={ex.name}>
                  {ex.name} — {ex.sets} × {ex.reps}
                </li>
              ))}
            </ul>
            <Link
              href={`/log?split=${encodeURIComponent(program.split)}&day=${i}`}
              className="mt-3 inline-block rounded-full bg-brand px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-strong"
            >
              Start this workout →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
