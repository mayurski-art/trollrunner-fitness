// Individual runs, Aug-Sep 2026, dictated by the user from their COROS history.
//
// These are REAL per-run records — actual date, distance and duration — unlike
// the weekly-summary rows in run-backlog.ts. They unlock run frequency, pace
// and race predictions, none of which a weekly total can support.
//
// The weekly summaries stay in place as block-level context (the base-fitness
// climb and the zone distribution in lib/coach/aerobic-base.ts). To avoid
// double-counting mileage, any summary week fully covered by detailed runs is
// listed in SUPERSEDED_SUMMARY_WEEKS and removed at import time.

export type DetailedRun = {
  /** YYYY-MM-DD, the day of the run. */
  date: string;
  distanceMi: string;
  /** Total moving time in minutes, one decimal place. */
  durationMin: string;
  elevationFt: string;
  avgHeartRate?: number;
  /** COROS training load for the session. */
  trainingLoad?: number;
  calories?: number;
  /**
   * Overrides the default "<distance> mi run" title. Set it when the session
   * was not a run — a treadmill walk logged as a "run" would misrepresent both
   * the feed and the pace-derived numbers.
   */
  title?: string;
  notes: string;
};

/** mm:ss per mile -> total minutes for a distance, so paces stay readable below. */
function fromPace(distanceMi: number, paceMin: number, paceSec: number): string {
  return ((paceMin + paceSec / 60) * distanceMi).toFixed(1);
}

