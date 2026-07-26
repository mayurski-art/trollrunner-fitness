export type ProgramExercise = { name: string; sets: number; reps: string };
export type ProgramDay = { day: string; focus: string; exercises: ProgramExercise[] };
export type Program = { split: string; description: string; days: ProgramDay[] };

const FULL_BODY: Program = {
  split: "Full body",
  description: "3 sessions/week, every major muscle group each time — great default for beginners.",
  days: [
    {
      day: "Day A",
      focus: "Full body",
      exercises: [
        { name: "Squat", sets: 3, reps: "5-8" },
        { name: "Bench Press", sets: 3, reps: "5-8" },
        { name: "Row", sets: 3, reps: "8-12" },
        { name: "Plank", sets: 3, reps: "30-45s" },
      ],
    },
    {
      day: "Day B",
      focus: "Full body",
      exercises: [
        { name: "Deadlift", sets: 3, reps: "5-6" },
        { name: "Overhead Press", sets: 3, reps: "6-10" },
        { name: "Pull-up", sets: 3, reps: "6-10" },
        { name: "Lunge", sets: 3, reps: "10-12" },
      ],
    },
    {
      day: "Day C",
      focus: "Full body",
      exercises: [
        { name: "Squat", sets: 3, reps: "8-10" },
        { name: "Push-up", sets: 3, reps: "10-15" },
        { name: "Row", sets: 3, reps: "10-12" },
        { name: "Plank", sets: 3, reps: "30-45s" },
      ],
    },
  ],
};

const UPPER_LOWER: Program = {
  split: "Upper / lower",
  description: "4 sessions/week alternating upper and lower body.",
  days: [
    {
      day: "Upper A",
      focus: "Upper body",
      exercises: [
        { name: "Bench Press", sets: 4, reps: "6-8" },
        { name: "Row", sets: 4, reps: "8-10" },
        { name: "Overhead Press", sets: 3, reps: "8-10" },
        { name: "Pull-up", sets: 3, reps: "6-10" },
      ],
    },
    {
      day: "Lower A",
      focus: "Lower body",
      exercises: [
        { name: "Squat", sets: 4, reps: "5-8" },
        { name: "Deadlift", sets: 3, reps: "5-6" },
        { name: "Lunge", sets: 3, reps: "10-12" },
        { name: "Plank", sets: 3, reps: "30-45s" },
      ],
    },
    {
      day: "Upper B",
      focus: "Upper body",
      exercises: [
        { name: "Overhead Press", sets: 4, reps: "6-8" },
        { name: "Pull-up", sets: 4, reps: "6-10" },
        { name: "Bench Press", sets: 3, reps: "8-10" },
        { name: "Row", sets: 3, reps: "10-12" },
      ],
    },
    {
      day: "Lower B",
      focus: "Lower body",
      exercises: [
        { name: "Deadlift", sets: 4, reps: "5-6" },
        { name: "Squat", sets: 3, reps: "8-10" },
        { name: "Lunge", sets: 3, reps: "10-12" },
      ],
    },
  ],
};

const PPL: Program = {
  split: "Push / pull / legs",
  description: "3-6 sessions/week rotating push, pull, and legs.",
  days: [
    {
      day: "Push",
      focus: "Chest, shoulders, triceps",
      exercises: [
        { name: "Bench Press", sets: 4, reps: "6-10" },
        { name: "Overhead Press", sets: 3, reps: "8-10" },
        { name: "Push-up", sets: 3, reps: "10-15" },
      ],
    },
    {
      day: "Pull",
      focus: "Back, biceps",
      exercises: [
        { name: "Deadlift", sets: 3, reps: "5-6" },
        { name: "Row", sets: 4, reps: "8-10" },
        { name: "Pull-up", sets: 3, reps: "6-10" },
      ],
    },
    {
      day: "Legs",
      focus: "Quads, hamstrings, glutes",
      exercises: [
        { name: "Squat", sets: 4, reps: "6-8" },
        { name: "Lunge", sets: 3, reps: "10-12" },
        { name: "Plank", sets: 3, reps: "30-45s" },
      ],
    },
  ],
};

const POWERLIFTING: Program = {
  split: "Powerlifting",
  description: "4 sessions/week built around the big three + accessories.",
  days: [
    {
      day: "Squat day",
      focus: "Squat-focused",
      exercises: [
        { name: "Squat", sets: 5, reps: "3-5" },
        { name: "Lunge", sets: 3, reps: "8-10" },
        { name: "Plank", sets: 3, reps: "45-60s" },
      ],
    },
    {
      day: "Bench day",
      focus: "Bench-focused",
      exercises: [
        { name: "Bench Press", sets: 5, reps: "3-5" },
        { name: "Overhead Press", sets: 3, reps: "6-8" },
        { name: "Row", sets: 3, reps: "8-10" },
      ],
    },
    {
      day: "Deadlift day",
      focus: "Deadlift-focused",
      exercises: [
        { name: "Deadlift", sets: 5, reps: "3-5" },
        { name: "Row", sets: 3, reps: "8-10" },
        { name: "Pull-up", sets: 3, reps: "6-10" },
      ],
    },
    {
      day: "Accessory day",
      focus: "Light technique + accessories",
      exercises: [
        { name: "Squat", sets: 3, reps: "8-10" },
        { name: "Bench Press", sets: 3, reps: "8-10" },
        { name: "Push-up", sets: 3, reps: "10-15" },
      ],
    },
  ],
};

const RUNNING_STRENGTH: Program = {
  split: "Running strength",
  description: "2-3 sessions/week — durability and injury prevention, not hypertrophy.",
  days: [
    {
      day: "Day A",
      focus: "Posterior chain + core",
      exercises: [
        { name: "Deadlift", sets: 3, reps: "6-8" },
        { name: "Lunge", sets: 3, reps: "10-12" },
        { name: "Plank", sets: 3, reps: "45-60s" },
      ],
    },
    {
      day: "Day B",
      focus: "Upper body + core",
      exercises: [
        { name: "Push-up", sets: 3, reps: "10-15" },
        { name: "Row", sets: 3, reps: "10-12" },
        { name: "Plank", sets: 3, reps: "45-60s" },
      ],
    },
  ],
};

const PROGRAMS: Record<string, Program> = {
  "Full body": FULL_BODY,
  "Upper / lower": UPPER_LOWER,
  "Push / pull / legs": PPL,
  Powerlifting: POWERLIFTING,
  "Running strength": RUNNING_STRENGTH,
};

/** Splits without a dedicated template fall back to Full body, documented in the UI. */
export function programFor(split: string | null): Program {
  return PROGRAMS[split || ""] || FULL_BODY;
}

export const AVAILABLE_SPLITS = Object.keys(PROGRAMS);
