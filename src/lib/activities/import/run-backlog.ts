// Activity backlog, May 18 - Sep 6 2026, transcribed from the user's COROS
// "16 Weeks / All Activities" summary screen.
//
// IMPORTANT — what this is and is not:
// The COROS screen reports WEEKLY TOTALS across ALL ACTIVITIES — running,
// cycling, everything — not individual runs and not running alone. It shows 79
// activities over the 16 weeks, but the per-activity dates, distances and
// durations were never available, so inventing 79 rows would be fabricating
// data. Each row below is therefore ONE summary activity representing a whole
// week of total training volume.
//
// Because these mix modalities, a week's summary total will exceed the sum of
// that week's individual RUNS — the difference is cycling and other work, not
// missing runs. Do not treat a shortfall against these numbers as a data gap.
//
// This is NOT wearable sync (CLAUDE.md hard rule 1 — no OAuth/API connector to
// COROS or anything else). It is a one-off manual transcription of numbers the
// user read off their own screen. Going forward the user logs daily in-app.
//
// Distances came from measuring the chart's bar pixels against the axis: the
// baseline sits at y=1340.5 and the 20.51 mi average line at y=1208, giving
// 6.46 px/mi. The measured bars summed to 322.6 mi against a reported 328.10,
// so every week is scaled by 328.10/322.6 to reconcile with the stated total.
// That makes individual weeks accurate to roughly +/- 0.5 mi.

export type BacklogRun = {
  /** Monday of the week this row summarises, YYYY-MM-DD. */
  date: string;
  title: string;
  notes: string;
  distanceMi: string;
  durationMin: string;
  elevationFt: string;
};

/** Reported totals from the COROS summary, used to derive per-week values. */
export const COROS_SUMMARY = {
  rangeLabel: "May 18 – Sep 6, 2026",
  totalDistanceMi: 328.1,
  totalDurationMin: 68 * 60 + 13,
  totalElevationFt: 32218,
  activities: 79,
  totalLoad: 7906,
  avgWeeklyMi: 20.51,
  avgHeartRateBpm: 136,
} as const;

/** Weekly distances read off the bar chart, already reconciled to the total. */
const WEEKLY_MI = [
  20.2, 15.0, 16.1, 19.6, 15.5, 21.6, 21.2, 19.3, 23.1, 17.6, 21.5, 16.9, 22.9,
  35.3, 23.7, 18.5,
];

const WEEK_ONE_START = "2026-05-18";

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Duration and elevation are apportioned by each week's share of total
 * distance — the screen only reports them as 16-week totals. Pace therefore
 * comes out flat across weeks, which is why these rows deliberately do not
 * feed race predictions (see the note in the import UI).
 */
export const RUN_BACKLOG: BacklogRun[] = WEEKLY_MI.map((mi, i) => {
  const share = mi / COROS_SUMMARY.totalDistanceMi;
  const minutes = Math.round(COROS_SUMMARY.totalDurationMin * share);
  const elevation = Math.round(COROS_SUMMARY.totalElevationFt * share);
  const weekStart = addDays(WEEK_ONE_START, i * 7);
  return {
    date: weekStart,
    title: `Week of ${weekStart} — training total`,
    notes: `Weekly all-activity summary from COROS (${COROS_SUMMARY.rangeLabel}). Distance read from the weekly chart; time and elevation apportioned from the 16-week totals. Not a single session, and not running alone — this row stands for the whole week's training volume across every activity type.`,
    distanceMi: mi.toFixed(1),
    durationMin: String(minutes),
    elevationFt: String(elevation),
  };
});

export const RUN_BACKLOG_TOTAL_MI =
  Math.round(WEEKLY_MI.reduce((a, b) => a + b, 0) * 10) / 10;
