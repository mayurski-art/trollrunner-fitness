"use client";

import { useEffect, useState } from "react";
import { weeklyLeaderboard, type LeaderboardRow } from "@/lib/social/leaderboard";

export function LeaderboardCard({ userId }: { userId: string }) {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void weeklyLeaderboard(userId).then((r) => {
      if (!cancelled) setRows(r);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-sm font-semibold">Weekly leaderboard</p>
      <p className="text-xs text-muted">You + people you follow, running mileage this week</p>
      <div className="mt-3 space-y-1.5">
        {rows === null ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : rows.length <= 1 ? (
          <p className="text-sm text-muted">Follow people to see a leaderboard here.</p>
        ) : (
          rows.map((r, i) => (
            <div
              key={r.id}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                r.isMe ? "bg-brand-soft" : ""
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="w-5 text-xs text-muted">{i + 1}</span>
                <span className={r.isMe ? "font-semibold text-brand" : ""}>
                  {r.isMe ? "You" : r.username}
                </span>
              </span>
              <span className="font-mono text-xs">{r.mileage} mi</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
