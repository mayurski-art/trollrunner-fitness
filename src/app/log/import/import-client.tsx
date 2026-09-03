"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/accounts/session-context";
import { BACKLOG, BACKLOG_SET_COUNT } from "@/lib/activities/import/backlog";
import {
  importBacklog,
  type ImportProgress,
  type ImportResult,
} from "@/lib/activities/import/run-import";
import { SkeletonPage } from "@/components/ui/skeleton";

export function ImportClient() {
  const { status, session } = useSession();
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

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

  async function handleImport() {
    setError(null);
    setResult(null);
    setProgress({ done: 0, total: BACKLOG.length, current: "" });
    try {
      const res = await importBacklog(userId, setProgress);
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
          {BACKLOG.length} strength workouts and {BACKLOG_SET_COUNT} sets from
          your training log, dated Feb 2026 through Sep 2026. Already-imported
          workouts are skipped, so it is safe to run this more than once.
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4">
        {running ? (
          <div className="space-y-3">
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
        ) : (
          <button
            type="button"
            onClick={handleImport}
            className="w-full rounded-full bg-brand py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong active:scale-[0.98]"
          >
            Import {BACKLOG.length} workouts
          </button>
        )}

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
              {result.failed.length > 0 ? `, ${result.failed.length} failed` : ""}
              .
            </p>
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
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted">What will be added</h2>
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
