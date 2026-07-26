"use client";

import { useEffect, useMemo, useState } from "react";
import { listActivities } from "@/lib/activities/api";
import { annualSummary } from "@/lib/activities/annual";
import { dailyTrend, monthlyTrend, weeklyTrend } from "@/lib/activities/trends";
import type { Activity } from "@/lib/activities/types";
import { computePRTimeline } from "@/lib/strength/prs";
import { TrendChart } from "@/components/charts/trend-chart";

type Range = "week" | "month" | "year" | "custom";

const RANGE_LABELS: Record<Range, string> = {
  week: "Week",
  month: "Month",
  year: "Year",
  custom: "Custom",
};

export function AnalyticsSection({ userId }: { userId: string }) {
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [range, setRange] = useState<Range>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    let cancelled = false;
    void listActivities(userId, 1000).then((rows) => {
      if (!cancelled) setActivities(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const years = useMemo(() => {
    if (!activities) return [new Date().getFullYear()];
    const set = new Set(activities.map((a) => new Date(a.occurredAt).getFullYear()));
    set.add(new Date().getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [activities]);

  const trendPoints = useMemo(() => {
    if (!activities) return [];
    if (range === "week") return dailyTrend(activities, 7);
    if (range === "year") return monthlyTrend(activities, 12);
    if (range === "custom" && customFrom && customTo) {
      const from = new Date(customFrom);
      const to = new Date(customTo);
      const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000));
      const inRange = activities.filter((a) => {
        const t = new Date(a.occurredAt);
        return t >= from && t <= to;
      });
      return days <= 31 ? dailyTrend(inRange, days) : weeklyTrend(inRange, Math.ceil(days / 7));
    }
    return weeklyTrend(activities, 8);
  }, [activities, range, customFrom, customTo]);

  const prTimeline = useMemo(() => (activities ? computePRTimeline(activities) : []), [activities]);
  const summary = useMemo(
    () => (activities ? annualSummary(activities, year) : null),
    [activities, year]
  );

  if (!activities) {
    return <p className="text-sm text-muted">Loading your stats…</p>;
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Trends</h2>
          <div className="flex rounded-full border border-line bg-surface p-1">
            {(["week", "month", "year", "custom"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  range === r ? "bg-raised text-foreground" : "text-muted"
                }`}
              >
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        {range === "custom" && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm"
            />
            <span className="text-muted">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm"
            />
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-4">
            <h3 className="text-sm font-semibold">Mileage</h3>
            <div className="mt-2">
              <TrendChart data={trendPoints.map((p) => ({ label: p.label, value: p.mileage }))} unit="mi" />
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <h3 className="text-sm font-semibold">Strength volume</h3>
            <div className="mt-2">
              <TrendChart data={trendPoints.map((p) => ({ label: p.label, value: p.volume }))} unit="lb" />
            </div>
          </div>
        </div>
      </section>

      {summary && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Annual summary</h2>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-full border border-line bg-surface px-3 py-1 text-xs"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MiniStat label="Total activities" value={String(summary.totalActivities)} />
            <MiniStat label="Total mileage" value={`${summary.totalMileage} mi`} />
            <MiniStat label="Longest run" value={`${summary.longestRunMi.toFixed(1)} mi`} />
            <MiniStat label="Runs logged" value={String(summary.runCount)} />
            <MiniStat label="Strength sessions" value={String(summary.strengthCount)} />
            <MiniStat label="Busiest month" value={summary.busiestMonth ?? "—"} />
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">PR timeline</h2>
        {prTimeline.length === 0 ? (
          <p className="text-sm text-muted">
            No PRs yet — log strength sets with weight and reps to start tracking records.
          </p>
        ) : (
          <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {prTimeline.slice(0, 15).map((pr, i) => (
              <div key={`${pr.exercise}-${pr.achievedAt}-${i}`} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div>
                  <p className="font-medium">
                    🏆 {pr.exercise} — {pr.weightLb} lb × {pr.reps}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(pr.achievedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-xs text-muted">
                  ~{Math.round(pr.estOneRm)} lb 1RM
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}
