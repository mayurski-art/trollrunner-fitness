/**
 * Aerobic-base context from the user's COROS training-status screens.
 *
 * These are BLOCK-LEVEL facts about a 16-week training period — the zone
 * distribution across 328 mi and the base-fitness trend — not per-run data.
 * They stay meaningful even once individual runs are logged on top of them,
 * because no single run tells you how a whole block was distributed.
 *
 * Manual transcription of numbers the user read off their own device. Not
 * wearable sync (CLAUDE.md hard rule 1) and not a live feed: this is a
 * snapshot, stamped with the date it was taken, and it ages.
 */

export type Zone = {
  name: string;
  miles: number;
  /** Share of block mileage, 0-100 as reported by COROS. */
  pct: number;
  /** What this zone develops, in one line. */
  develops: string;
};

export type AerobicBaseSnapshot = {
  /** When these figures were read off the device. */
  capturedOn: string;
  rangeLabel: string;
  totalDistanceMi: number;
  activities: number;
  totalLoad: number;
  avgHeartRateBpm: number;
  trainingFocus: string;
  /** COROS 7-day training load at capture. */
  sevenDayLoad: number;
  loadImpact: number;
  baseFitness: number;
  /** Intensity trend as a percentage; 100-149 is COROS "Optimized". */
  intensityTrendPct: number;
  intensityLabel: string;
  /** Average pace across all logged running, mm'ss"/mi. */
  avgPace: string;
  totalDurationLabel: string;
  zones: Zone[];
};

/**
 * RUN-ONLY figures for the 2026 year to date. An earlier version of this file
 * used the "All Activities" screen, which folds cycling and everything else
 * into the same totals; these numbers are filtered to running, so the zone
 * distribution actually describes running. The two readings agree closely
 * (58/41 here vs 61/39 all-activity), which is what makes the intensity
 * finding below trustworthy rather than an artefact of mixed modalities.
 */
export const AEROBIC_BASE: AerobicBaseSnapshot = {
  capturedOn: "2026-09-03",
  rangeLabel: "2026 year to date (runs only)",
  totalDistanceMi: 468.72,
  activities: 115,
  totalLoad: 12052,
  avgHeartRateBpm: 143,
  trainingFocus: "Aerobic Endurance",
  sevenDayLoad: 617,
  loadImpact: 76,
  baseFitness: 74,
  intensityTrendPct: 102,
  intensityLabel: "Optimized",
  /** Average pace across all logged running, mm'ss"/mi. */
  avgPace: "11'49\"/mi",
  totalDurationLabel: "92h 21min",
  zones: [
    { name: "Recovery", miles: 113.77, pct: 24, develops: "Active recovery and aerobic volume at minimal cost." },
    { name: "Aerobic Endurance", miles: 160.77, pct: 34, develops: "The aerobic engine — mitochondrial density and fat oxidation." },
    { name: "Aerobic Power", miles: 36.08, pct: 8, develops: "Sustained aerobic output near the top of the aerobic range." },
    { name: "Threshold", miles: 87.85, pct: 19, develops: "Lactate clearance — the pace you can hold for about an hour." },
    { name: "Anaerobic Endurance", miles: 53.55, pct: 11, develops: "Tolerance to high-intensity work and repeatability." },
    { name: "Anaerobic Power", miles: 16.7, pct: 4, develops: "Top-end speed and neuromuscular power." },
  ],
};

/** Easy (recovery + aerobic endurance) vs everything harder. */
export function easyHardSplit(s: AerobicBaseSnapshot = AEROBIC_BASE): {
  easyPct: number;
  hardPct: number;
} {
  const easy = s.zones
    .filter((z) => z.name === "Recovery" || z.name === "Aerobic Endurance")
    .reduce((n, z) => n + z.pct, 0);
  return { easyPct: easy, hardPct: 100 - easy };
}

export type BaseInsight = {
  title: string;
  detail: string;
  tone: "good" | "warning" | "info";
};

/**
 * Reads the zone distribution against the polarised-training guideline: roughly
 * 80% of volume easy, 20% hard. Deviations in either direction have a specific
 * cost, so the wording says which one applies rather than just "unbalanced".
 */
export function aerobicBaseInsights(
  s: AerobicBaseSnapshot = AEROBIC_BASE
): BaseInsight[] {
  const out: BaseInsight[] = [];
  const { easyPct, hardPct } = easyHardSplit(s);

  if (easyPct < 75) {
    out.push({
      title: "Too much of your mileage is hard",
      detail: `${easyPct}% of your running is easy against the ~80% a polarised plan wants, with ${hardPct}% at threshold or above. For an endurance goal this is the single highest-leverage thing to change: that much intensity keeps you tired enough that the easy volume — which is what actually grows the aerobic engine — never accumulates. It also means the lifting never gets recovered for. Slow the easy runs down rather than cutting the hard ones; the weekly long run is where endurance is built, and it only works if you arrive fresh.`,
      tone: "warning",
    });
  } else if (easyPct > 90) {
    out.push({
      title: "Almost everything is easy",
      detail: `${easyPct}% of the block was easy. That builds a base safely, but with only ${hardPct}% hard there is little stimulus for threshold or speed. One quality session a week is enough to change that.`,
      tone: "info",
    });
  } else {
    out.push({
      title: "Intensity distribution looks right",
      detail: `${easyPct}% easy against ${hardPct}% hard is close to the polarised ~80/20 guideline. Keep the easy days honestly easy and this holds.`,
      tone: "good",
    });
  }

  if (s.intensityTrendPct >= 100 && s.intensityTrendPct < 150) {
    out.push({
      title: `Base fitness is climbing (${s.intensityLabel})`,
      detail: `Intensity trend at ${s.intensityTrendPct}% with base fitness ${s.baseFitness} and load impact ${s.loadImpact} — productive training that is still building rather than digging a hole. This is the window where adding structured lifting costs you the least.`,
      tone: "good",
    });
  } else if (s.intensityTrendPct >= 150) {
    out.push({
      title: "Training load is running hot",
      detail: `Intensity trend at ${s.intensityTrendPct}% is in the excessive band. Hold volume steady and let base fitness catch up before adding lifting volume on top.`,
      tone: "warning",
    });
  }

  return out;
}

/** Days since the snapshot was taken — it is a point-in-time reading. */
export function snapshotAgeDays(
  s: AerobicBaseSnapshot = AEROBIC_BASE,
  now: Date = new Date()
): number {
  const captured = new Date(`${s.capturedOn}T00:00:00Z`);
  return Math.max(
    0,
    Math.floor((now.getTime() - captured.getTime()) / (24 * 60 * 60 * 1000))
  );
}
