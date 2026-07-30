"use client";

/* =========================================================================
   Button.

   Hierarchy comes from fill vs outline, never from a second hue — there is
   only one chromatic in this system. `primary` is a solid brass fill with
   white text; everything else is neutral. One primary per view.
   ========================================================================= */

import Link from "next/link";
import { motion } from "framer-motion";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-brass text-white shadow-[0_1px_2px_rgba(28,25,23,0.12)] hover:bg-brass-strong",
  secondary:
    "bg-card text-ink ring-1 ring-line hover:bg-elevated",
  ghost: "text-ink-muted hover:bg-elevated hover:text-ink",
  danger:
    "bg-negative/10 text-negative ring-1 ring-negative/20 hover:bg-negative/15",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 gap-1.5 px-3 text-[12.5px] rounded-[9px]",
  md: "h-10 gap-2 px-4 text-[13.5px] rounded-[10px]",
};

const base =
  "inline-flex items-center justify-center font-semibold transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50";

export function Button({
  children,
  variant = "secondary",
  size = "md",
  className,
  ...rest
}: {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
} & ComponentProps<typeof motion.button>) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.12 }}
      className={cn(base, VARIANT[variant], SIZE[size], className)}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

export function ButtonLink({
  children,
  href,
  variant = "secondary",
  size = "md",
  className,
  ...rest
}: {
  children: ReactNode;
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
} & Omit<ComponentProps<typeof Link>, "href" | "className">) {
  return (
    <Link
      href={href}
      className={cn(base, VARIANT[variant], SIZE[size], "active:scale-[0.98]", className)}
      {...rest}
    >
      {children}
    </Link>
  );
}
