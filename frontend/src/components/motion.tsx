"use client";

import { motion, animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/* Shared foundations                                                  */
/*                                                                     */
/* The marketing page and the app both animate from here so the two    */
/* never drift apart. Landing-specific choreography still lives in     */
/* components/landing/primitives.tsx.                                  */
/* ------------------------------------------------------------------ */

/** House easing — a long, confident settle. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * `prefers-reduced-motion`, but hydration-safe.
 *
 * The raw hook reports `false` during SSR and the real value on the client,
 * so any component that changes its markup based on it mismatches on
 * hydration for the very people it's meant to help. Deferring to after mount
 * keeps the first client render identical to the server's.
 */
export function useCalmMotion() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Boolean(prefers);
}

/** A number that settles when it scrolls into view. */
export function CountUp({
  to,
  from = 0,
  duration = 1.4,
  decimals = 0,
  prefix = "",
  suffix = "",
  format,
  className,
}: {
  to: number;
  from?: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** Takes precedence over prefix/suffix/decimals — e.g. formatCurrency. */
  format?: (value: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useCalmMotion();
  const [value, setValue] = useState(from);

  useEffect(() => {
    // `reduce` only becomes true after mount, so jump to the final figure
    // rather than leaving the counter stranded at its starting value.
    if (reduce) {
      setValue(to);
      return;
    }
    if (!inView) return;
    const controls = animate(from, to, {
      duration,
      ease: EASE_OUT,
      onUpdate: setValue,
    });
    return () => controls.stop();
  }, [inView, from, to, duration, reduce]);

  return (
    <span ref={ref} className={className}>
      {format
        ? format(value)
        : `${prefix}${value.toLocaleString("en-GB", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          })}${suffix}`}
    </span>
  );
}

// Page transition wrapper
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
