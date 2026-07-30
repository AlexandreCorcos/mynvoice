"use client";

/* =========================================================================
   Sparkline — shape without axes.

   Draws itself once on entry. Deliberately unlabelled: it's there to say
   "rising", "flat" or "spiky" at a glance, and the real chart is one click
   away. A flat series still renders a centred line rather than collapsing.
   ========================================================================= */

import { motion } from "framer-motion";
import { useId } from "react";
import { EASE_OUT, useCalmMotion } from "@/components/motion";

const W = 120;
const H = 40;

export function Sparkline({
  values,
  tone = "muted",
  delay = 0,
  filled = true,
}: {
  values: number[];
  tone?: "brass" | "muted";
  delay?: number;
  filled?: boolean;
}) {
  const gradientId = useId();
  const reduce = useCalmMotion();

  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    // A flat series has no span to scale against — sit it on the midline.
    const y = span === 0 ? H / 2 : H - 3 - ((v - min) / span) * (H - 6);
    return [x, y] as const;
  });

  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ");
  const area = `${line} L${W} ${H} L0 ${H} Z`;
  const stroke = tone === "brass" ? "var(--brass)" : "var(--ink-muted)";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-full w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={tone === "brass" ? 0.22 : 0.12} />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>

      {filled ? (
        <motion.path
          d={area}
          fill={`url(#${gradientId})`}
          initial={reduce ? undefined : { opacity: 0 }}
          animate={reduce ? undefined : { opacity: 1 }}
          transition={{ duration: 0.7, delay: delay + 0.4 }}
        />
      ) : null}

      <motion.path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        opacity={tone === "brass" ? 0.85 : 0.5}
        initial={reduce ? undefined : { pathLength: 0 }}
        animate={reduce ? undefined : { pathLength: 1 }}
        transition={{ duration: 1.1, delay, ease: EASE_OUT }}
      />
    </svg>
  );
}
