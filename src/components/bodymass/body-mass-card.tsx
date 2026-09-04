"use client";

import { useState } from "react";
import type { Activity } from "@/lib/activities/types";
import { logWeight } from "@/lib/bodyweight/api";
import type { WeightTrend } from "@/lib/bodyweight/trend";
import { buildMuscleMap, type MuscleRegion } from "@/lib/coach/muscle-map";
import { MuscleSilhouette } from "./muscle-silhouette";
import { RegionDetailPanel } from "./region-detail-panel";

/**
 * Body Mass — the fifth Progress card (Phase 5), and the only one that
 * doesn't fit StatCard's number-left/viz-right skeleton: an interactive
 * muscle map with a click-through detail panel needs its own layout. Reuses
 * the shared .card surface so it still reads as part of the same set.
 *
 * Two halves genuinely built here rather than a COROS lookalike shell:
 * weight (logged by hand — see fit_body_weight.sql, there is no scale sync)
 * and the muscle map (built entirely on hybrid.ts's existing analysis; see
 * docs/COROS-UI.md for what prompted it and why isolation work has no region
 * of its own).
 */
export function BodyMassCard({
  userId,
  activities,
  weightTrend,
  onWeightLogged,
}: {
  userId: string;
  activities: Activity[];
  weightTrend: WeightTrend | null;
  onWeightLogged: () => void;
}) {
  const [selected, setSelected] = useState<MuscleRegion | null>(null);
  const map = buildMuscleMap(activities);

  return (
    <section className="card rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#ec489922] text-[11px] font-bold text-[#ec4899]">
          BM
        </span>
        <h3 className="text-[15px] font-semibold tracking-tight">Body Mass</h3>
      </div>

      <WeightRow trend={weightTrend} userId={userId} onLogged={onWeightLogged} />

      <div className="mt-4 border-t border-line pt-4">
        {map ? (
          <>
            <div className="flex gap-4">
              <div className="flex shrink-0 items-center justify-center">
                <MuscleSilhouette
                  selected={selected}
                  underTrained={(Object.keys(map.regions) as MuscleRegion[]).filter(
                    (region) => map.regions[region].underTrained
                  )}
                  onSelect={setSelected}
                />
              </div>
              <div className="min-w-0 flex-1 self-center text-xs text-muted">
                {selected ? (
                  <p>Tap another region to compare, or the same one to close it.</p>
                ) : (
                  <p>
                    Tap a region for recent sets and a tip. Amber means under-trained
                    relative to the rest of your log.
                  </p>
                )}
              </div>
            </div>
            {selected && (
              <div className="mt-3">
                <RegionDetailPanel detail={map.regions[selected]} />
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-muted">
            Log a handful of strength sessions to unlock the muscle map — it
            reads volume and gaps straight from what you lift.
          </p>
        )}
      </div>
    </section>
  );
}

function WeightRow({
  trend,
  userId,
  onLogged,
}: {
  trend: WeightTrend | null;
  userId: string;
  onLogged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(trend ? String(trend.current) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await logWeight(userId, { weightLb: value });
      setEditing(false);
      onLogged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that.");
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2">
        <input
          type="number"
          step="0.1"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Weight in pounds"
          className="w-24 rounded-lg border border-line bg-surface px-2 py-1.5 font-mono text-sm"
          autoFocus
        />
        <span className="text-xs text-muted">lb</span>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-xs text-muted"
        >
          Cancel
        </button>
        {error && <p className="w-full text-xs text-red-400">{error}</p>}
      </form>
    );
  }

  return (
    <div className="mt-3 flex items-end justify-between gap-3">
      <div>
        <p className="flex items-baseline gap-1.5">
          <span className="font-mono text-[28px] font-bold leading-none tracking-tight tabular-nums">
            {trend ? trend.current : "—"}
          </span>
          <span className="text-sm font-semibold text-muted">lb</span>
        </p>
        <p className="mt-1.5 text-[13px] text-muted">
          {trend
            ? `${trend.changeLb === 0 ? "No change" : `${trend.changeLb > 0 ? "+" : ""}${trend.changeLb} lb`} over ${trend.windowDays}d`
            : "No weigh-ins logged yet"}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-brand hover:border-brand"
      >
        Log weight
      </button>
    </div>
  );
}
