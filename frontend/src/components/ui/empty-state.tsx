"use client";

/* =========================================================================
   EmptyState.

   An empty screen is a moment to explain, not a hole. Icon, one honest
   sentence, and — where there is one — the action that fills it.
   ========================================================================= */

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { EASE_OUT } from "@/components/motion";
import { cn } from "@/lib/utils";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
      className={cn(
        "flex flex-col items-center justify-center rounded-[16px] border border-dashed border-line bg-card/50 px-8 py-16 text-center",
        className
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-elevated ring-1 ring-line">
        <Icon className="h-5 w-5 text-ink-muted" />
      </span>
      <h3 className="mt-4 text-[15px] font-bold tracking-[-0.01em] text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-muted">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </motion.div>
  );
}
