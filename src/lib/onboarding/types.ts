export type Units = "imperial" | "metric";

export type PersonalInfo = {
  units: Units;
  age: string;
  sex: string;
  /** Inches if units === "imperial", centimeters if "metric". */
  height: string;
  /** Pounds if units === "imperial", kilograms if "metric". */
  weight: string;
  bodyFatPct: string;
  country: string;
  occupation: string;
  experienceLevel: string;
};

export type RunningInfo = {
  longestRunMi: string;
  weeklyMileage: string;
  weeklyRuns: string;
  easyPace: string;
  fiveKPr: string;
  tenKPr: string;
  halfPr: string;
  marathonPr: string;
  trailRunning: boolean;
  trackExperience: boolean;
};

export type StrengthInfo = {
  yearsLifting: string;
  split: string;
  squat: string;
  bench: string;
  deadlift: string;
  overheadPress: string;
  pullUps: string;
  pushUps: string;
  plankSeconds: string;
  favoriteExercises: string;
  leastFavoriteExercises: string;
};

export type EquipmentInfo = {
  items: string[];
};

export type LifestyleInfo = {
  sleepHours: string;
  stressLevel: string;
  waterIntake: string;
  alcohol: string;
  smoking: string;
  dailySteps: string;
  trainingDaysPerWeek: string;
  workoutDurationMin: string;
  recoveryHabits: string;
};

export type NutritionInfo = {
  diet: string;
  allergies: string;
  preferences: string;
  calorieTracking: boolean;
  macroTracking: boolean;
};

export type MedicalInfo = {
  previousInjuries: string;
  surgeries: string;
  conditions: string[];
  medications: string;
  limitations: string;
};

export type OnboardingDraft = {
  goals: string[];
  targetDate: string;
  personal: PersonalInfo;
  running: RunningInfo;
  strength: StrengthInfo;
  equipment: EquipmentInfo;
  lifestyle: LifestyleInfo;
  nutrition: NutritionInfo;
  medical: MedicalInfo;
  ethnicity: string;
};

export const EMPTY_DRAFT: OnboardingDraft = {
  goals: [],
  targetDate: "",
  personal: {
    units: "imperial",
    age: "",
    sex: "",
    height: "",
    weight: "",
    bodyFatPct: "",
    country: "",
    occupation: "",
    experienceLevel: "",
  },
  running: {
    longestRunMi: "",
    weeklyMileage: "",
    weeklyRuns: "",
    easyPace: "",
    fiveKPr: "",
    tenKPr: "",
    halfPr: "",
    marathonPr: "",
    trailRunning: false,
    trackExperience: false,
  },
  strength: {
    yearsLifting: "",
    split: "",
    squat: "",
    bench: "",
    deadlift: "",
    overheadPress: "",
    pullUps: "",
    pushUps: "",
    plankSeconds: "",
    favoriteExercises: "",
    leastFavoriteExercises: "",
  },
  equipment: { items: [] },
  lifestyle: {
    sleepHours: "",
    stressLevel: "",
    waterIntake: "",
    alcohol: "",
    smoking: "",
    dailySteps: "",
    trainingDaysPerWeek: "",
    workoutDurationMin: "",
    recoveryHabits: "",
  },
  nutrition: {
    diet: "",
    allergies: "",
    preferences: "",
    calorieTracking: false,
    macroTracking: false,
  },
  medical: {
    previousInjuries: "",
    surgeries: "",
    conditions: [],
    medications: "",
    limitations: "",
  },
  ethnicity: "",
};
