"use client";

import { useEffect, useRef } from "react";
import { TrendChart } from "@/components/charts/trend-chart";

export type StatDetail = {
  label: string;
  value: string;
  /** What the number means, in a sentence. */
  explanation: string;
  chart: { data: { label: string; value: number }[]; unit: string } | null;
  /** Optional extra rows shown under the chart, e.g. best week. */
  facts?: { label: string; value: string }[];
};

/**
 * Detail view for a home-screen stat: the trend behind the single number, plus
 * what it actually means. Dialog rather than a page so the context stays put.
 */
export function StatDetailModal({
  detail,
  onClose,
}: {
  detail: StatDetail | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!detail) return;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    // The page behind a modal should not scroll with it.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [detail, onClose]);

  if (!detail) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${detail.label} detail`}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-2xl border border-line bg-surface p-5 shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {detail.label}
            </p>
            <p className="mt-1 font-mono text-3xl font-semibold">{detail.value}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-line px-3 py-1 text-sm text-muted transition-colors hover:text-foreground"
          >
            Close
          </button>
        </div>

        <p className="mt-3 text-sm text-muted">{detail.explanation}</p>

        {detail.chart && (
          <div className="mt-4">
            <TrendChart data={detail.chart.data} unit={detail.chart.unit} />
          </div>
        )}

        {detail.facts && detail.facts.length > 0 && (
          <dl className="mt-4 grid grid-cols-2 gap-3">
            {detail.facts.map((f) => (
              <div key={f.label} className="rounded-xl border border-line bg-raised p-3">
                <dt className="text-xs text-muted">{f.label}</dt>
                <dd className="mt-1 font-mono text-sm font-semibold">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
