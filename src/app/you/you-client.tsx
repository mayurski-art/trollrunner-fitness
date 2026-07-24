"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/accounts/session-context";
import { getOnboardingStatus } from "@/lib/onboarding/api";

export function YouClient() {
  const { status, session } = useSession();

  if (status === "loading") {
    return <p className="text-sm text-muted">Loading your profile…</p>;
  }

  if (status === "authed" && session) {
    return <ProfileView />;
  }

  return <AuthForms />;
}

function ProfileView() {
  const { session, logout } = useSession();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    void getOnboardingStatus(session.userId).then((result) => {
      if (!cancelled) setOnboardingComplete(result === "complete");
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (!session) return null;

  const joined = new Date(session.joinedAt).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">You</h1>
        <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
          Phase 2 · onboarding
        </span>
      </div>

      <section className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-raised text-2xl">
          🧌
        </span>
        <div>
          <p className="text-lg font-semibold">{session.username}</p>
          <p className="text-sm text-muted">
            Level {session.level} · {session.xp} XP · joined {joined}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold">Your training profile</h2>
        {onboardingComplete === false ? (
          <>
            <p className="mt-2 text-sm text-muted">
              You haven&apos;t told us about your goals yet — the coach needs
              this to build a plan around the real you.
            </p>
            <Link
              href="/onboarding"
              className="mt-3 inline-block rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-strong"
            >
              Start onboarding
            </Link>
          </>
        ) : onboardingComplete === true ? (
          <p className="mt-2 text-sm text-muted">
            Onboarding complete. The training and coach engines that use this
            profile land in later phases.
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted">Checking your profile…</p>
        )}
      </section>

      <button
        onClick={() => void logout()}
        className="rounded-full border border-line px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-brand hover:text-foreground"
      >
        Sign out
      </button>
    </div>
  );
}

function AuthForms() {
  const { login, register } = useSession();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await login({ identifier, password });
      } else {
        await register({ username, email: email || undefined, password });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          One account works across every TrollRunner site.
        </p>
      </div>

      <div className="flex rounded-full border border-line bg-surface p-1">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`flex-1 rounded-full py-1.5 text-sm font-medium transition-colors ${
              mode === m ? "bg-raised text-foreground" : "text-muted"
            }`}
          >
            {m === "login" ? "Log in" : "Sign up"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "login" ? (
          <Field
            label="Username or email"
            value={identifier}
            onChange={setIdentifier}
            autoComplete="username"
          />
        ) : (
          <>
            <Field
              label="Username"
              value={username}
              onChange={setUsername}
              autoComplete="username"
              hint="3–20 letters, numbers, or underscores"
            />
            <Field
              label="Email (optional, for password recovery)"
              value={email}
              onChange={setEmail}
              type="email"
              autoComplete="email"
            />
          </>
        )}
        <Field
          label="Password"
          value={password}
          onChange={setPassword}
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />

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
          {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  hint?: string;
}) {
  const id = `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        required={label !== "Email (optional, for password recovery)"}
        className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-brand"
      />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
