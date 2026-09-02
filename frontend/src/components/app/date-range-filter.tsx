"use client";

/* =========================================================================
   DateRangeFilter — which slice of time a screen is looking at.

   A pill that opens a small panel: the presets everyone reaches for, then a
   flight-booking calendar for everything else — click the first day, the
   calendar stays open, click the last day and the range applies. No Apply
   button, no separate from/to fields.

   It emits inclusive ISO day strings (`YYYY-MM-DD`, null = unbounded) and
   leaves the filtering to the screen — `inDateRange` compares
   lexicographically, because ISO days sort as strings, which sidesteps Date
   parsing and timezone drift entirely.

   Calendar presets (this month, this year…) span their whole calendar
   period; "last N months" is a rolling window ending today.
   ========================================================================= */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarRange,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { EASE_OUT } from "@/components/motion";
import { cn, formatDate } from "@/lib/utils";

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

/* ------------------------------------------------------------------ */
/* Calendar                                                            */
/* ------------------------------------------------------------------ */

function NavButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-[7px] text-ink-muted transition-colors hover:bg-elevated hover:text-ink"
    >
      {children}
    </button>
  );
}

function RangeCalendar({
  from,
  to,
  onPick,
}: {
  /** The applied custom range — painted until a new selection starts. */
  from: string | null;
  to: string | null;
  /** Called with an ordered, complete pair — the second click. */
  onPick: (from: string, to: string) => void;
}) {
  const [anchor, setAnchor] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [view, setView] = useState<Date>(() => {
    const seed = from ?? iso(new Date());
    return new Date(Number(seed.slice(0, 4)), Number(seed.slice(5, 7)) - 1, 1);
  });

  const today = iso(new Date());
  const y = view.getFullYear();
  const m = view.getMonth();
  const firstIdx = (new Date(y, m, 1).getDay() + 6) % 7; // weeks start Monday
  const days = new Date(y, m + 1, 0).getDate();
  const monthLabel = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(view);

  /* What the grid paints: a selection in progress wins over the applied one.
     While only the first day is picked, hovering previews the span — the
     part that makes it read like booking a flight. */
  const [lo, hi] =
    anchor && hovered && hovered > anchor
      ? [anchor, hovered]
      : anchor
        ? [anchor, anchor]
        : from && to
          ? [from, to]
          : [null, null];

  const pick = (day: string) => {
    /* First click — or a click before the first day — starts over. */
    if (!anchor || day < anchor) {
      setAnchor(day);
      return;
    }
    onPick(anchor, day);
    setAnchor(null);
    setHovered(null);
  };

  return (
    <div onMouseLeave={() => setHovered(null)}>
      <div className="flex items-center justify-between pb-1.5">
        <div className="flex">
          <NavButton onClick={() => setView(new Date(y - 1, m, 1))} label="Previous year">
            <ChevronsLeft className="h-3.5 w-3.5" />
          </NavButton>
          <NavButton onClick={() => setView(new Date(y, m - 1, 1))} label="Previous month">
            <ChevronLeft className="h-3.5 w-3.5" />
          </NavButton>
        </div>
        <span className="text-[12.5px] font-bold text-ink">{monthLabel}</span>
        <div className="flex">
          <NavButton onClick={() => setView(new Date(y, m + 1, 1))} label="Next month">
            <ChevronRight className="h-3.5 w-3.5" />
          </NavButton>
          <NavButton onClick={() => setView(new Date(y + 1, m, 1))} label="Next year">
            <ChevronsRight className="h-3.5 w-3.5" />
          </NavButton>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <span
            key={d}
            className="pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
          >
            {d}
          </span>
        ))}

        {Array.from({ length: firstIdx }).map((_, i) => (
          <span key={`blank-${i}`} />
        ))}

        {Array.from({ length: days }).map((_, i) => {
          const day = iso(new Date(y, m, i + 1));
          const isStart = day === lo;
          const isEnd = day === hi;
          const inBand = Boolean(lo && hi && day >= lo && day <= hi);
          return (
            /* The tint lives on the wrapper so it can run edge-to-edge and
               only round off at the ends of the band. */
            <span
              key={day}
              className={cn(
                inBand && "bg-brass/[0.08]",
                isStart && "rounded-l-[9px]",
                isEnd && "rounded-r-[9px]"
              )}
            >
              <button
                type="button"
                onClick={() => pick(day)}
                onMouseEnter={() => setHovered(day)}
                aria-label={formatDate(day)}
                aria-pressed={isStart || isEnd}
                className={cn(
                  "flex h-9 w-full items-center justify-center rounded-[9px] text-[12.5px] tabular-nums transition-colors",
                  isStart || isEnd
                    ? "bg-brass font-semibold text-white"
                    : inBand
                      ? "text-ink"
                      : "text-ink hover:bg-elevated",
                  day === today && !isStart && !isEnd && "font-bold text-brass-ink"
                )}
              >
                {i + 1}
              </button>
            </span>
          );
        })}
      </div>

      <p className="pt-2 text-center text-[11px] text-ink-muted">
        {anchor
          ? `${formatDate(anchor)} — now pick the last day`
          : "Pick the first day"}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Filter                                                              */
/* ------------------------------------------------------------------ */

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

  const active = value.preset !== "all";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
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
            <div className="grid grid-cols-2 gap-0.5">
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
                      "flex items-center justify-between rounded-[8px] px-2.5 py-2 text-[12.5px] font-medium transition-colors",
                      selected ? "text-brass-ink" : "text-ink hover:bg-elevated"
                    )}
                  >
                    <span className="whitespace-nowrap">{p.label}</span>
                    {selected ? <Check className="h-3 w-3 flex-none" /> : null}
                  </button>
                );
              })}
            </div>

            <div className="mx-2.5 my-1.5 border-t border-line" />

            <div className="px-2 pb-2 pt-1">
              <RangeCalendar
                from={value.preset === "custom" ? value.from : null}
                to={value.preset === "custom" ? value.to : null}
                onPick={(from, to) => {
                  onChange({ preset: "custom", from, to });
                  setOpen(false);
                }}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
