"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/accounts/session-context";
import { BACKLOG, BACKLOG_SET_COUNT } from "@/lib/activities/import/backlog";
import {
  COROS_SUMMARY,
  RUN_BACKLOG,
  RUN_BACKLOG_TOTAL_MI,
} from "@/lib/activities/import/run-backlog";
import {
  CROSS_TRAINING,
  DETAILED_RUNS,
  DETAILED_RUNS_TOTAL_MI,
} from "@/lib/activities/import/runs-detailed";
import {
  importBacklog,
  importDetailedRuns,
  importRunBacklog,
  type ImportProgress,
  type ImportResult,
} from "@/lib/activities/import/run-import";
import { SkeletonPage } from "@/components/ui/skeleton";

type Kind = "strength" | "run" | "detailed";

export function ImportClient() {
  const { status, session } = useSession();
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  /** Which import is running or last finished, so results land in the right card. */
  const [active, setActive] = useState<Kind | null>(null);

  if (status === "loading") return <SkeletonPage />;

  if (status === "anon" || !session) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">Import backlog</h1>
        <p className="text-sm text-muted">
          Sign in first — head to the You tab to log in.
        </p>
      </div>
    );
  }

  const userId = session.userId;

  async function handleImport(kind: Kind) {
    setError(null);
    setResult(null);
    setActive(kind);
    const total =
      kind === "strength"
        ? BACKLOG.length
        : kind === "run"
          ? RUN_BACKLOG.length
          : DETAILED_RUNS.length;
    setProgress({ done: 0, total, current: "" });
    try {
      const res =
        kind === "strength"
          ? await importBacklog(userId, setProgress)
          : kind === "run"
            ? await importRunBacklog(userId, setProgress)
            : await importDetailedRuns(userId, setProgress);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setProgress(null);
    }
  }

  const running = progress !== null;
  const pct = progress ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Import backlog</h1>
        <p className="text-sm text-muted">
          One-time backfill of training history that predates logging in the app.
          Both imports skip anything already there, so they are safe to re-run.
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold">Strength</h2>
        <p className="mt-1 text-sm text-muted">
          {BACKLOG.length} workouts and {BACKLOG_SET_COUNT} sets, Feb 2026 through
          Sep 2026.
        </p>
        {running && active === "strength" ? (
          <Progress progress={progress} pct={pct} />
        ) : (
          <button
            type="button"
            disabled={running}
            onClick={() => handleImport("strength")}
            className="mt-3 w-full rounded-full bg-brand py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong active:scale-[0.98] disabled:opacity-60"
          >
            Import {BACKLOG.length} workouts
          </button>
        )}
        {active === "strength" && (
          <Outcome error={error} result={result} />
        )}
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold">Running — individual sessions</h2>
        <p className="mt-1 text-sm text-muted">
          {DETAILED_RUNS.length} sessions from Aug–Sep 2026,{" "}
          {DETAILED_RUNS_TOTAL_MI} mi, plus {CROSS_TRAINING.length} cross-training
          session{CROSS_TRAINING.length === 1 ? "" : "s"}. Real dates, distances and
          times — these unlock run frequency, pace and race predictions. Walks and
          cycling are logged as such, so their pace never feeds a race prediction.
        </p>
        {running && active === "detailed" ? (
          <Progress progress={progress} pct={pct} />
        ) : (
          <button
            type="button"
            disabled={running || DETAILED_RUNS.length === 0}
            onClick={() => handleImport("detailed")}
            className="mt-3 w-full rounded-full bg-brand py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong active:scale-[0.98] disabled:opacity-60"
          >
            Import {DETAILED_RUNS.length} run{DETAILED_RUNS.length === 1 ? "" : "s"}
          </button>
        )}
        {active === "detailed" && <Outcome error={error} result={result} />}

        <ul className="mt-3 space-y-1 text-xs text-muted">
          {DETAILED_RUNS.map((r) => (
            <li key={`${r.date}-${r.distanceMi}`} className="flex justify-between gap-3">
              <span>{r.date}</span>
              <span className="font-mono">
                {r.distanceMi} mi · {r.durationMin} min
                {r.avgHeartRate ? ` · ${r.avgHeartRate} bpm` : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold">Running — weekly totals</h2>
        <p className="mt-1 text-sm text-muted">
          {RUN_BACKLOG.length} weekly totals from COROS ({COROS_SUMMARY.rangeLabel}),{" "}
          {RUN_BACKLOG_TOTAL_MI} mi across {COROS_SUMMARY.activities} activities.
        </p>
        <p className="mt-2 rounded-xl border border-line bg-raised p-3 text-xs text-muted">
          Your COROS screen reports weekly totals, not individual runs, so each row
          here stands for a whole week rather than a single session. Distances come
          from measuring the chart and are accurate to about half a mile; time and
          elevation are apportioned from the 16-week totals. That means pace is
          averaged, so these rows are deliberately left out of race predictions.
        </p>
        {running && active === "run" ? (
          <Progress progress={progress} pct={pct} />
        ) : (
          <button
            type="button"
            disabled={running}
            onClick={() => handleImport("run")}
            className="mt-3 w-full rounded-full bg-brand py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong active:scale-[0.98] disabled:opacity-60"
          >
            Import {RUN_BACKLOG.length} weeks of running
          </button>
        )}
        {active === "run" && <Outcome error={error} result={result} />}

        <ul className="mt-3 space-y-1 text-xs text-muted">
          {RUN_BACKLOG.map((w) => (
            <li key={w.date} className="flex justify-between gap-3">
              <span>Week of {w.date}</span>
              <span className="font-mono">
                {w.distanceMi} mi · {w.durationMin} min
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted">Strength workouts in detail</h2>
        <ul className="space-y-1.5">
          {BACKLOG.map((w) => {
            const key = `${w.date}::${w.title}`;
            const open = expanded === key;
            return (
              <li key={key} className="rounded-xl border border-line bg-surface">
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : key)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{w.title}</span>
                    <span className="block text-xs text-muted">{w.date}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {w.sets.length} sets {open ? "▲" : "▼"}
                  </span>
                </button>
                {open && (
                  <div className="border-t border-line px-3.5 py-2.5">
                    <ul className="space-y-0.5 text-xs text-muted">
                      {w.sets.map((set, i) => (
                        <li key={i}>
                          {set.exercise}
                          {set.weightLb ? ` — ${set.weightLb} lb` : ""}
                          {set.reps ? ` × ${set.reps}` : " — to failure"}
                        </li>
                      ))}
                    </ul>
                    {w.notes && (
                      <p className="mt-2 text-xs italic text-muted">{w.notes}</p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function Progress({ progress, pct }: { progress: ImportProgress; pct: number }) {
  return (
    <div className="mt-3 space-y-3">
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-raised"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Import progress"
      >
        <div
          className="h-full bg-brand transition-[width] duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-sm text-muted">
        {progress.done} of {progress.total}
        {progress.current ? ` — ${progress.current}` : ""}
      </p>
    </div>
  );
}

function Outcome({
  error,
  result,
}: {
  error: string | null;
  result: (ImportResult & { supersededRemoved?: number }) | null;
}) {
  if (!error && !result) return null;
  return (
    <>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}
      {result && (
        <div className="mt-4 space-y-2 text-sm" role="status">
          <p className="font-semibold text-foreground">
            Imported {result.imported}
            {result.skipped > 0 ? `, skipped ${result.skipped} already there` : ""}
            {result.failed.length > 0 ? `, ${result.failed.length} failed` : ""}.
          </p>
          {(result.supersededRemoved ?? 0) > 0 && (
            <p className="text-muted">
              Removed {result.supersededRemoved} weekly-summary row
              {result.supersededRemoved === 1 ? "" : "s"} now covered by individual
              runs, so the mileage is not counted twice.
            </p>
          )}
          {result.failed.length > 0 && (
            <ul className="space-y-1 text-red-400">
              {result.failed.map((f) => (
                <li key={f.workout}>
                  {f.workout}: {f.message}
                </li>
              ))}
            </ul>
          )}
          <Link href="/" className="inline-block font-medium text-brand hover:underline">
            Back to your feed →
          </Link>
        </div>
      )}
    </>
  );
}
