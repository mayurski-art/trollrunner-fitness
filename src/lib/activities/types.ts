export type ActivityType = "run" | "strength" | "other";

export type StrengthSet = {
  id?: string;
  exercise: string;
  weightLb: string;
  reps: string;
};

export type Activity = {
  id: string;
  type: ActivityType;
  title: string;
  notes: string;
  occurredAt: string;
  distanceMi: number | null;
  durationSec: number | null;
  elevationFt: number | null;
  effort: number | null;
  sets: { exercise: string; weight_lb: number | null; reps: number | null }[];
};

export type NewRunActivity = {
  type: "run";
  title: string;
  occurredAt: string;
  distanceMi: string;
  durationMin: string;
  elevationFt: string;
  effort: number | null;
  notes: string;
};

export type NewStrengthActivity = {
  type: "strength";
  title: string;
  occurredAt: string;
  effort: number | null;
  notes: string;
  sets: StrengthSet[];
};

/**
 * Cross-training — cycling, swimming, rowing. Distance is recorded but is NOT
 * running mileage, so anything that reasons about run volume must filter on
 * type rather than summing distance across every activity.
 */
export type NewOtherActivity = {
  type: "other";
  title: string;
  occurredAt: string;
  distanceMi: string;
  durationMin: string;
  effort: number | null;
  notes: string;
};
