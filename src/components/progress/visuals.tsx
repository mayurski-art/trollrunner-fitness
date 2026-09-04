"use client";

/**
 * The four visualization shapes COROS uses on its Progress cards, as inline
 * SVG. They are small, fixed-size and purely decorative-adjacent — the real
 * value is always the headline number beside them — so they carry aria-hidden
 * and the card's aria-label does the describing.
 *
 * Inline SVG rather than the charting library: these are 60-100px ornaments
 * drawn once per card, and Recharts' responsive container and tooltip layer
 * cost far more than they add at this size.
 */

/** Bar column with weekday letters — Weekly Training Load, Training Status. */
export function DayBars({
  values,
  labels,
  highlightIndex,
  peakLabel,
  color = "var(--brand)",
}: {
  values: number[];
  labels: string[];
  /** Index rendered in white (COROS marks today this way). */
  highlightIndex?: number;
  /** Value printed above the tallest bar. */
  peakLabel?: string;
  color?: string;
}) {
  const max = Math.max(...values, 1);
  const peakIndex = values.indexOf(Math.max(...values));
  const W = 128;
  const H = 46;
  const slot = W / values.length;
  const barW = 3;

  return (
    <div aria-hidden className="flex flex-col items-end">
      {peakLabel ? (
        <span className="mb-0.5 font-mono text-[10px] leading-none text-muted">
          {peakLabel}
        </span>
      ) : null}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="presentation">
        {values.map((v, i) => {
          const x = i * slot + slot / 2 - barW / 2;
          // Every day gets a visible track, so rest days read as "logged
          // nothing" rather than as missing data.
          const h = Math.max((v / max) * H, v > 0 ? 2 : 0);
          return (
            <g key={i}>
              <rect
                x={x}
                y={0}
                width={barW}
                height={H}
                rx={1.5}
                fill="currentColor"
                className="text-[var(--line)]"
              />
              {v > 0 ? (
                <rect
                  x={x}
                  y={H - h}
                  width={barW}
                  height={h}
                  rx={1.5}
                  fill={i === peakIndex ? color : color}
                  opacity={i === peakIndex ? 1 : 0.75}
                />
              ) : null}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex" style={{ width: W }}>
        {labels.map((l, i) => (
          <span
            key={i}
            className={`text-center text-[10px] leading-none ${
              i === highlightIndex ? "font-semibold text-foreground" : "text-muted"
            }`}
            style={{ width: slot }}
          >
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Semicircular arc — Recovery. Fills clockwise from the left. */
export function GaugeArc({
  pct,
  label,
  color = "#2dd4bf",
}: {
  pct: number;
  /** Word under the arc ("Fresh"). */
  label?: string;
  color?: string;
}) {
  const W = 116;
  // Height stops just under the arc's baseline so the caption sits tight
  // beneath it — an oversized viewBox would leave dead space and float the
  // word away from the gauge.
  const H = 52;
  const cx = W / 2;
  const cy = 48;
  const r = 44;
  const clamped = Math.max(0, Math.min(100, pct));
  // Semicircle: pi radians of sweep, so the arc length is pi*r.
  const len = Math.PI * r;
  const d = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  return (
    <div aria-hidden className="flex flex-col items-center">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="presentation">
        <path
          d={d}
          fill="none"
          stroke="var(--line)"
          strokeWidth={7}
          strokeLinecap="round"
        />
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * len} ${len}`}
        />
      </svg>
      {label ? (
        <span className="mt-1 text-[13px] leading-none text-muted">{label}</span>
      ) : null}
    </div>
  );
}

/** Needle dial over a colored sweep — Running Fitness. */
export function NeedleGauge({
  value,
  min = 0,
  max = 100,
}: {
  value: number;
  min?: number;
  max?: number;
}) {
  const W = 128;
  // As with GaugeArc: the box ends just below the sweep so the 0/100 endpoint
  // labels tuck under the dial instead of floating.
  const H = 62;
  const cx = W / 2;
  const cy = 56;
  const r = 46;
  const frac = Math.max(0, Math.min(1, (value - min) / (max - min)));
  // Sweep runs right-to-left across a semicircle: 180deg at min, 0deg at max.
  const angle = Math.PI * (1 - frac);
  const nx = cx + Math.cos(angle) * (r - 9);
  const ny = cy - Math.sin(angle) * (r - 9);

  const arc = (from: number, to: number) => {
    const a0 = Math.PI * (1 - from);
    const a1 = Math.PI * (1 - to);
    return `M ${cx + Math.cos(a0) * r} ${cy - Math.sin(a0) * r} A ${r} ${r} 0 0 1 ${
      cx + Math.cos(a1) * r
    } ${cy - Math.sin(a1) * r}`;
  };

  return (
    <div aria-hidden className="flex flex-col items-center">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="presentation">
        {/* Warm sweep, light on the left through to deep orange on the right. */}
        <path d={arc(0, 0.34)} fill="none" stroke="#fbbf24" strokeWidth={7} strokeLinecap="round" />
        <path d={arc(0.33, 0.67)} fill="none" stroke="#fb923c" strokeWidth={7} />
        <path d={arc(0.66, 1)} fill="none" stroke="#c2410c" strokeWidth={7} strokeLinecap="round" />
        <line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke="var(--foreground)"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={4} fill="var(--foreground)" />
      </svg>
      <div className="mt-0.5 flex w-full justify-between px-1">
        <span className="text-[10px] text-muted">{min}</span>
        <span className="text-[10px] text-muted">{max}</span>
      </div>
    </div>
  );
}
