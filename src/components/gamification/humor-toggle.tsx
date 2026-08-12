"use client";

import { useEffect, useState } from "react";
import { getHumorEnabled, setHumorEnabled } from "@/lib/gamification/humor";

export function HumorToggle({ userId }: { userId: string }) {
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getHumorEnabled(userId).then((v) => {
      if (!cancelled) setEnabled(v);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function toggle() {
    setBusy(true);
    try {
      const next = !enabled;
      await setHumorEnabled(userId, next);
      setEnabled(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-between card rounded-2xl p-4">
      <div>
        <p className="text-sm font-semibold">Troll humor</p>
        <p className="text-xs text-muted">
          Confetti, one-liners, and extra flair on celebrations. Turn off for a
          more no-nonsense tool.
        </p>
      </div>
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={busy}
        aria-pressed={enabled}
        aria-label="Toggle troll humor"
        className={`h-6 w-11 shrink-0 rounded-full transition-colors ${
          enabled ? "bg-brand" : "bg-raised"
        }`}
      >
        <span
          className={`block h-6 w-6 rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
