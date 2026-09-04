"use client";

import type { Activity } from "@/lib/activities/types";
import type { TrainingLoad, LoadStatus } from "@/lib/coach/training-load";
import { recentLoadDays, suggestedWeeklyLoad, runningFitness } from "@/lib/coach/progress-cards";
import type { RecoveryStatus } from "@/lib/recovery/score";
import { StatCard, StatRow } from "./stat-card";
import { DayBars, GaugeArc, NeedleGauge } from "./visuals";

/**
 * The four COROS Progress cards this app can fill with real data.
 *
 * The watch shows eleven. The other seven — Heart Rate, Resting Heart Rate,
 * Sleep, Stress, Overnight HRV, Wellness Check, and the muscle heatmap half of
 * Body Mass — all need continuous optical-sensor data, and this app has no
 * wearable sync. They are deliberately not built rather than shipped as empty
 * shells: a card that never has a number is worse than no card. See
 * docs/COROS-UI.md.
 */

const TONE_TEXT: Record<LoadStatus["tone"], string> = {
  good: "text-[#ff8a4c]",
  warning: "text-[#fbbf24]",
  critical: "text-[#f87171]",
};

/** COROS renders its card glyphs as colored marks; these are CSS equivalents. */
function Glyph({ color, children }: { color: string; children: string }) {
  return (
    <span
      className="flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-bold"
      style={{ background: `${color}22`, color }}
    >
      {children}
    </span>
  );
}

export function WeeklyTrainingLoadCard({
  activities,
  baseFitness,
  onClick,
}: {
  activities: Activity[];
  baseFitness: number;
  onClick?: () => void;
}) {
  const series = recentLoadDays(activities, 7);
  const suggested = suggestedWeeklyLoad(baseFitness);

  return (
    <StatCard
      title="Weekly Training Load"
      icon={<Glyph color="#22d3ee">TL</Glyph>}
      value={series.total.toLocaleString()}
      sub={
        suggested
          ? `Suggested ${suggested.low.toLocaleString()}-${suggested.high.toLocaleString()}`
          : "Log more to get a suggested range"
      }
      visual={
        <DayBars
          values={series.values}
          labels={series.labels}
          highlightIndex={series.todayIndex}
          peakLabel={series.peak > 0 ? String(series.peak) : undefined}
          color="#22d3ee"
        />
      }
      onClick={onClick}
      ariaLabel={`Weekly Training Load: ${series.total}${
        suggested ? `, suggested ${suggested.low} to ${suggested.high}` : ""
      }. Show detail`}
    />
  );
}

export function TrainingStatusCard({
  activities,
  load,
  status,
  onClick,
}: {
  activities: Activity[];
  load: TrainingLoad;
  status: LoadStatus;
  onClick?: () => void;
}) {
  const series = recentLoadDays(activities, 7);

  return (
    <StatCard
      title="Training Status"
      icon={<Glyph color="#ff5a1f">TS</Glyph>}
      value={status.label}
      valueClassName={`text-[30px] font-bold leading-none tracking-tight ${TONE_TEXT[status.tone]}`}
      sub={`7-Day Training Load ${series.total.toLocaleString()}`}
      visual={
        <DayBars
          values={series.values}
          labels={series.labels}
          highlightIndex={series.todayIndex}
          color="#22d3ee"
        />
      }
      footer={
        <StatRow
          items={[
            { label: "Load Impact", value: String(load.loadImpact) },
            { label: "Base Fitness", value: String(load.baseFitness) },
            { label: "Intensity Trend", value: `${load.intensityTrendPct}%` },
          ]}
        />
      }
      onClick={onClick}
      ariaLabel={`Training Status: ${status.label}. Load Impact ${load.loadImpact}, Base Fitness ${load.baseFitness}, Intensity Trend ${load.intensityTrendPct} percent. Show detail`}
    />
  );
}

/** Title is rendered in the status tone, the way COROS colors "Optimized". */
export function trainingStatusToneClass(status: LoadStatus): string {
  return TONE_TEXT[status.tone];
}

export function RecoveryCard({
  score,
  status,
  onClick,
}: {
  score: number | null;
  status: RecoveryStatus;
  onClick?: () => void;
}) {
  return (
    <StatCard
      title="Recovery"
      icon={<Glyph color="#2dd4bf">RC</Glyph>}
      value={score !== null ? String(score) : "—"}
      unit={score !== null ? "%" : undefined}
      sub={
        score !== null
          ? "7-day check-in average"
          : "Log a check-in to see recovery"
      }
      visual={<GaugeArc pct={score ?? 0} label={status.label} />}
      onClick={onClick}
      ariaLabel={`Recovery: ${score !== null ? `${score} percent, ${status.label}` : "no check-ins yet"}. Show detail`}
    />
  );
}

export function RunningFitnessCard({
  activities,
  onClick,
}: {
  activities: Activity[];
  onClick?: () => void;
}) {
  const fitness = runningFitness(activities);
  if (!fitness) return null;

  const trendSub =
    fitness.basis === "efficiency" && fitness.changePct !== undefined
      ? `${fitness.changePct >= 0 ? "+" : ""}${fitness.changePct}% efficiency vs 4mo ago`
      : fitness.marathon
        ? `Marathon ${fitness.marathon}`
        : undefined;

  return (
    <StatCard
      title="Running Fitness"
      icon={<Glyph color="#fbbf24">RF</Glyph>}
      value={fitness.score.toFixed(1)}
      sub={trendSub}
      visual={<NeedleGauge value={fitness.score} />}
      onClick={onClick}
      ariaLabel={`Running Fitness: ${fitness.score} out of 100${
        trendSub ? `, ${trendSub}` : ""
      }. Show detail`}
    />
  );
}
