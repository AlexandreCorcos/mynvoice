"use client";

/* =========================================================================
   Panel — the one card the whole app is built from.

   Token-only: `bg-card`, `ring-line`, `text-ink`. No `dark:` overrides
   anywhere, because every token already has a dark value. If you find
   yourself reaching for `dark:` in a screen, the fix is a token.
   ========================================================================= */

import { motion } from "framer-motion";
import type { ComponentProps, ReactNode } from "react";
import { EASE_OUT } from "@/components/motion";
import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
  padded = true,
  hover = false,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  /** Set false when the content manages its own padding (tables, lists). */
  padded?: boolean;
  /** Lift on hover — only for panels that are themselves a link or button. */
  hover?: boolean;
} & Omit<ComponentProps<typeof motion.div>, "children">) {
  return (
    <motion.div
      whileHover={hover ? { y: -3 } : undefined}
      transition={{ duration: 0.3, ease: EASE_OUT }}
      className={cn(
        "relative overflow-hidden rounded-[16px] bg-card ring-1 ring-line",
        "shadow-[var(--shadow-card)]",
        hover && "transition-shadow duration-300 hover:shadow-[var(--shadow-card-hover)]",
        padded && "p-5 sm:p-6",
        className
      )}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Title row for a panel: label, optional caption, optional right-hand slot. */
export function PanelHeader({
  title,
  caption,
  action,
  className,
}: {
  title: ReactNode;
  caption?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-bold tracking-[-0.01em] text-ink">{title}</h2>
        {caption ? (
          <p className="mt-0.5 text-[12.5px] text-ink-muted">{caption}</p>
        ) : null}
      </div>
      {action ? <div className="flex-none">{action}</div> : null}
    </div>
  );
}

/** Small uppercase label used above numbers and in table heads. */
export function Overline({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted",
        className
      )}
    >
      {children}
    </span>
  );
}

/** A hairline that spans a panel's full width, ignoring its padding. */
export function PanelRule({ className }: { className?: string }) {
  return <div className={cn("-mx-5 h-px bg-line sm:-mx-6", className)} />;
}
