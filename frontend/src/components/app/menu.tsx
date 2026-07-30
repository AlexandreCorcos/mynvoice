"use client";

/* =========================================================================
   Menu — the row-level "…" dropdown.

   Positioned fixed off the trigger's rect so it escapes any `overflow`
   on the table around it, and flipped upwards when it would run off the
   bottom of the viewport.
   ========================================================================= */

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { EASE_OUT } from "@/components/motion";
import { cn } from "@/lib/utils";

export type MenuItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onSelect?: () => void;
  tone?: "default" | "danger";
  /** Set false to leave the item out entirely. */
  show?: boolean;
};

const ESTIMATED_ITEM_HEIGHT = 34;

export function RowMenu({
  items,
  label = "Actions",
  className,
}: {
  items: MenuItem[];
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const visible = items.filter((i) => i.show !== false);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    /* The menu is fixed-positioned, so scrolling would leave it stranded. */
    window.addEventListener("scroll", () => setOpen(false), { once: true, capture: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    if (open) return setOpen(false);
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const height = visible.length * ESTIMATED_ITEM_HEIGHT + 12;
    const flip = r.bottom + height > window.innerHeight - 12;
    setPos({
      top: flip ? r.top - height - 6 : r.bottom + 6,
      right: window.innerWidth - r.right,
    });
    setOpen(true);
  }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          toggle();
        }}
        aria-label={label}
        aria-expanded={open}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-elevated hover:text-ink",
          open && "bg-elevated text-ink",
          className
        )}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {open && pos ? (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            style={{ top: pos.top, right: pos.right }}
            className="fixed z-[70] w-48 origin-top-right overflow-hidden rounded-[12px] bg-card p-1 shadow-[var(--shadow-dropdown)] ring-1 ring-line"
          >
            {visible.map((item) => {
              const content = (
                <>
                  <item.icon className="h-3.5 w-3.5 flex-none" />
                  {item.label}
                </>
              );
              const cls = cn(
                "flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] font-medium transition-colors",
                item.tone === "danger"
                  ? "text-negative hover:bg-negative/10"
                  : "text-ink hover:bg-elevated"
              );

              if (item.href) {
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cls}
                  >
                    {content}
                  </Link>
                );
              }
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    setOpen(false);
                    item.onSelect?.();
                  }}
                  className={cls}
                >
                  {content}
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
