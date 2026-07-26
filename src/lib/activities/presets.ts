export const RUN_DISTANCE_PRESETS = [
  { label: "1 mi", value: "1" },
  { label: "5K", value: "3.1" },
  { label: "5 mi", value: "5" },
  { label: "10K", value: "6.2" },
  { label: "10 mi", value: "10" },
  { label: "Half", value: "13.1" },
  { label: "Marathon", value: "26.2" },
] as const;

export const STRENGTH_EXERCISE_PRESETS = [
  "Squat",
  "Bench Press",
  "Deadlift",
  "Overhead Press",
  "Pull-up",
  "Push-up",
  "Row",
  "Lunge",
] as const;
