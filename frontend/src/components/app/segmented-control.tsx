"use client";

/* =========================================================================
   SegmentedControl — filter tabs.

   The selected background is one pill that springs between options via a
   shared `layoutId`, same idea as the sidebar. Counts are optional and sit
   inside the option so the filter tells you what's behind it before you
   click.
   ========================================================================= */

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  count?: number;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  /** Must be unique per control on the page — it names the sliding pill. */
  layoutId,
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  layoutId: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-[12px] bg-elevated p-1 ring-1 ring-line",
        className
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex-none rounded-[9px] px-3 py-1.5 text-[12.5px] font-semibold transition-colors duration-200",
              active ? "text-ink" : "text-ink-muted hover:text-ink"
            )}
          >
            {active ? (
              <motion.span
                layoutId={layoutId}
                transition={{ type: "spring", stiffness: 480, damping: 40 }}
                className="absolute inset-0 -z-10 rounded-[9px] bg-card shadow-[var(--shadow-card)]"
              />
            ) : null}
            <span className="whitespace-nowrap">
              {o.label}
              {typeof o.count === "number" ? (
                <span
                  className={cn(
                    "ml-1.5 tabular-nums",
                    active ? "text-brass-ink" : "text-ink-muted/70"
                  )}
                >
                  {o.count}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
