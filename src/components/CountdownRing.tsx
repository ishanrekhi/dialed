"use client";

import { motion } from "framer-motion";

const RING_SIZE = 232; // visual diameter of the ring itself
const STROKE = 16;
const GLOW_PADDING = 24; // headroom so the widest glow layer isn't clipped by the SVG's own edge
const CANVAS = RING_SIZE + GLOW_PADDING * 2;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CENTER = CANVAS / 2;

export default function CountdownRing({
  daysLeft,
  windowDays,
  label,
}: {
  daysLeft: number;
  windowDays: number;
  label: string;
}) {
  const past = daysLeft < 0;
  const fraction = Math.max(0, Math.min(1, daysLeft / windowDays));
  const dashOffset = CIRCUMFERENCE * (1 - fraction);
  const target = past ? CIRCUMFERENCE : dashOffset;

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: CANVAS, height: CANVAS }}
    >
      <svg width={CANVAS} height={CANVAS} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
        {/* Rotated via native SVG transform (not a CSS transform on the svg
            element) so it doesn't fight with the layered strokes below —
            CSS filter + CSS rotate on an <svg> clips unevenly in Chromium. */}
        <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="var(--border)"
            strokeWidth={STROKE}
          />
          {/* Soft glow built from wider, dimmer strokes instead of a CSS
              filter — avoids drop-shadow's bounding-box artifacts. The
              canvas is padded beyond RING_SIZE so these don't clip either. */}
          <motion.circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={STROKE + 16}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            opacity={0.15}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: target }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          />
          <motion.circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={STROKE + 7}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            opacity={0.3}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: target }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          />
          <motion.circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: target }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          />
        </g>
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-6xl font-bold tracking-tight text-foreground tabular-nums">
          {Math.abs(daysLeft)}
        </span>
        <span className="mt-1 max-w-[160px] text-center text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          {past ? `since — ${label}` : label}
        </span>
      </div>
    </div>
  );
}
