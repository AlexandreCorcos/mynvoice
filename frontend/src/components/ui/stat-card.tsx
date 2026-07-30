"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  accent?: boolean;
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendUp,
  accent,
}: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]",
        accent
          ? "bg-brass text-white dark:bg-brass"
          : "bg-white dark:bg-graphite dark:border dark:border-white/10"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p
            className={cn(
              "text-sm font-medium",
              accent
                ? "text-white/70"
                : "text-ink-muted dark:text-white/50"
            )}
          >
            {label}
          </p>
          <motion.p
            key={value}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "mt-1.5 text-2xl font-bold",
              !accent && "dark:text-white"
            )}
          >
            {value}
          </motion.p>
          {trend && (
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                // On the brass-filled card no small chromatic text can reach
                // 4.5:1, so direction is carried by the glyph and the text
                // stays near-white.
                accent
                  ? "text-white/85"
                  : trendUp === undefined
                    ? "text-ink-muted dark:text-white/50"
                    : trendUp
                      ? "text-positive"
                      : "text-negative"
              )}
            >
              {trendUp !== undefined && (
                <span aria-hidden="true" className="mr-1">
                  {trendUp ? "▲" : "▼"}
                </span>
              )}
              {trend}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            accent
              ? "bg-white/15"
              : "bg-surface dark:bg-white/10"
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5",
              accent ? "text-white" : "text-brass-ink dark:text-brass-soft"
            )}
          />
        </div>
      </div>
    </motion.div>
  );
}
