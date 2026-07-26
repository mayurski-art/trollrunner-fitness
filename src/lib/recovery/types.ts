export type RecoveryLog = {
  logDate: string; // YYYY-MM-DD
  sleepHours: number | null;
  soreness: number | null; // 1 (none) - 5 (severe)
  stress: number | null; // 1 (low) - 5 (severe)
  notes: string;
};

export type NewRecoveryLog = {
  sleepHours: string;
  soreness: number | null;
  stress: number | null;
  notes: string;
};
