"use client";

/* =========================================================================
   PageHeader — the first thing on every screen.

   Carries an eyebrow (what this is), a title (usually a sentence, not a
   noun) and the screen's actions. Keeping it in one component is what stops
   nine screens from inventing nine different headers.
   ========================================================================= */

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EASE_OUT } from "@/components/motion";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE_OUT }}
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <span className="inline-flex items-center gap-2.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-brass-ink">
            <span className="h-px w-6 bg-brass-ink/35" />
            {eyebrow}
          </span>
        ) : null}
        <h1 className="mt-2 text-[clamp(1.5rem,2.6vw,1.9rem)] font-extrabold leading-[1.15] tracking-[-0.025em] text-ink">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-ink-muted">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-none flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </motion.div>
  );
}
