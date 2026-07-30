"use client";

/* =========================================================================
   MetricCard — the headline figure.

   One number, told properly: a count-up so the figure lands rather than
   appears, a sparkline for shape, and a delta chip that pairs its colour
   with a glyph so it never relies on colour alone.

   Tone decides the accent. `brass` is for the single most important figure
   on a screen — never more than one per row, or the highlight stops meaning
   anything.
   ========================================================================= */

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { CountUp, EASE_OUT } from "@/components/motion";
import { Sparkline } from "./sparkline";
import { cn } from "@/lib/utils";

export type MetricTone = "default" | "brass" | "positive" | "negative";

const ICON_TONE: Record<MetricTone, string> = {
  default: "bg-elevated text-ink-muted ring-line",
  brass: "bg-brass/[0.09] text-brass-ink ring-brass/15",
  positive: "bg-positive/10 text-positive ring-positive/20",
  negative: "bg-negative/10 text-negative ring-negative/20",
};

export function MetricCard({
  label,
  value,
  format,
  icon: Icon,
  tone = "default",
  delta,
  deltaUp,
  caption,
  series,
  href,
  index = 0,
}: {
  label: string;
  /** Raw number so it can count up; pass `format` to render it. */
  value: number;
  format?: (n: number) => string;
  icon: LucideIcon;
  tone?: MetricTone;
  /** e.g. "+18%" — rendered with a direction glyph. */
  delta?: string;
  deltaUp?: boolean;
  caption?: ReactNode;
  /** Optional shape behind the number. */
  series?: number[];
  href?: string;
  /** Position in the row, used to stagger the entrance. */
  index?: number;
}) {
  const body = (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.07, ease: EASE_OUT }}
      whileHover={href ? { y: -3 } : undefined}
      className={cn(
        "group relative h-full overflow-hidden rounded-[16px] bg-card p-5 ring-1 ring-line",
        "shadow-[var(--shadow-card)] transition-shadow duration-300",
        href && "hover:shadow-[var(--shadow-card-hover)]"
      )}
    >
      {/* The shape sits low, quiet and faded at the top so it never competes
          with the figure it belongs to. */}
      {series && series.length > 1 ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-11 opacity-60"
          style={{
            maskImage: "linear-gradient(to bottom, transparent, black 55%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent, black 55%)",
          }}
        >
          <Sparkline
            values={series}
            tone={tone === "brass" ? "brass" : "muted"}
            delay={0.25 + index * 0.07}
          />
        </div>
      ) : null}

      <div className="relative flex items-start justify-between gap-3">
        <p className="text-[12.5px] font-medium text-ink-muted">{label}</p>
        <span
          className={cn(
            "flex h-8 w-8 flex-none items-center justify-center rounded-[10px] ring-1",
            ICON_TONE[tone]
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <p className="relative mt-2 text-[26px] font-extrabold leading-none tracking-[-0.02em] tabular-nums text-ink">
        <CountUp to={value} format={format} duration={1.3} />
      </p>

      <div className="relative mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        {delta ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
              deltaUp
                ? "bg-positive/10 text-positive"
                : "bg-negative/10 text-negative"
            )}
          >
            <span aria-hidden>{deltaUp ? "▲" : "▼"}</span>
            {delta}
          </span>
        ) : null}
        {caption ? (
          <span className="text-[11.5px] text-ink-muted">{caption}</span>
        ) : null}
        {href ? (
          <ArrowRight className="ml-auto h-3.5 w-3.5 text-ink-muted opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100" />
        ) : null}
      </div>
    </motion.div>
  );

  if (!href) return body;
  return (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  );
}
