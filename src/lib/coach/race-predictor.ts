import type { Activity } from "@/lib/activities/types";

const RACE_DISTANCES = [
  { key: "5K", mi: 3.107 },
  { key: "10K", mi: 6.214 },
  { key: "Half marathon", mi: 13.109 },
  { key: "Marathon", mi: 26.219 },
] as const;

export type RacePrediction = { label: string; timeSec: number; pace: string };

/** Riegel's formula: T2 = T1 × (D2/D1)^1.06 */
function riegel(fromMi: number, fromSec: number, toMi: number): number {
  return fromSec * Math.pow(toMi / fromMi, 1.06);
}

function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatPace(secPerMi: number): string {
  const m = Math.floor(secPerMi / 60);
  const s = Math.round(secPerMi % 60);
  return `${m}:${String(s).padStart(2, "0")}/mi`;
}

/** The fastest-paced run with both distance and duration logged, ≥1 mile, last 120 days. */
function bestReferenceRun(activities: Activity[]): { mi: number; sec: number } | null {
  const cutoff = Date.now() - 120 * 24 * 60 * 60 * 1000;
  const candidates = activities.filter(
    (a) =>
      a.type === "run" &&
      a.distanceMi &&
      a.distanceMi >= 1 &&
      a.durationSec &&
      new Date(a.occurredAt).getTime() >= cutoff
  );
  if (!candidates.length) return null;
  const best = candidates.reduce((a, b) =>
    a.durationSec! / a.distanceMi! < b.durationSec! / b.distanceMi! ? a : b
  );
  return { mi: best.distanceMi!, sec: best.durationSec! };
}

export function predictRaceTimes(activities: Activity[]): RacePrediction[] | null {
  const ref = bestReferenceRun(activities);
  if (!ref) return null;
  return RACE_DISTANCES.map((d) => {
    const timeSec = riegel(ref.mi, ref.sec, d.mi);
    return {
      label: d.key,
      timeSec: Math.round(timeSec),
      pace: formatPace(timeSec / d.mi),
    };
  });
}

export { formatTime };
