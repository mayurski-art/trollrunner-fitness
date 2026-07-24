import { TrendChart } from "@/components/charts/trend-chart";
import type { WeekPoint } from "@/lib/activities/trends";

export function WeeklyTrends({ weeks }: { weeks: WeekPoint[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-line bg-surface p-4">
        <h3 className="text-sm font-semibold">Weekly mileage</h3>
        <p className="text-xs text-muted">Last {weeks.length} weeks, runs only</p>
        <div className="mt-2">
          <TrendChart
            data={weeks.map((w) => ({ label: w.label, value: w.mileage }))}
            unit="mi"
          />
        </div>
      </div>
      <div className="rounded-2xl border border-line bg-surface p-4">
        <h3 className="text-sm font-semibold">Weekly strength volume</h3>
        <p className="text-xs text-muted">Last {weeks.length} weeks, lb × reps</p>
        <div className="mt-2">
          <TrendChart
            data={weeks.map((w) => ({ label: w.label, value: w.volume }))}
            unit="lb"
          />
        </div>
      </div>
    </div>
  );
}
