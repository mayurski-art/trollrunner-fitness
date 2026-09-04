"use client";

import type { ReactNode } from "react";

/**
 * The COROS card shell.
 *
 * Every card on the watch app's Progress screen shares one grammar: a small
 * titled header with a colored glyph, then a row with the headline number on
 * the left and a visualization on the right, then an optional footer. Matching
 * that grammar exactly is what makes the set read as one system, so cards vary
 * only in their visualization and footer — never in their skeleton.
 */
export function StatCard({
  title,
  icon,
  value,
  valueClassName,
  unit,
  sub,
  visual,
  footer,
  onClick,
  ariaLabel,
}: {
  title: string;
  /** Small colored glyph beside the title. */
  icon: ReactNode;
  /** The headline figure. Rendered large; pass a string so callers control precision. */
  value: string;
  /**
   * Overrides the value's type treatment. Numbers default to the tabular mono
   * face; a word headline (Training Status shows "Optimized") passes the
   * proportional face instead, the way the watch does.
   */
  valueClassName?: string;
  /** Small unit rendered on the value's baseline ("bpm", "%", "mi"). */
  unit?: string;
  /** Muted line beneath the value ("Suggested 525-788"). */
  sub?: string;
  /** Right-hand visualization — bar column, gauge, sparkline, range bar. */
  visual?: ReactNode;
  /** Optional full-width footer, e.g. the 3-up stat row on Training Status. */
  footer?: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const body = (
    <>
      <div className="flex items-center gap-2">
        <span aria-hidden className="flex h-5 w-5 items-center justify-center">
          {icon}
        </span>
        <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2 @[22rem]:gap-4">
        <div className="min-w-0">
          <p className="flex items-baseline gap-1.5">
            <span
              className={
                valueClassName ??
                "font-mono text-[28px] font-bold leading-none tracking-tight tabular-nums @[22rem]:text-[34px]"
              }
            >
              {value}
            </span>
            {unit ? (
              <span className="text-sm font-semibold text-muted">{unit}</span>
            ) : null}
          </p>
          {sub ? (
            <p className="mt-1.5 text-[12px] text-muted @[22rem]:text-[13px]">{sub}</p>
          ) : null}
        </div>

        {visual ? <div className="shrink-0">{visual}</div> : null}
      </div>

      {footer ? <div className="mt-auto pt-4">{footer}</div> : null}
    </>
  );

  if (!onClick) {
    return (
      <section className="card @container flex flex-col rounded-2xl p-3.5 @[22rem]:p-4">
        {body}
      </section>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? `${title}: ${value}${unit ? ` ${unit}` : ""}. Show detail`}
      className="card card-interactive @container flex w-full flex-col rounded-2xl p-3.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] @[22rem]:p-4"
    >
      {body}
    </button>
  );
}

/**
 * The 3-up stat row COROS puts under Training Status. Divided by hairlines
 * rather than boxed, so it reads as one footer instead of three tiles.
 */
export function StatRow({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  return (
    <div className="grid grid-cols-3 border-t border-line pt-3">
      {items.map((it, i) => (
        <div
          key={it.label}
          className={i > 0 ? "border-l border-line pl-2 @[22rem]:pl-3" : "pr-2 @[22rem]:pr-3"}
        >
          <p className="font-mono text-lg font-semibold tabular-nums @[22rem]:text-xl">
            {it.value}
          </p>
          <p className="mt-0.5 text-[11px] leading-tight text-muted @[22rem]:text-xs">
            {it.label}
          </p>
        </div>
      ))}
    </div>
  );
}
