import type { Badge } from "@/lib/gamification/badges";

export function BadgesGrid({ badges }: { badges: Badge[] }) {
  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div className="card rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Badges</p>
        <span className="text-xs text-muted">
          {earnedCount}/{badges.length}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {badges.map((b) => (
          <div
            key={b.id}
            title={b.label}
            className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center ${
              b.earned ? "border-brand/30 bg-brand-soft" : "border-line bg-raised opacity-40"
            }`}
          >
            <span className="text-2xl">{b.emoji}</span>
            <span className="text-[11px] leading-tight text-muted">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
