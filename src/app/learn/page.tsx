import type { Metadata } from "next";
import Link from "next/link";
import { ARTICLES } from "@/lib/education/articles";

export const metadata: Metadata = {
  title: "Learn",
  description: "Evidence-informed guides on running, strength, recovery, nutrition, and race day.",
};

export default function LearnPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">TrollRunner Fitness</p>
          <h1 className="text-2xl font-bold tracking-tight">Learn</h1>
        </div>
        <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
          Phase 14 · education hub
        </span>
      </div>
      <p className="text-sm text-muted">
        Short, evidence-informed guides — not a substitute for personalized medical or coaching
        advice, just the fundamentals worth knowing.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {ARTICLES.map((article) => (
          <Link
            key={article.slug}
            href={`/learn/${article.slug}`}
            className="rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-brand"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-brand">
              {article.category}
            </span>
            <h2 className="mt-1 font-semibold">{article.title}</h2>
            <p className="mt-1.5 text-sm text-muted">{article.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
