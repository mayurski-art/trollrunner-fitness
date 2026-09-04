export type WeightLog = {
  id: string;
  loggedAt: string; // ISO timestamp
  weightLb: number;
};

export type NewWeightLog = {
  weightLb: string;
};
