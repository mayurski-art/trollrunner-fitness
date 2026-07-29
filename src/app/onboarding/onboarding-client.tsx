"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/accounts/session-context";
import { submitOnboarding } from "@/lib/onboarding/api";
import { EMPTY_DRAFT, type OnboardingDraft } from "@/lib/onboarding/types";
import {
  ALCOHOL_LEVELS,
  DIET_OPTIONS,
  EQUIPMENT_OPTIONS,
  EXPERIENCE_LEVELS,
  GOALS,
  MEDICAL_CONDITIONS,
  SMOKING_LEVELS,
  STRENGTH_SPLITS,
  STRESS_LEVELS,
} from "@/lib/onboarding/constants";
import {
  MultiSelect,
  SingleSelect,
  TextArea,
  TextField,
  Toggle,
} from "@/components/onboarding/field";
import { ProgressBar, StepTransition } from "@/components/onboarding/step-shell";
import { SkeletonPage } from "@/components/ui/skeleton";

type StepDef = {
  key: string;
  title: string;
  quote: string;
  render: (props: {
    draft: OnboardingDraft;
    set: (patch: Partial<OnboardingDraft>) => void;
  }) => React.ReactNode;
};

const STEPS: StepDef[] = [
  {
    key: "welcome",
    title: "Let's build the strongest version of you.",
    quote: "Every elite athlete started somewhere.",
    render: () => (
      <p className="text-sm text-muted">
        A few quick questions — goals, training history, lifestyle, and
        health — so your coach can build a plan around the real you, not a
        generic template. Nothing here is required to finish; skip anything
        you&apos;d rather leave blank.
      </p>
    ),
  },
  {
    key: "goals",
    title: "What are you chasing?",
    quote: "Pick as many as you want — plans adapt as goals change.",
    render: ({ draft, set }) => (
      <div className="space-y-4">
        <MultiSelect
          label="Goals"
          values={draft.goals}
          onChange={(goals) => set({ goals })}
          options={GOALS}
        />
        <TextField
          label="Target date (optional)"
          type="date"
          value={draft.targetDate}
          onChange={(targetDate) => set({ targetDate })}
        />
      </div>
    ),
  },
  {
    key: "personal",
    title: "The basics",
    quote: "Today's effort becomes tomorrow's strength.",
    render: ({ draft, set }) => (
      <div className="space-y-4">
        <SingleSelect
          label="Units"
          value={draft.personal.units}
          onChange={(v) =>
            set({ personal: { ...draft.personal, units: (v || "imperial") as "imperial" | "metric" } })
          }
          options={["imperial", "metric"]}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Age"
            type="number"
            value={draft.personal.age}
            onChange={(age) => set({ personal: { ...draft.personal, age } })}
          />
          <TextField
            label="Sex"
            value={draft.personal.sex}
            onChange={(sex) => set({ personal: { ...draft.personal, sex } })}
          />
          <TextField
            label={draft.personal.units === "imperial" ? "Height (in)" : "Height (cm)"}
            type="number"
            value={draft.personal.height}
            onChange={(height) => set({ personal: { ...draft.personal, height } })}
          />
          <TextField
            label={draft.personal.units === "imperial" ? "Weight (lb)" : "Weight (kg)"}
            type="number"
            value={draft.personal.weight}
            onChange={(weight) => set({ personal: { ...draft.personal, weight } })}
          />
          <TextField
            label="Body fat % (optional)"
            type="number"
            value={draft.personal.bodyFatPct}
            onChange={(bodyFatPct) => set({ personal: { ...draft.personal, bodyFatPct } })}
          />
          <TextField
            label="Country"
            value={draft.personal.country}
            onChange={(country) => set({ personal: { ...draft.personal, country } })}
          />
        </div>
        <TextField
          label="Occupation"
          value={draft.personal.occupation}
          onChange={(occupation) => set({ personal: { ...draft.personal, occupation } })}
        />
        <SingleSelect
          label="Fitness experience"
          value={draft.personal.experienceLevel}
          onChange={(experienceLevel) => set({ personal: { ...draft.personal, experienceLevel } })}
          options={EXPERIENCE_LEVELS}
        />
      </div>
    ),
  },
  {
    key: "running",
    title: "Running history",
    quote: "Skip this whole section if running isn't your thing yet.",
    render: ({ draft, set }) => (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Longest run (mi)"
            type="number"
            value={draft.running.longestRunMi}
            onChange={(longestRunMi) => set({ running: { ...draft.running, longestRunMi } })}
          />
          <TextField
            label="Weekly mileage"
            type="number"
            value={draft.running.weeklyMileage}
            onChange={(weeklyMileage) => set({ running: { ...draft.running, weeklyMileage } })}
          />
          <TextField
            label="Runs per week"
            type="number"
            value={draft.running.weeklyRuns}
            onChange={(weeklyRuns) => set({ running: { ...draft.running, weeklyRuns } })}
          />
          <TextField
            label="Easy pace (min/mi)"
            value={draft.running.easyPace}
            onChange={(easyPace) => set({ running: { ...draft.running, easyPace } })}
          />
          <TextField
            label="5K PR"
            value={draft.running.fiveKPr}
            onChange={(fiveKPr) => set({ running: { ...draft.running, fiveKPr } })}
          />
          <TextField
            label="10K PR"
            value={draft.running.tenKPr}
            onChange={(tenKPr) => set({ running: { ...draft.running, tenKPr } })}
          />
          <TextField
            label="Half marathon PR"
            value={draft.running.halfPr}
            onChange={(halfPr) => set({ running: { ...draft.running, halfPr } })}
          />
          <TextField
            label="Marathon PR"
            value={draft.running.marathonPr}
            onChange={(marathonPr) => set({ running: { ...draft.running, marathonPr } })}
          />
        </div>
        <Toggle
          label="I run trails"
          checked={draft.running.trailRunning}
          onChange={(trailRunning) => set({ running: { ...draft.running, trailRunning } })}
        />
        <Toggle
          label="I have track experience"
          checked={draft.running.trackExperience}
          onChange={(trackExperience) => set({ running: { ...draft.running, trackExperience } })}
        />
      </div>
    ),
  },
  {
    key: "strength",
    title: "Strength history",
    quote: "Numbers rusty or nonexistent? Leave it blank — we'll find out together.",
    render: ({ draft, set }) => (
      <div className="space-y-4">
        <TextField
          label="Years lifting"
          type="number"
          value={draft.strength.yearsLifting}
          onChange={(yearsLifting) => set({ strength: { ...draft.strength, yearsLifting } })}
        />
        <SingleSelect
          label="Current split"
          value={draft.strength.split}
          onChange={(split) => set({ strength: { ...draft.strength, split } })}
          options={STRENGTH_SPLITS}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Squat"
            value={draft.strength.squat}
            onChange={(squat) => set({ strength: { ...draft.strength, squat } })}
          />
          <TextField
            label="Bench"
            value={draft.strength.bench}
            onChange={(bench) => set({ strength: { ...draft.strength, bench } })}
          />
          <TextField
            label="Deadlift"
            value={draft.strength.deadlift}
            onChange={(deadlift) => set({ strength: { ...draft.strength, deadlift } })}
          />
          <TextField
            label="Overhead press"
            value={draft.strength.overheadPress}
            onChange={(overheadPress) => set({ strength: { ...draft.strength, overheadPress } })}
          />
          <TextField
            label="Pull-ups (max reps)"
            value={draft.strength.pullUps}
            onChange={(pullUps) => set({ strength: { ...draft.strength, pullUps } })}
          />
          <TextField
            label="Push-ups (max reps)"
            value={draft.strength.pushUps}
            onChange={(pushUps) => set({ strength: { ...draft.strength, pushUps } })}
          />
          <TextField
            label="Plank (seconds)"
            value={draft.strength.plankSeconds}
            onChange={(plankSeconds) => set({ strength: { ...draft.strength, plankSeconds } })}
          />
        </div>
        <TextArea
          label="Favorite exercises"
          value={draft.strength.favoriteExercises}
          onChange={(favoriteExercises) => set({ strength: { ...draft.strength, favoriteExercises } })}
        />
        <TextArea
          label="Least favorite exercises"
          value={draft.strength.leastFavoriteExercises}
          onChange={(leastFavoriteExercises) =>
            set({ strength: { ...draft.strength, leastFavoriteExercises } })
          }
        />
      </div>
    ),
  },
  {
    key: "equipment",
    title: "What do you train with?",
    quote: "We'll only ever suggest workouts you can actually do.",
    render: ({ draft, set }) => (
      <MultiSelect
        label="Equipment access"
        values={draft.equipment.items}
        onChange={(items) => set({ equipment: { items } })}
        options={EQUIPMENT_OPTIONS}
      />
    ),
  },
  {
    key: "lifestyle",
    title: "Life outside the gym",
    quote: "Recovery is training too.",
    render: ({ draft, set }) => (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Sleep (hrs/night)"
            type="number"
            value={draft.lifestyle.sleepHours}
            onChange={(sleepHours) => set({ lifestyle: { ...draft.lifestyle, sleepHours } })}
          />
          <TextField
            label="Daily steps"
            type="number"
            value={draft.lifestyle.dailySteps}
            onChange={(dailySteps) => set({ lifestyle: { ...draft.lifestyle, dailySteps } })}
          />
          <TextField
            label="Training days/week"
            type="number"
            value={draft.lifestyle.trainingDaysPerWeek}
            onChange={(trainingDaysPerWeek) =>
              set({ lifestyle: { ...draft.lifestyle, trainingDaysPerWeek } })
            }
          />
          <TextField
            label="Workout duration (min)"
            type="number"
            value={draft.lifestyle.workoutDurationMin}
            onChange={(workoutDurationMin) =>
              set({ lifestyle: { ...draft.lifestyle, workoutDurationMin } })
            }
          />
        </div>
        <SingleSelect
          label="Stress level"
          value={draft.lifestyle.stressLevel}
          onChange={(stressLevel) => set({ lifestyle: { ...draft.lifestyle, stressLevel } })}
          options={STRESS_LEVELS}
        />
        <SingleSelect
          label="Alcohol"
          value={draft.lifestyle.alcohol}
          onChange={(alcohol) => set({ lifestyle: { ...draft.lifestyle, alcohol } })}
          options={ALCOHOL_LEVELS}
        />
        <SingleSelect
          label="Smoking"
          value={draft.lifestyle.smoking}
          onChange={(smoking) => set({ lifestyle: { ...draft.lifestyle, smoking } })}
          options={SMOKING_LEVELS}
        />
        <TextArea
          label="Recovery habits (stretching, sauna, massage...)"
          value={draft.lifestyle.recoveryHabits}
          onChange={(recoveryHabits) => set({ lifestyle: { ...draft.lifestyle, recoveryHabits } })}
        />
      </div>
    ),
  },
  {
    key: "nutrition",
    title: "Nutrition",
    quote: "This shapes your calorie and fueling targets, not a diet lecture.",
    render: ({ draft, set }) => (
      <div className="space-y-4">
        <SingleSelect
          label="Diet style"
          value={draft.nutrition.diet}
          onChange={(diet) => set({ nutrition: { ...draft.nutrition, diet } })}
          options={DIET_OPTIONS}
        />
        <TextField
          label="Food allergies"
          value={draft.nutrition.allergies}
          onChange={(allergies) => set({ nutrition: { ...draft.nutrition, allergies } })}
        />
        <TextArea
          label="Food preferences / dislikes"
          value={draft.nutrition.preferences}
          onChange={(preferences) => set({ nutrition: { ...draft.nutrition, preferences } })}
        />
        <Toggle
          label="I want calorie tracking"
          checked={draft.nutrition.calorieTracking}
          onChange={(calorieTracking) => set({ nutrition: { ...draft.nutrition, calorieTracking } })}
        />
        <Toggle
          label="I want macro tracking"
          checked={draft.nutrition.macroTracking}
          onChange={(macroTracking) => set({ nutrition: { ...draft.nutrition, macroTracking } })}
        />
      </div>
    ),
  },
  {
    key: "medical",
    title: "Health history",
    quote: "Educational, not medical advice — this just keeps the engine conservative.",
    render: ({ draft, set }) => (
      <div className="space-y-4">
        <MultiSelect
          label="Any of these apply?"
          values={draft.medical.conditions}
          onChange={(conditions) => set({ medical: { ...draft.medical, conditions } })}
          options={MEDICAL_CONDITIONS}
        />
        <TextArea
          label="Previous injuries"
          value={draft.medical.previousInjuries}
          onChange={(previousInjuries) => set({ medical: { ...draft.medical, previousInjuries } })}
        />
        <TextArea
          label="Surgeries"
          value={draft.medical.surgeries}
          onChange={(surgeries) => set({ medical: { ...draft.medical, surgeries } })}
        />
        <TextArea
          label="Current medications"
          value={draft.medical.medications}
          onChange={(medications) => set({ medical: { ...draft.medical, medications } })}
        />
        <TextArea
          label="Any limitations the coach should know about"
          value={draft.medical.limitations}
          onChange={(limitations) => set({ medical: { ...draft.medical, limitations } })}
        />
        <p className="text-xs text-muted">
          This is educational, not medical advice, and never a substitute for
          personalized care from a doctor.
        </p>
      </div>
    ),
  },
  {
    key: "ethnicity",
    title: "One optional question",
    quote: "Skip this one freely — it changes nothing if left blank.",
    render: ({ draft, set }) => (
      <div className="space-y-3">
        <TextField
          label="Ethnic background (optional)"
          value={draft.ethnicity}
          onChange={(ethnicity) => set({ ethnicity })}
        />
        <p className="text-xs text-muted">
          Only used to personalize nutrition guidance and surface
          population-level considerations — your own data, preferences, and
          goals always come first, and we never make assumptions based on
          this answer.
        </p>
      </div>
    ),
  },
];

