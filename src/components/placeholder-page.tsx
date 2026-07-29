export function PlaceholderPage({
  title,
  phase,
  description,
}: {
  title: string;
  phase: string;
  description: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
          {phase}
        </span>
      </div>
      <div className="card rounded-2xl p-5">
        <p className="text-sm text-muted">{description}</p>
      </div>
    </div>
  );
}
