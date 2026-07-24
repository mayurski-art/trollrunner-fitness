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
  sets: { exercise: string; weight_lb: number | null; reps: number | null }[];
};

export type NewRunActivity = {
  type: "run";
  title: string;
  occurredAt: string;
  distanceMi: string;
  durationMin: string;
  elevationFt: string;
  notes: string;
};

export type NewStrengthActivity = {
  type: "strength";
  title: string;
  occurredAt: string;
  notes: string;
  sets: StrengthSet[];
};