export const DETAILED_RUNS: DetailedRun[] = [
  {
    date: "2026-08-01",
    distanceMi: "11",
    durationMin: fromPace(11, 9, 32),
    elevationFt: "",
    avgHeartRate: 173,
    trainingLoad: 422,
    calories: 1750,
    notes: "9:32/mi average. 100% efficiency, training load 422, 1750 cal.",
  },
  {
    date: "2026-08-03",
    distanceMi: "0.46",
    durationMin: fromPace(0.46, 24, 15),
    elevationFt: "",
    avgHeartRate: 111,
    trainingLoad: 5,
    calories: 68,
    title: "Indoor run",
    notes:
      "Indoor treadmill run. 24:15/mi average, training load 5, 68 cal.",
  },
  {
    date: "2026-08-05",
    distanceMi: "4",
    durationMin: fromPace(4, 11, 7),
    elevationFt: "",
    avgHeartRate: 151,
    trainingLoad: 97,
    calories: 846,
    notes: "11:07/mi average. 98% efficiency, training load 97, 846 cal.",
  },
  {
    date: "2026-08-06",
    distanceMi: "1.54",
    durationMin: fromPace(1.54, 20, 0),
    elevationFt: "",
    avgHeartRate: 132,
    trainingLoad: 30,
    calories: 257,
    title: "Indoor run",
    notes:
      "Indoor run, 6% average incline. 20:00/mi average, training load 30, 257 cal.",
  },
  {
    date: "2026-08-07",
    distanceMi: "1.42",
    durationMin: fromPace(1.42, 20, 0),
    elevationFt: "",
    avgHeartRate: 127,
    trainingLoad: 22,
    calories: 222,
    title: "Indoor run",
    notes:
      "Indoor run, 6% average grade. 20:00/mi average, training load 22, 222 cal.",
  },
  {
    date: "2026-08-08",
    distanceMi: "8.2",
    durationMin: fromPace(8.2, 9, 22),
    elevationFt: "",
    avgHeartRate: 177,
    trainingLoad: 370,
    calories: 1333,
    notes: "9:22/mi average. 100% efficiency, training load 370, 1333 cal.",
  },
  {
    date: "2026-08-10",
    distanceMi: "4.09",
    durationMin: fromPace(4.09, 12, 44),
    elevationFt: "",
    avgHeartRate: 134,
    trainingLoad: 57,
    calories: 583,
    notes: "12:44/mi average. 96% efficiency, training load 57, 583 cal.",
  },
  {
    date: "2026-08-11",
    distanceMi: "1.53",
    durationMin: fromPace(1.53, 20, 0),
    elevationFt: "",
    avgHeartRate: 124,
    trainingLoad: 22,
    calories: 231,
    title: "Indoor run",
    notes:
      "Indoor run, 6% average grade. 20:00/mi average, training load 22, 231 cal.",
  },
  {
    date: "2026-08-12",
    distanceMi: "4.67",
    durationMin: fromPace(4.67, 11, 35),
    elevationFt: "",
    avgHeartRate: 142,
    trainingLoad: 78,
    calories: 662,
    notes: "11:35/mi average. 100% efficiency, training load 78, 662 cal.",
  },
  {
    date: "2026-08-14",
    distanceMi: "2.04",
    durationMin: fromPace(2.04, 19, 34),
    elevationFt: "",
    avgHeartRate: 131,
    trainingLoad: 36,
    calories: 325,
    title: "Indoor run",
    notes:
      "Indoor run, 6% average grade. 19:34/mi average, training load 36, 325 cal.",
  },
  {
    date: "2026-08-15",
    distanceMi: "10.05",
    durationMin: fromPace(10.05, 9, 11),
    elevationFt: "",
    avgHeartRate: 167,
    trainingLoad: 320,
    calories: 1455,
    notes: "9:11/mi average. 102% efficiency, training load 320, 1455 cal.",
  },
  {
    date: "2026-08-17",
    distanceMi: "3.45",
    durationMin: fromPace(3.45, 11, 14),
    elevationFt: "",
    avgHeartRate: 141,
    trainingLoad: 52,
    calories: 466,
    notes: "11:14/mi average. 100% efficiency, training load 52, 466 cal.",
  },
  {
    date: "2026-08-18",
    distanceMi: "1.04",
    durationMin: fromPace(1.04, 10, 50),
    elevationFt: "",
    avgHeartRate: 139,
    trainingLoad: 24,
    calories: 133,
    notes:
      "Short outdoor run. 10:50/mi average, 108% efficiency, training load 24, 133 cal.",
  },
  {
    date: "2026-08-21",
    distanceMi: "2.01",
    durationMin: fromPace(2.01, 20, 0),
    elevationFt: "",
    avgHeartRate: 117,
    trainingLoad: 21,
    calories: 271,
    title: "Indoor run",
    notes:
      "Indoor run, 6% average grade. 20:00/mi average, training load 21, 271 cal.",
  },
  {
    date: "2026-08-22",
    distanceMi: "0.86",
    durationMin: fromPace(0.86, 11, 40),
    elevationFt: "",
    avgHeartRate: 138,
    trainingLoad: 13,
    calories: 119,
    notes: "11:40/mi average. 100% efficiency, training load 13, 119 cal.",
  },
];

/**
 * Weeks (Monday date) whose weekly-summary row is fully replaced by the
 * detailed runs above. The importer deletes these so mileage is not counted
 * twice. A week only belongs here once its runs are all entered.
 */
export const SUPERSEDED_SUMMARY_WEEKS: string[] = [];

export const DETAILED_RUNS_TOTAL_MI =
  Math.round(DETAILED_RUNS.reduce((n, r) => n + Number(r.distanceMi), 0) * 10) / 10;

export type CrossTraining = {
  date: string;
  title: string;
  distanceMi: string;
  durationMin: string;
  avgHeartRate?: number;
  trainingLoad?: number;
  calories?: number;
  notes: string;
};

/**
 * Cycling and other non-running aerobic work. Kept separate from DETAILED_RUNS
 * and imported as type 'other', so the distance contributes aerobic volume and
 * training load without ever being counted as running mileage.
 */
export const CROSS_TRAINING: CrossTraining[] = [
  {
    date: "2026-08-19",
    title: "Indoor bike",
    distanceMi: "9.77",
    durationMin: (9.77 / 8.7 * 60).toFixed(1),
    avgHeartRate: 118,
    trainingLoad: 38,
    calories: 456,
    notes: "Indoor cycling. 8.7 mph average, training load 38, 456 cal.",
  },
];
