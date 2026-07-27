"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/accounts/session-context";
import { getClient } from "@/lib/accounts/client";
import {
  answerQuestion,
  dismissQuestion,
  listPendingQuestions,
  COACH_ADMIN_USERNAME,
  type PendingQuestion,
} from "@/lib/coach-chat/learned-answers";

export function CoachAdminClient() {
  const { status, session } = useSession();
  const [questions, setQuestions] = useState<PendingQuestion[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authed") return;
    let cancelled = false;
    (async () => {
      try {
        const sb = getClient();
        const rows = await listPendingQuestions(sb);
        if (!cancelled) setQuestions(rows);
      } catch {
        if (!cancelled) setError("Couldn't load the queue — try refreshing.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (status === "loading") {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  if (status !== "authed" || !session || session.username !== COACH_ADMIN_USERNAME) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">Coach — unanswered questions</h1>
        <p className="text-sm text-muted">This page is only for Troll Runner.</p>
      </div>
    );
  }

  async function handleAnswer(q: PendingQuestion) {
    const answer = (drafts[q.id] || "").trim();
    if (!answer) return;
    setBusyId(q.id);
    try {
      const sb = getClient();
      await answerQuestion(sb, q.id, q.question, answer);
      setQuestions((prev) => (prev ? prev.filter((row) => row.id !== q.id) : prev));
    } catch {
      setError("Couldn't save that answer — try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDismiss(q: PendingQuestion) {
    setBusyId(q.id);
    try {
      const sb = getClient();
      await dismissQuestion(sb, q.id);
      setQuestions((prev) => (prev ? prev.filter((row) => row.id !== q.id) : prev));
    } catch {
      setError("Couldn't dismiss that question — try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Coach — unanswered questions</h1>
        <p className="mt-1 text-sm text-muted">
          Answers you give here are added to the coach&apos;s answer library, so future questions like
          this one get matched automatically.
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {questions === null && <p className="text-sm text-muted">Loading queue…</p>}
      {questions !== null && questions.length === 0 && (
        <p className="text-sm text-muted">Nothing waiting — the queue is empty.</p>
      )}

      <div className="space-y-4">
        {questions?.map((q) => (
          <div key={q.id} className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-sm font-semibold">{q.question}</p>
            <p className="mt-1 text-xs text-muted">
              Asked {new Date(q.createdAt).toLocaleString()}
            </p>
            <textarea
              value={drafts[q.id] || ""}
              onChange={(e) => setDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))}
              placeholder="Write the answer…"
              rows={3}
              className="mt-3 w-full rounded-xl border border-line bg-raised px-3.5 py-2.5 text-sm outline-none focus:border-brand"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => handleAnswer(q)}
                disabled={busyId === q.id || !(drafts[q.id] || "").trim()}
                className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:opacity-60"
              >
                {busyId === q.id ? "Saving…" : "Save answer"}
              </button>
              <button
                type="button"
                onClick={() => handleDismiss(q)}
                disabled={busyId === q.id}
                className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-muted transition-colors hover:text-white disabled:opacity-60"
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
