const STATS = [
  {
    label: "This week",
    value: "0.0 mi",
    note: "Activity logging arrives in Phase 3",
  },
  {
    label: "Training load",
    value: "—",
    note: "Coach engine arrives in Phase 6",
  },
  {
    label: "Recovery",
    value: "—",
    note: "Check-ins arrive in Phase 8",
  },
  {
    label: "Fitness score",
    value: "—",
    note: "Builds from your logged training",
  },
];

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Welcome to</p>
          <h1 className="text-2xl font-bold tracking-tight">
            TrollRunner Fitness
          </h1>
        </div>
        <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
          Phase 0 · foundations
        </span>
      </div>

      <section aria-label="Your stats" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-line bg-surface p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {stat.label}
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold">{stat.value}</p>
            <p className="mt-1.5 text-xs text-muted">{stat.note}</p>
          </div>
        ))}
      </section>

      <section
        aria-label="Today's workout"
        className="rounded-2xl border border-line bg-surface p-5"
      >
        <h2 className="text-sm font-semibold">Today&apos;s workout</h2>
        <p className="mt-2 text-sm text-muted">
          Rest day — by default, for now. Once onboarding (Phase 2) and the
          coach engine (Phase 6) land, this card writes your session for the
          day and explains why.
        </p>
      </section>

      <section
        aria-label="Recent activities"
        className="rounded-2xl border border-line bg-surface p-5"
      >
        <h2 className="text-sm font-semibold">Recent activities</h2>
        <p className="mt-2 text-sm text-muted">
          Nothing here yet. Your feed fills up when logging lands in Phase 3 —
          and Strava import follows in Phase 5.
        </p>
      </section>
    </div>
  );
}
