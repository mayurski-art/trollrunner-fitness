"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/lib/accounts/session-context";
import { listActivities, logRun, logStrength } from "@/lib/activities/api";
import { currentStreak } from "@/lib/activities/stats";
import type { Activity, StrengthSet } from "@/lib/activities/types";
import { RUN_DISTANCE_PRESETS, STRENGTH_EXERCISE_PRESETS } from "@/lib/activities/presets";
import { programFor } from "@/lib/strength/programs";
import { findNewPRs, type ExerciseBest } from "@/lib/strength/prs";
import { awardActivityXp, awardPrXp } from "@/lib/gamification/xp-bridge";
import { getHumorEnabled } from "@/lib/gamification/humor";
import { TextArea, TextField } from "@/components/onboarding/field";
import { EffortSlider } from "@/components/activities/effort-slider";
import { RestTimer } from "@/components/activities/rest-timer";
import { Celebration } from "@/components/activities/celebration";
import { SkeletonPage } from "@/components/ui/skeleton";

function nowLocalIso(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function LogClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, session } = useSession();
  const splitParam = searchParams.get("split");
  const dayParam = searchParams.get("day");

  const [mode, setMode] = useState<"run" | "strength">(splitParam ? "strength" : "run");
  const [streak, setStreak] = useState<number | null>(null);
  const [newPRs, setNewPRs] = useState<ExerciseBest[]>([]);
  const [humor, setHumor] = useState(true);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    void getHumorEnabled(session.userId).then((v) => {
      if (!cancelled) setHumor(v);
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const prefill = useMemo(() => {
    if (!splitParam || dayParam === null) return null;
    const program = programFor(splitParam);
    const day = program.days[Number(dayParam)];
    if (!day) return null;
    return {
      title: `${day.day} — ${program.split}`,
      sets: day.exercises.map((e) => ({ exercise: e.name, weightLb: "", reps: "" })),
    };
  }, [splitParam, dayParam]);

  if (status === "loading") {
    return <SkeletonPage />;
  }
  if (status === "anon" || !session) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">Log activity</h1>
        <p className="text-sm text-muted">
          Sign in first — head to the You tab to log in or create an account.
        </p>
      </div>
    );
  }

  async function handleSaved(priorActivities: Activity[], loggedSets?: StrengthSet[]) {
    const rows = await listActivities(session!.userId);
    setStreak(currentStreak(rows));
    void awardActivityXp();
    if (loggedSets) {
      const prs = findNewPRs(priorActivities, loggedSets);
      setNewPRs(prs);
      for (const pr of prs) void awardPrXp(pr.exercise);
    }
  }

  if (streak !== null) {
    return (
      <Celebration streak={streak} newPRs={newPRs} humor={humor} onDone={() => router.push("/")} />
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Log activity</h1>
        <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
          Manual logging
        </span>
      </div>

      <div className="flex rounded-full border border-line bg-surface p-1">
        {(["run", "strength"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 rounded-full py-1.5 text-sm font-medium transition-colors ${
              mode === m ? "bg-raised text-foreground" : "text-muted"
            }`}
          >
            {m === "run" ? "🏃 Run" : "🏋️ Strength"}
          </button>
        ))}
      </div>

      {mode === "run" ? (
        <RunForm userId={session.userId} onSaved={() => handleSaved([])} />
      ) : (
        <StrengthForm
          userId={session.userId}
          initialTitle={prefill?.title}
          initialSets={prefill?.sets}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

function RunForm({
  userId,
  onSaved,
}: {
  userId: string;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState("Run");
  const [occurredAt, setOccurredAt] = useState(nowLocalIso());
  const [distanceMi, setDistanceMi] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [elevationFt, setElevationFt] = useState("");
  const [effort, setEffort] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await logRun(userId, {
        type: "run",
        title,
        occurredAt: new Date(occurredAt).toISOString(),
        distanceMi,
        durationMin,
        elevationFt,
        effort,
        notes,
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the run.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <TextField label="Title" value={title} onChange={setTitle} />
      <TextField
        label="When"
        type="datetime-local"
        value={occurredAt}
        onChange={setOccurredAt}
      />

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted">Quick distance</p>
        <div className="flex flex-wrap gap-2">
          {RUN_DISTANCE_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setDistanceMi(p.value)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                distanceMi === p.value
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-line text-muted hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Distance (mi)"
          type="number"
          value={distanceMi}
          onChange={setDistanceMi}
        />
        <TextField
          label="Duration (min)"
          type="number"
          value={durationMin}
          onChange={setDurationMin}
        />
        <TextField
          label="Elevation gain (ft)"
          type="number"
          value={elevationFt}
          onChange={setElevationFt}
        />
      </div>

      <EffortSlider value={effort} onChange={setEffort} />

      <TextArea label="Notes" value={notes} onChange={setNotes} />
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full bg-brand py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save run"}
      </button>
    </form>
  );
}

function StrengthForm({
  userId,
  initialTitle,
  initialSets,
  onSaved,
}: {
  userId: string;
  initialTitle?: string;
  initialSets?: StrengthSet[];
  onSaved: (priorActivities: Activity[], loggedSets: StrengthSet[]) => Promise<void>;
}) {
  const [title, setTitle] = useState(initialTitle ?? "Strength workout");
  const [occurredAt, setOccurredAt] = useState(nowLocalIso());
  const [notes, setNotes] = useState("");
  const [effort, setEffort] = useState<number | null>(null);
  const [sets, setSets] = useState<StrengthSet[]>(
    initialSets && initialSets.length ? initialSets : [{ exercise: "", weightLb: "", reps: "" }]
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateSet(i: number, patch: Partial<StrengthSet>) {
    setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function addSet(exercise = "") {
    setSets((prev) => [...prev, { exercise, weightLb: "", reps: "" }]);
  }

  function removeSet(i: number) {
    setSets((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const priorActivities = await listActivities(userId, 200);
      await logStrength(userId, {
        type: "strength",
        title,
        occurredAt: new Date(occurredAt).toISOString(),
        effort,
        notes,
        sets,
      });
      await onSaved(priorActivities, sets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the workout.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <TextField label="Title" value={title} onChange={setTitle} />
      <TextField
        label="When"
        type="datetime-local"
        value={occurredAt}
        onChange={setOccurredAt}
      />

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted">Quick add</p>
        <div className="flex flex-wrap gap-2">
          {STRENGTH_EXERCISE_PRESETS.map((exercise) => (
            <button
              key={exercise}
              type="button"
              onClick={() => addSet(exercise)}
              className="rounded-full border border-line px-3 py-1 text-xs font-medium text-muted transition-colors hover:border-brand hover:text-foreground"
            >
              + {exercise}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted">Sets</p>
        {sets.map((set, i) => (
          <div key={i} className="grid grid-cols-[1fr_5rem_4rem_auto] items-end gap-2">
            <TextField
              label={i === 0 ? "Exercise" : ""}
              value={set.exercise}
              onChange={(v) => updateSet(i, { exercise: v })}
            />
            <TextField
              label={i === 0 ? "Weight (lb)" : ""}
              type="number"
              value={set.weightLb}
              onChange={(v) => updateSet(i, { weightLb: v })}
            />
            <TextField
              label={i === 0 ? "Reps" : ""}
              type="number"
              value={set.reps}
              onChange={(v) => updateSet(i, { reps: v })}
            />
            <button
              type="button"
              onClick={() => removeSet(i)}
              aria-label={`Remove set ${i + 1}`}
              className="rounded-lg border border-line px-2 py-2.5 text-xs text-muted hover:text-foreground"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => addSet()}
          className="rounded-full border border-line px-3.5 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
        >
          + Add set
        </button>
      </div>

      <RestTimer />

      <EffortSlider value={effort} onChange={setEffort} />

      <TextArea label="Notes" value={notes} onChange={setNotes} />
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full bg-brand py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save workout"}
      </button>
    </form>
  );
}
