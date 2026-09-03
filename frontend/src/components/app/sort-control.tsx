"use client";

/* =========================================================================
   SortControl — what order a list reads in.

   The same pill-and-panel language as DateRangeFilter: the trigger names
   the active field and points the way the list runs; picking another field
   sorts by it in that field's natural direction (dates and amounts biggest
   or newest first, text A→Z), picking the active one again flips it.

   `compareBy` does the ordering: numbers numerically, everything else with
   a numeric-aware localeCompare (so INV-9 sorts before INV-10), and empty
   values last regardless of direction — a missing client is noise, not the
   top of anything.
   ========================================================================= */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ChevronDown,
} from "lucide-react";
import { EASE_OUT } from "@/components/motion";
import { cn } from "@/lib/utils";

export type SortDir = "asc" | "desc";

export type SortField<K extends string> = {
  key: K;
  label: string;
  /** The direction this field starts in when first picked. */
  defaultDir: SortDir;
};

export type SortState<K extends string> = { key: K; dir: SortDir };

export function compareBy<T>(
  get: (row: T) => string | number | null | undefined,
  dir: SortDir
) {
  return (a: T, b: T) => {
    const av = get(a);
    const bv = get(b);
    const aEmpty = av == null || av === "";
    const bEmpty = bv == null || bv === "";
    if (aEmpty || bEmpty) return aEmpty === bEmpty ? 0 : aEmpty ? 1 : -1;
    const cmp =
      typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv), undefined, {
            numeric: true,
            sensitivity: "base",
          });
    return dir === "asc" ? cmp : -cmp;
  };
}

function DirIcon({ dir, className }: { dir: SortDir; className?: string }) {
  return dir === "asc" ? (
    <ArrowUpNarrowWide className={className} />
  ) : (
    <ArrowDownWideNarrow className={className} />
  );
}

export function SortControl<K extends string>({
  fields,
  value,
  onChange,
  align = "start",
  className,
}: {
  fields: SortField<K>[];
  value: SortState<K>;
  onChange: (next: SortState<K>) => void;
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

  const activeLabel =
    fields.find((f) => f.key === value.key)?.label ?? fields[0]?.label ?? "";

  const pick = (field: SortField<K>) => {
    /* Picking the active field again flips it; a new field starts in its
       own natural direction. */
    onChange(
      field.key === value.key
        ? { key: value.key, dir: value.dir === "asc" ? "desc" : "asc" }
        : { key: field.key, dir: field.defaultDir }
    );
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Sort by ${activeLabel}, ${
          value.dir === "asc" ? "ascending" : "descending"
        }`}
        className={cn(
          "flex h-10 items-center gap-2 rounded-[10px] bg-card px-3 text-[13px] font-semibold text-ink ring-1 ring-line transition-colors hover:bg-elevated/60",
          open && "ring-2 ring-brass-soft"
        )}
      >
        <DirIcon dir={value.dir} className="h-4 w-4 flex-none text-ink-muted" />
        <span className="whitespace-nowrap">{activeLabel}</span>
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
              "absolute z-[70] mt-1.5 w-48 origin-top rounded-[12px] bg-card p-1 shadow-[var(--shadow-dropdown)] ring-1 ring-line",
              align === "end" ? "left-0 sm:left-auto sm:right-0" : "left-0"
            )}
          >
            {fields.map((f) => {
              const selected = f.key === value.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => pick(f)}
                  title={selected ? "Flip direction" : undefined}
                  className={cn(
                    "flex w-full items-center justify-between rounded-[8px] px-2.5 py-2 text-[13px] font-medium transition-colors",
                    selected ? "text-brass-ink" : "text-ink hover:bg-elevated"
                  )}
                >
                  {f.label}
                  {selected ? (
                    <DirIcon dir={value.dir} className="h-3.5 w-3.5 flex-none" />
                  ) : null}
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
