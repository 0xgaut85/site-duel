"use client";

import { motion } from "motion/react";

/*
 * Cost-per-task comparison.
 *  - Top curve (rust): "flagship model on every task"
 *  - Bottom curve (ink/paper): "duel agents — cheapest model that wins"
 *
 * Both anchored to the same accuracy. The area between them is the saving.
 * Pure SVG, motion-driven path draw. No data libs.
 *
 * Layout
 * ──────
 * The graph is laid out in a CSS grid with TWO real columns:
 *
 *   [ Y-axis labels gutter | Plot area + legend ]
 *
 * so the plotted curves can never run *under* the dollar labels. Inside
 * the plot area, a small vertical legend (FLAGSHIP / DUEL AGENTS) sits
 * top-left, big mono, no dashes — colour is carried by the curves
 * themselves, so no swatches are needed.
 */

const FLAGSHIP: [number, number][] = [
  [0.0, 0.22],
  [0.1, 0.2],
  [0.2, 0.26],
  [0.3, 0.21],
  [0.4, 0.24],
  [0.5, 0.19],
  [0.6, 0.23],
  [0.7, 0.2],
  [0.8, 0.25],
  [0.9, 0.21],
  [1.0, 0.23],
];

const DUEL: [number, number][] = [
  [0.0, 0.78],
  [0.1, 0.74],
  [0.2, 0.82],
  [0.3, 0.66],
  [0.4, 0.8],
  [0.5, 0.72],
  [0.6, 0.86],
  [0.7, 0.78],
  [0.8, 0.82],
  [0.9, 0.74],
  [1.0, 0.84],
];

function toPath(points: [number, number][], w: number, h: number): string {
  return points
    .map(([x, y], i) => {
      const px = x * w;
      const py = y * h;
      return `${i === 0 ? "M" : "L"}${px.toFixed(2)},${py.toFixed(2)}`;
    })
    .join(" ");
}

function toAreaPath(
  top: [number, number][],
  bottom: [number, number][],
  w: number,
  h: number,
): string {
  const topPath = top
    .map(
      ([x, y], i) =>
        `${i === 0 ? "M" : "L"}${(x * w).toFixed(2)},${(y * h).toFixed(2)}`,
    )
    .join(" ");
  const bottomReversed = [...bottom].reverse();
  const bottomPath = bottomReversed
    .map(([x, y]) => `L${(x * w).toFixed(2)},${(y * h).toFixed(2)}`)
    .join(" ");
  return `${topPath} ${bottomPath} Z`;
}

export function LargeGraph({ darkBg }: { darkBg?: boolean } = {}) {
  const W = 1000;
  const H = 500;

  const flagshipPath = toPath(FLAGSHIP, W, H);
  const duelPath = toPath(DUEL, W, H);
  const areaPath = toAreaPath(FLAGSHIP, DUEL, W, H);

  const yTicks = [
    { t: 0.0, label: "$0.20" },
    { t: 0.25, label: "$0.15" },
    { t: 0.5, label: "$0.10" },
    { t: 0.75, label: "$0.05" },
    { t: 1.0, label: "$0.00" },
  ];

  const gridStroke = darkBg ? "rgba(255,255,255,0.12)" : "rgba(10,10,10,0.08)";
  const duelStroke = darkBg ? "var(--paper)" : "var(--ink)";
  const labelClass = darkBg ? "text-paper-faint" : "text-ink-faint";
  const legendStrong = darkBg ? "text-paper" : "text-ink";

  return (
    <div
      className="w-full h-full min-h-0 grid"
      style={{
        gridTemplateColumns: "clamp(3rem, 4.5vw, 4.5rem) 1fr",
        gridTemplateRows: "auto 1fr",
        columnGap: "clamp(0.5rem, 1vw, 1rem)",
        rowGap: "clamp(0.5rem, 1vw, 0.85rem)",
      }}
    >
      {/* Legend sits in the plot column (col 2), TOP row, pinned to
          the right. Two lines, stacked, large mono, no swatches. */}
      <div
        className="col-start-2 row-start-1 flex flex-col items-end gap-1.5 text-right pointer-events-none select-none"
        style={{
          fontSize: "clamp(12px, 1.05vw, 14px)",
          letterSpacing: "0.22em",
          lineHeight: 1.1,
        }}
      >
        <span
          className="font-mono font-medium"
          style={{ color: "var(--rust)" }}
        >
          FLAGSHIP-ONLY
        </span>
        <span className={`font-mono font-medium ${legendStrong}`}>
          DUEL AGENTS
        </span>
      </div>

      {/* Y-axis label gutter ─ its OWN column, so curves can never
          cross over the dollar values. Aligned to the plot row only. */}
      <div
        className={`col-start-1 row-start-2 flex flex-col justify-between font-mono pointer-events-none text-right ${labelClass}`}
        style={{
          fontSize: "clamp(10px, 0.85vw, 11.5px)",
          letterSpacing: "0.12em",
          paddingTop: 1,
          paddingBottom: 1,
        }}
      >
        {yTicks.map((tk) => (
          <span key={tk.label} className="leading-none tabular-nums">
            {tk.label}
          </span>
        ))}
      </div>

      {/* Plot area — only the SVG, no overlay. */}
      <div className="col-start-2 row-start-2 relative min-h-0">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
        >
          {/* Y grid */}
          {yTicks.map((tk) => (
            <line
              key={tk.label}
              x1={0}
              x2={W}
              y1={tk.t * H}
              y2={tk.t * H}
              stroke={gridStroke}
              strokeWidth={1}
            />
          ))}

          {/* Savings area — between flagship (top) and duel (low). */}
          <motion.path
            d={areaPath}
            fill="rgba(200, 74, 26, 0.10)"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{
              duration: 1.2,
              delay: 0.6,
              ease: [0.19, 1, 0.22, 1],
            }}
          />

          {/* Flagship line — rust */}
          <motion.path
            d={flagshipPath}
            fill="none"
            stroke="var(--rust)"
            strokeWidth={2}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1.6, ease: [0.19, 1, 0.22, 1] }}
          />

          {/* Duel line — ink on paper, paper on dark imagery */}
          <motion.path
            d={duelPath}
            fill="none"
            stroke={duelStroke}
            strokeWidth={2.5}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{
              duration: 1.8,
              delay: 0.2,
              ease: [0.19, 1, 0.22, 1],
            }}
          />
        </svg>
      </div>
    </div>
  );
}
