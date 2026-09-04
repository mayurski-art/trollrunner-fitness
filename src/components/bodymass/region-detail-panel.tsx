"use client";

import type { RegionDetail } from "@/lib/coach/muscle-map";

function formatSet(s: RegionDetail["recentSets"][number]): string {
  const when = new Date(s.date + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const load =
    s.weightLb && s.reps ? `${s.weightLb}lb × ${s.reps}` : s.reps ? `${s.reps} reps` : "";
  return `${when}  ${s.exercise}${load ? `  ${load}` : ""}`;
}

export function RegionDetailPanel({ detail }: { detail: RegionDetail }) {
  return (
    <div className="rounded-xl border border-line bg-raised p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{detail.label}</h4>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            detail.underTrained
              ? "bg-amber-400/15 text-amber-400"
              : "bg-[var(--brand-soft)] text-brand"
          }`}
        >
          {Math.round(detail.share * 100)}% of volume
          {detail.underTrained ? " · gap" : ""}
        </span>
      </div>

      {detail.recentSets.length > 0 && (
        <ul className="mt-2 space-y-1 font-mono text-xs text-muted">
          {detail.recentSets.map((s, i) => (
            <li key={i}>{formatSet(s)}</li>
          ))}
        </ul>
      )}

      <p className="mt-2.5 border-t border-line pt-2.5 text-xs text-muted">
        <span className="font-semibold text-foreground">Tip: </span>
        {detail.tip}
      </p>
    </div>
  );
}
