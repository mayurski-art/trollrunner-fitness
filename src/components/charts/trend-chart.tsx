"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
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
 */
export function TrendChart({
  data,
  unit,
}: {
  data: Point[];
  unit: string;
}) {
  const allZero = data.every((d) => d.value === 0);

  return (
    <div className="h-40 w-full">
      {allZero ? (
        <div className="flex h-full items-center justify-center text-sm text-muted">
          No data logged yet
        </div>
      ) : (
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
              fill="var(--brand)"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