export function OnboardingClient() {
  const router = useRouter();
  const { status, session } = useSession();
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (status === "anon") router.replace("/you");
  }, [status, router]);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  function patch(p: Partial<OnboardingDraft>) {
    setDraft((prev) => ({ ...prev, ...p }));
  }

  async function handleNext() {
    if (!isLast) {
      setStepIndex((i) => i + 1);
      return;
    }
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await submitOnboarding(session.userId, draft);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save — try again.");
    } finally {
      setBusy(false);
    }
  }

  if (status !== "authed") {
    return <SkeletonPage />;
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-12 text-center">
        <p className="text-5xl">🧌🎉</p>
        <h1 className="text-2xl font-bold tracking-tight">You&apos;re all set.</h1>
        <p className="text-sm text-muted">
          Your coach now knows the real you. The training and coach engines
          land in later phases — for now, your dashboard is ready.
        </p>
        <button
          onClick={() => router.push("/")}
          className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong"
        >
          Go to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <ProgressBar step={stepIndex} total={STEPS.length} />

      <StepTransition stepKey={step.key}>
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{step.title}</h1>
            <p className="mt-1 text-sm text-muted">{step.quote}</p>
          </div>
          {step.render({ draft, set: patch })}
        </div>
      </StepTransition>

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          disabled={stepIndex === 0}
          className="rounded-full px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground disabled:opacity-0"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => void handleNext()}
          disabled={busy}
          className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:opacity-60"
        >
          {busy ? "Saving…" : isLast ? "Finish" : "Next"}
        </button>
      </div>
    </div>
  );
}
