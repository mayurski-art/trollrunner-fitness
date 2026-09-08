// Best-effort exercise-name -> muscle-group classifier. Real logged names
// are whatever the user (or the workout-paste parser) wrote — "Hack squat",
// "Prone leg curls", "Hammer Curl (Cross Body)" — so this is keyword
// matching, not a lookup table. Order matters: earlier groups are checked
// first so a specific term ("leg curl", "upright row") is claimed before a
// more generic one downstream ("curl" -> Biceps, "row" -> Back) can grab it.

export const MUSCLE_GROUPS = ["Core", "Legs", "Chest", "Shoulders", "Back", "Triceps", "Biceps"] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

const PATTERNS: { group: MuscleGroup; test: RegExp }[] = [
  { group: "Core", test: /plank|crunch|sit-?up|ab wheel|russian twist|leg raise|\bcore\b|abdominal/i },
  { group: "Legs", test: /squat|leg press|leg curl|leg extension|lunge|calf|hamstring|quad|hack squat|glute|hip thrust|step-?up/i },
  { group: "Chest", test: /bench|chest|\bpec\b|\bfly\b|flye|push-?up|\bdip\b/i },
  { group: "Shoulders", test: /shoulder|overhead press|military press|lateral raise|front raise|\bdelt|arnold press|upright row/i },
  { group: "Back", test: /\brow\b|pull-?up|lat pulldown|\blat\b|deadlift|shrug|back extension/i },
  { group: "Triceps", test: /tricep|skull-?crusher|pushdown|kickback|close-?grip/i },
  { group: "Biceps", test: /bicep|curl/i },
];

/** Returns null for a name that doesn't match any known pattern (e.g. a novel machine name). */
export function classifyExercise(exerciseName: string): MuscleGroup | null {
  for (const { group, test } of PATTERNS) {
    if (test.test(exerciseName)) return group;
  }
  return null;
}
