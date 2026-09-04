"use client";

import type { MuscleRegion } from "@/lib/coach/muscle-map";

/**
 * Two simplified body silhouettes — front and back, side by side — with 6
 * clickable regions total, one per hybrid.ts movement pattern (isolation
 * folded into its accessory region — see muscle-map.ts).
 *
 * A single front-view figure cannot show "upper back" at all — it is
 * anatomically on the other side of the body. An earlier version tried to
 * draw it as slivers beside the chest and it rendered invisible, hidden
 * behind the chest shape; that was actively misleading, not just ugly. Two
 * views (COROS's own screen does the same split) gives every region a real,
 * visible, anatomically sensible spot: front carries chest/shoulders, core
 * and quads; back carries upper back, hamstrings and calves.
 *
 * Not an anatomical render — COROS's own muscle heatmap is proprietary art
 * this app has no path to reproduce — but the shape reads as a body and each
 * region sits where that muscle actually is.
 */

type Fig = { region: MuscleRegion; view: "front" | "back"; d: string };

// Each figure has its own local viewBox (0 0 90 210), rendered side by side.
// Front: chest/shoulders (upper torso), core (mid torso), quads (upper legs).
// Back: upper back (upper torso), hamstrings (upper legs), calves (lower legs).
const REGIONS: Fig[] = [
  {
    region: "chest_shoulders",
    view: "front",
    d: "M 26 32 Q 16 36 14 50 L 18 68 Q 32 76 45 76 Q 58 76 72 68 L 76 50 Q 74 36 64 32 Q 55 26 45 26 Q 35 26 26 32 Z",
  },
  {
    region: "core",
    view: "front",
    d: "M 30 79 Q 45 84 60 79 L 58 116 Q 45 122 32 116 Z",
  },
  {
    region: "quads",
    view: "front",
    d: "M 28 128 L 43 128 L 41 176 L 28 178 Z M 47 128 L 62 128 L 62 178 L 49 176 Z",
  },
  {
    region: "upper_back",
    view: "back",
    d: "M 26 28 Q 16 34 15 50 L 19 70 Q 32 78 45 78 Q 58 78 71 70 L 75 50 Q 74 34 64 28 Q 55 24 45 24 Q 35 24 26 28 Z M 45 30 L 45 74",
  },
  {
    region: "hamstrings",
    view: "back",
    d: "M 27 128 L 43 128 L 42 168 L 28 170 Z M 47 128 L 63 128 L 62 170 L 48 168 Z",
  },
  {
    region: "calves",
    view: "back",
    d: "M 29 172 L 41 171 L 39 202 L 30 202 Z M 49 171 L 61 172 L 60 202 L 51 202 Z",
  },
];

// Front calves and back quads have no clickable region of their own (no
// "front calf" or "back quad" pattern exists), so they are drawn as a plain
// undifferentiated leg continuation — just enough that neither figure ends
// at the knee.
const FRONT_CALF_FILLER =
  "M 28 178 L 41 176 L 40 202 L 29 202 Z M 49 176 L 62 178 L 61 202 L 50 202 Z";
const BACK_QUAD_FILLER =
  "M 27 128 L 43 128 L 42 168 L 27 170 Z M 47 128 L 63 128 L 63 170 L 48 168 Z";

function Figure({
  view,
  selected,
  underTrained,
  onSelect,
}: {
  view: "front" | "back";
  selected: MuscleRegion | null;
  underTrained: Set<MuscleRegion>;
  onSelect: (region: MuscleRegion) => void;
}) {
  const regions = REGIONS.filter((r) => r.view === view);
  return (
    <svg viewBox="0 0 90 210" className="h-[220px] w-[94px] shrink-0" role="presentation">
      <circle cx={45} cy={14} r={11} fill="var(--line)" />
      <rect x={40} y={23} width={10} height={8} fill="var(--line)" />
      {view === "front" && (
        <path d={FRONT_CALF_FILLER} fill="var(--line)" opacity={0.5} />
      )}
      {view === "back" && <path d={BACK_QUAD_FILLER} fill="var(--line)" opacity={0.5} />}

      {regions.map(({ region, d }) => {
        const isSelected = selected === region;
        const isGap = underTrained.has(region);
        return (
          <path
            key={region}
            d={d}
            role="button"
            tabIndex={0}
            aria-label={`${region.replace("_", " ")}${isGap ? ", under-trained" : ""}`}
            aria-pressed={isSelected}
            onClick={() => onSelect(region)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(region);
              }
            }}
            className="cursor-pointer outline-none transition-colors focus-visible:stroke-[var(--foreground)] focus-visible:stroke-2"
            fill={
              isSelected
                ? "var(--brand)"
                : isGap
                  ? "rgba(251,191,36,0.6)"
                  : "rgba(34,211,238,0.4)"
            }
            stroke={isSelected ? "var(--brand-strong)" : "var(--line)"}
            strokeWidth={isSelected ? 1.5 : 0.75}
          />
        );
      })}
    </svg>
  );
}

export function MuscleSilhouette({
  selected,
  underTrained,
  onSelect,
}: {
  selected: MuscleRegion | null;
  underTrained: MuscleRegion[];
  onSelect: (region: MuscleRegion) => void;
}) {
  const underSet = new Set(underTrained);
  return (
    <div
      className="flex items-end gap-3"
      role="group"
      aria-label="Muscle regions, front and back — select one to see recent training and a tip"
    >
      <div className="flex flex-col items-center gap-1">
        <Figure view="front" selected={selected} underTrained={underSet} onSelect={onSelect} />
        <span className="text-[10px] text-muted">Front</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <Figure view="back" selected={selected} underTrained={underSet} onSelect={onSelect} />
        <span className="text-[10px] text-muted">Back</span>
      </div>
    </div>
  );
}
