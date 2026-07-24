"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/lib/accounts/session-context";
import { logRun, logStrength } from "@/lib/activities/api";
import type { StrengthSet } from "@/lib/activities/types";
import { TextArea, TextField } from "@/components/onboarding/field";

function nowLocalIso(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function LogClient() {
  const router = useRouter();
  const { status, session } = useSession();
  const [mode, setMode] = useState<"run" | "strength">("run");

  if (status === "loading") {
    return <p className="text-sm text-muted">Loading…</p>;
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

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Log activity</h1>
        <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
          Phase 3 · activities
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
        <RunForm userId={session.userId} onSaved={() => router.push("/")} />
      ) : (
        <StrengthForm userId={session.userId} onSaved={() => router.push("/")} />
      )}
    </div>
  );
}

function RunForm({ userId, onSaved }: { userId: string; onSaved: () => void }) {
  const [title, setTitle] = useState("Run");
  const [occurredAt, setOccurredAt] = useState(nowLocalIso());
  const [distanceMi, setDistanceMi] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [elevationFt, setElevationFt] = useState("");
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
        notes,
      });
      onSaved();
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
      <TextArea label="Notes" value={notes} onChange={setNotes} />
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full bg-brand py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save run"}
      </button>
    </form>
  );
}

function StrengthForm({ userId, onSaved }: { userId: string; onSaved: () => void }) {
  const [title, setTitle] = useState("Strength workout");
  const [occurredAt, setOccurredAt] = useState(nowLocalIso());
  const [notes, setNotes] = useState("");
  const [sets, setSets] = useState<StrengthSet[]>([
    { exercise: "", weightLb: "", reps: "" },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateSet(i: number, patch: Partial<StrengthSet>) {
    setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function addSet() {
    setSets((prev) => [...prev, { exercise: "", weightLb: "", reps: "" }]);
  }

  function removeSet(i: number) {
    setSets((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await logStrength(userId, {
        type: "strength",
        title,
        occurredAt: new Date(occurredAt).toISOString(),
        notes,
        sets,
      });
      onSaved();
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
          onClick={addSet}
          className="rounded-full border border-line px-3.5 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
        >
          + Add set
        </button>
      </div>

      <TextArea label="Notes" value={notes} onChange={setNotes} />
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full bg-brand py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save workout"}
      </button>
    </form>
  );
}
