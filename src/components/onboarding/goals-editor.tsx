"use client";

import { useEffect, useState } from "react";
import { getClient } from "@/lib/accounts/client";
import { GOALS } from "@/lib/onboarding/constants";
import { getGoals } from "@/lib/coach/profile";

/**
 * Edits the goals that drive the coach, without re-running onboarding.
 *
 * Goals were previously write-once at onboarding, so changing one meant walking
 * the whole flow again — and the hybrid week plan only switches on when a goal
 * asks for it, which made that a dead end.
 */
export function GoalsEditor({ userId }: { userId: string }) {
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [targetDate, setTargetDate] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getGoals(userId)
      .then((rows) => {
        if (cancelled) return;
        setSelected(new Set(rows.map((r) => r.goal_key)));
        const withDate = rows.find((r) => r.target_date);
        if (withDate?.target_date) setTargetDate(withDate.target_date.slice(0, 10));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load goals.");
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  function toggle(goal: string) {
    setSaved(false);
    setSelected((prev) => {
      const next = new Set(prev ?? []);
      if (next.has(goal)) next.delete(goal);
      else next.add(goal);
      return next;
    });
  }

  async function handleSave() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    const sb = getClient();
    try {
      // Replace the set wholesale — an upsert alone would never remove a goal
      // the user has just unticked.
      const { error: delError } = await sb
        .from("fit_goals")
        .delete()
        .eq("user_id", userId);
      if (delError) throw delError;

      if (selected.size) {
        const rows = [...selected].map((goal_key) => ({
          user_id: userId,
          goal_key,
          target_date: targetDate || null,
        }));
        const { error: insError } = await sb.from("fit_goals").insert(rows);
        if (insError) throw insError;
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your goals.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card rounded-2xl p-5">
      <h2 className="text-sm font-semibold">Your goals</h2>
      <p className="mt-1 text-xs text-muted">
        These drive the coach. Picking <strong>Hybrid athlete</strong> switches the
        week plan to a combined run-and-lift build.
      </p>

      {selected === null ? (
        <p className="mt-3 text-sm text-muted">Loading…</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {GOALS.map((goal) => {
              const on = selected.has(goal);
              return (
                <button
                  key={goal}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(goal)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    on
                      ? "border-brand bg-brand-soft text-brand"
                      : "border-line text-muted hover:text-foreground"
                  }`}
                >
                  {goal}
                </button>
              );
            })}
          </div>

          <div className="mt-4 max-w-xs">
            <label
              htmlFor="goal-target-date"
              className="mb-1 block text-xs font-medium text-muted"
            >
              Target date (optional — sets your race phase)
            </label>
            <input
              id="goal-target-date"
              type="date"
              value={targetDate}
              onChange={(e) => {
                setTargetDate(e.target.value);
                setSaved(false);
              }}
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-brand"
            />
          </div>

          {error && (
            <p role="alert" className="mt-3 text-sm text-red-400">
              {error}
            </p>
          )}
          {saved && (
            <p role="status" className="mt-3 text-sm text-brand">
              Saved. Head to the Coach tab to see the updated plan.
            </p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="mt-4 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save goals"}
          </button>
        </>
      )}
    </section>
  );
}
