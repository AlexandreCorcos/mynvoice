"use client";

/* =========================================================================
   DateRangeFilter — which slice of time a screen is looking at.

   A pill that opens a small panel: the presets everyone reaches for, then a
   custom from/to for everything else. It emits inclusive ISO day strings
   (`YYYY-MM-DD`, null = unbounded) and leaves the filtering to the screen —
   `inDateRange` compares lexicographically, because ISO days sort as
   strings, which sidesteps Date parsing and timezone drift entirely.

   Calendar presets (this month, this year…) span their whole calendar
   period; "last N months" is a rolling window ending today.
   ========================================================================= */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarRange, Check, ChevronDown } from "lucide-react";
import { EASE_OUT } from "@/components/motion";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/app/button";

export type DateRangePreset =
  | "all"
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "last_6_months"
  | "this_year"
  | "custom";

export type DateRangeValue = {
  preset: DateRangePreset;
  /** Inclusive ISO days; null means unbounded on that side. */
  from: string | null;
  to: string | null;
};

export const ALL_TIME: DateRangeValue = { preset: "all", from: null, to: null };

/** Local calendar day — not `toISOString()`, which flips near midnight UTC. */
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

function rolling(months: number): Pick<DateRangeValue, "from" | "to"> {
  const now = new Date();
  const from = new Date(now);
  from.setMonth(from.getMonth() - months);
  return { from: iso(from), to: iso(now) };
}

const PRESETS: {
  preset: Exclude<DateRangePreset, "custom">;
  label: string;
  range: () => Pick<DateRangeValue, "from" | "to">;
}[] = [
  { preset: "all", label: "All time", range: () => ({ from: null, to: null }) },
  {
    preset: "this_month",
    label: "This month",
    range: () => {
      const n = new Date();
      return {
        from: iso(new Date(n.getFullYear(), n.getMonth(), 1)),
        to: iso(new Date(n.getFullYear(), n.getMonth() + 1, 0)),
      };
    },
  },
  {
    preset: "last_month",
    label: "Last month",
    range: () => {
      const n = new Date();
      return {
        from: iso(new Date(n.getFullYear(), n.getMonth() - 1, 1)),
        to: iso(new Date(n.getFullYear(), n.getMonth(), 0)),
      };
    },
  },
  { preset: "last_3_months", label: "Last 3 months", range: () => rolling(3) },
  { preset: "last_6_months", label: "Last 6 months", range: () => rolling(6) },
  {
    preset: "this_year",
    label: "This year",
    range: () => {
      const n = new Date();
      return {
        from: iso(new Date(n.getFullYear(), 0, 1)),
        to: iso(new Date(n.getFullYear(), 11, 31)),
      };
    },
  },
];

export function dateRangeLabel(v: DateRangeValue): string {
  if (v.preset === "custom") {
    if (v.from && v.to) return `${formatDate(v.from)} – ${formatDate(v.to)}`;
    if (v.from) return `From ${formatDate(v.from)}`;
    if (v.to) return `Until ${formatDate(v.to)}`;
    return "Custom range";
  }
  return PRESETS.find((p) => p.preset === v.preset)?.label ?? "All time";
}

/** True when the date's calendar day falls inside the range, ends inclusive. */
export function inDateRange(
  date: string | null | undefined,
  v: DateRangeValue
): boolean {
  if (!v.from && !v.to) return true;
  if (!date) return false;
  const day = date.slice(0, 10);
  if (v.from && day < v.from) return false;
  if (v.to && day > v.to) return false;
  return true;
}

const DATE_INPUT =
  "h-9 w-full rounded-[8px] bg-card px-2 text-[12.5px] text-ink ring-1 ring-line " +
  "transition-colors focus:outline-none focus:ring-2 focus:ring-brass-soft";

export function DateRangeFilter({
  value,
  onChange,
  align = "start",
  className,
}: {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
  /** Which edge of the trigger the panel hangs from once there's room. */
  align?: "start" | "end";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openPanel = () => {
    setDraftFrom(value.from ?? "");
    setDraftTo(value.to ?? "");
    setOpen(true);
  };

  const applyCustom = () => {
    const from = draftFrom || null;
    const to = draftTo || null;
    /* A backwards range is a slip of the mouse, not an intention. */
    const swap = Boolean(from && to && from > to);
    onChange({ preset: "custom", from: swap ? to : from, to: swap ? from : to });
    setOpen(false);
  };

  const active = value.preset !== "all";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Filter by date"
        className={cn(
          "flex h-10 items-center gap-2 rounded-[10px] bg-card px-3 text-[13px] font-semibold transition-colors",
          active
            ? "text-brass-ink ring-1 ring-brass/30"
            : "text-ink ring-1 ring-line hover:bg-elevated/60",
          open && "ring-2 ring-brass-soft"
        )}
      >
        <CalendarRange
          className={cn("h-4 w-4 flex-none", !active && "text-ink-muted")}
        />
        <span className="whitespace-nowrap">{dateRangeLabel(value)}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 flex-none text-ink-muted transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className={cn(
              "absolute z-[70] mt-1.5 w-72 origin-top rounded-[12px] bg-card p-1 shadow-[var(--shadow-dropdown)] ring-1 ring-line",
              align === "end" ? "left-0 sm:left-auto sm:right-0" : "left-0"
            )}
          >
            {PRESETS.map((p) => {
              const selected = value.preset === p.preset;
              return (
                <button
                  key={p.preset}
                  type="button"
                  onClick={() => {
                    onChange({ preset: p.preset, ...p.range() });
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-[8px] px-2.5 py-2 text-[13px] font-medium transition-colors",
                    selected ? "text-brass-ink" : "text-ink hover:bg-elevated"
                  )}
                >
                  {p.label}
                  {selected ? <Check className="h-3.5 w-3.5 flex-none" /> : null}
                </button>
              );
            })}

            <div className="mx-2.5 my-1.5 border-t border-line" />

            <div className="px-2.5 pb-2.5 pt-1">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Custom range
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-ink-muted">
                    From
                  </span>
                  <input
                    type="date"
                    value={draftFrom}
                    max={draftTo || undefined}
                    onChange={(e) => setDraftFrom(e.target.value)}
                    className={DATE_INPUT}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-ink-muted">
                    To
                  </span>
                  <input
                    type="date"
                    value={draftTo}
                    min={draftFrom || undefined}
                    onChange={(e) => setDraftTo(e.target.value)}
                    className={DATE_INPUT}
                  />
                </label>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={applyCustom}
                disabled={!draftFrom && !draftTo}
                className="mt-2.5 w-full"
              >
                Apply
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
