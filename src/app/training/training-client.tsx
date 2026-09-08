"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/accounts/session-context";
import { getAccessToken } from "@/lib/accounts";
import { getStrengthSplit } from "@/lib/onboarding/api";
import { AVAILABLE_SPLITS, programFor } from "@/lib/strength/programs";
import { SkeletonPage } from "@/components/ui/skeleton";
import type { SplitPattern } from "@/lib/strength/detect-pattern";

type TrainingAnalysis = { pattern: SplitPattern | null; weightLb?: number | null; coachNote?: string | null };

export function TrainingClient() {
  const { status, session } = useSession();
  const [split, setSplit] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [analysis, setAnalysis] = useState<TrainingAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

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

  useEffect(() => {
    if (status !== "authed" || !session) return;
    let cancelled = false;
    (async () => {
      setAnalysisLoading(true);
      try {
        const token = await getAccessToken();
        const res = await fetch("/api/training-analysis", {
          method: "POST",
          headers: { Authorization: `Bearer ${token ?? ""}` },
        });
        const data = await res.json();
        if (!cancelled && res.ok) setAnalysis(data);
      } catch {
        // Silently fall back to the template picker below — this is a bonus
        // panel, not a blocking requirement to use the page.
      } finally {
        if (!cancelled) setAnalysisLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, session]);

  if (status === "loading") {
    return <SkeletonPage />;
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
      <h1 className="text-2xl font-bold tracking-tight">Training</h1>

      {analysisLoading && !analysis && (
        <div className="card rounded-2xl p-5 text-sm text-muted">Reading your logged workouts…</div>
      )}

      {analysis?.pattern && (
        <section className="card rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Your detected pattern</h2>
            <span className="text-xs text-muted">From your last 8 weeks of logs</span>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {analysis.pattern.trainedDays.map((d) => (
              <div key={d.day} className="rounded-xl border border-line px-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold">{d.day}</span>
                  <span className="text-xs text-muted">{d.label}</span>
                </div>
                {d.exercises.length > 0 && (
                  <p className="mt-0.5 text-xs text-muted">{d.exercises.join(", ")}</p>
                )}
              </div>
            ))}
          </div>

          {analysis.pattern.restDays.length > 0 && (
            <p className="mt-3 text-xs text-muted">Rest days: {analysis.pattern.restDays.join(", ")}</p>
          )}

          {analysis.pattern.missingGroups.length > 0 && (
            <div className="mt-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3.5 py-2.5 text-xs text-amber-300">
              Not showing up anywhere in your logs: {analysis.pattern.missingGroups.join(", ")}.
              {analysis.pattern.suggestedDay && ` ${analysis.pattern.suggestedDay} looks like the best open slot for it.`}
            </div>
          )}

          {analysis.coachNote && (
            <p className="mt-3 border-t border-line pt-3 text-sm text-muted">{analysis.coachNote}</p>
          )}
        </section>
      )}

      <section className="card rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">
            {analysis?.pattern ? `Template: ${program.split}` : program.split}
          </h2>
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
          <div key={day.day} className="card card-interactive rounded-2xl p-4">
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
