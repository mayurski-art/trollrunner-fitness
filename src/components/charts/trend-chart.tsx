"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

type Point = { label: string; value: number };

function TrendTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: { value: number }[];
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-raised px-2.5 py-1.5 text-xs shadow-lg">
      <span className="font-mono font-semibold text-foreground">
        {payload[0].value.toLocaleString()} {unit}
      </span>
    </div>
  );
}

/**
 * Single-series weekly bar trend. Two measures of different scale (mileage,
 * strength volume) always get their own chart — never a dual y-axis.
 *
 * Bars are selectable: clicking or tapping one pins a readout below the chart.
 * Hover tooltips alone aren't enough — they don't exist on touch, and they
 * vanish the moment you look away from the bar you're trying to read.
 */
export function TrendChart({
  data,
  unit,
  periodNoun = "week",
}: {
  data: Point[];
  unit: string;
  /** What one bar represents, for the selected-bar readout ("week", "day", "month"). */
  periodNoun?: string;
}) {
  const allZero = data.every((d) => d.value === 0);
  // Data can change under us (the period filter swaps 8 weeks for 12 months),
  // which would leave the selection pointing at a stale bar. Reset during
  // render by tracking the shape alongside the selection, rather than in an
  // effect — an effect would paint one frame with the wrong bar highlighted.
  // Key off the labels, not array identity: callers rebuild the array every
  // render, which would clear the selection immediately.
  const shape = data.map((d) => d.label).join("|");
  const [selected, setSelected] = useState<{ shape: string; index: number } | null>(
    null
  );
  const activeIndex = selected && selected.shape === shape ? selected.index : null;

  const selectedPoint = activeIndex === null ? null : data[activeIndex];
  const total = data.reduce((s, d) => s + d.value, 0);
  const average = data.length ? total / data.length : 0;

  function select(index: number | null) {
    setSelected(index === null ? null : { shape, index });
  }

  function move(delta: number) {
    const next = activeIndex === null ? 0 : activeIndex + delta;
    select(Math.min(data.length - 1, Math.max(0, next)));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      select(0);
    } else if (e.key === "End") {
      e.preventDefault();
      select(data.length - 1);
    } else if (e.key === "Escape") {
      select(null);
    }
  }

  if (allZero) {
    return (
      <div className="flex h-40 w-full items-center justify-center text-sm text-muted">
        No data logged yet
      </div>
    );
  }

  return (
    <div>
      <div
        className="h-40 w-full focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        role="application"
        tabIndex={0}
        onKeyDown={onKeyDown}
        aria-label={`${periodNoun}ly trend chart, ${data.length} bars. Use arrow keys to select a ${periodNoun} and read its value.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
            <CartesianGrid
              vertical={false}
              stroke="var(--line)"
              strokeDasharray="0"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <Tooltip
              cursor={{ fill: "var(--raised)" }}
              content={<TrendTooltip unit={unit} />}
            />
            <Bar
              dataKey="value"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
              isAnimationActive={false}
              onClick={(_, index) => select(activeIndex === index ? null : index)}
              className="cursor-pointer"
            >
              {data.map((point, i) => (
                <Cell
                  key={point.label + i}
                  fill={
                    activeIndex === null || activeIndex === i
                      ? "var(--brand)"
                      : "var(--brand-soft)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div aria-live="polite" className="mt-2 min-h-[2.25rem]">
        {selectedPoint ? (
          <div className="flex items-baseline justify-between gap-2 rounded-lg border border-line bg-raised px-3 py-2">
            <span className="text-xs text-muted">
              {periodNoun === "week" ? "Week of " : ""}
              {selectedPoint.label}
            </span>
            <span className="font-mono text-sm font-semibold text-foreground">
              {selectedPoint.value.toLocaleString()} {unit}
            </span>
          </div>
        ) : (
          <p className="px-1 text-xs text-muted">
            Tap a bar for that {periodNoun}&rsquo;s total &middot; avg{" "}
            <span className="font-mono">
              {(Math.round(average * 10) / 10).toLocaleString()} {unit}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
