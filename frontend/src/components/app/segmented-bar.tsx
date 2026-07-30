"use client";

/* =========================================================================
   SegmentedBar — one bar, several buckets.

   Used for receivables ageing. The ramp runs healthy → warming → bad
   (positive → brass → negative) rather than through a rainbow, so the
   colour actually means something. Every segment is also labelled, so the
   colour is never the only signal.
   ========================================================================= */

import { motion } from "framer-motion";
import { EASE_OUT } from "@/components/motion";
import { cn } from "@/lib/utils";

export type BarTone = "positive" | "soft" | "brass" | "strong" | "negative";

const FILL: Record<BarTone, string> = {
  positive: "bg-positive",
  soft: "bg-brass-soft",
  brass: "bg-brass",
  strong: "bg-brass-strong",
  negative: "bg-negative",
};

/** Ageing runs from healthy to overdue; extra buckets fall back to negative. */
export const AGEING_RAMP: BarTone[] = [
  "positive",
  "soft",
  "brass",
  "strong",
  "negative",
];

export type Segment = {
  label: string;
  amount: number;
  count: number;
  tone: BarTone;
};

export function SegmentedBar({
  segments,
  total,
  formatValue,
  className,
}: {
  segments: Segment[];
  total: number;
  formatValue: (n: number) => string;
  className?: string;
}) {
  const empty = total <= 0;

  return (
    <div className={className}>
      <div className="flex h-3 w-full gap-[3px] overflow-hidden rounded-full bg-elevated">
        {empty
          ? null
          : segments.map((s, i) => {
              const pct = (s.amount / total) * 100;
              if (pct <= 0) return null;
              return (
                <motion.span
                  key={s.label}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.9, delay: 0.15 + i * 0.08, ease: EASE_OUT }}
                  className={cn("h-full min-w-[4px] rounded-full", FILL[s.tone])}
                  title={`${s.label}: ${formatValue(s.amount)} (${s.count})`}
                />
              );
            })}
      </div>

      {/* A list, not a grid: these labels are long and the panel they sit in
          is narrow, so rows read far better than five squeezed columns. */}
      <ul className="mt-5">
        {segments.map((s, i) => {
          const pct = total > 0 ? Math.round((s.amount / total) * 100) : 0;
          return (
            <motion.li
              key={s.label}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.25 + i * 0.06, ease: EASE_OUT }}
              className="flex items-center gap-3 border-b border-line/70 py-2.5 last:border-0"
            >
              <span className={cn("h-2 w-2 flex-none rounded-[3px]", FILL[s.tone])} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-ink">
                  {s.label}
                </span>
                <span className="block text-[11px] text-ink-muted">
                  {s.count} {s.count === 1 ? "invoice" : "invoices"} · {pct}%
                </span>
              </span>
              <span className="flex-none text-[13.5px] font-bold tabular-nums text-ink">
                {formatValue(s.amount)}
              </span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
