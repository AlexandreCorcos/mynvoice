"use client";

/* =========================================================================
   Modal.

   Backdrop blurs rather than just dimming, the panel springs up from
   slightly below, and Escape / backdrop-click both close. Exit is faster
   than entry — dismissal should feel instant, arrival should feel placed.
   ========================================================================= */

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { EASE_OUT } from "@/components/motion";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "sm",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    /* Stop the page behind from scrolling under the panel. */
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  const width = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" }[size];

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-graphite/50 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.99, transition: { duration: 0.15 } }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
            /* Capped and scrollable: the client form is long, and a panel
               taller than the viewport hides its own submit button. */
            className={cn(
              "relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[20px] bg-card shadow-[var(--shadow-dropdown)] ring-1 ring-line sm:rounded-[18px]",
              width
            )}
          >
            <div className="flex flex-none items-start justify-between gap-4 p-5 pb-0">
              <div className="min-w-0">
                <h2 className="text-[16px] font-bold tracking-[-0.01em] text-ink">
                  {title}
                </h2>
                {description ? (
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                    {description}
                  </p>
                ) : null}
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="-mr-1 -mt-1 flex h-8 w-8 flex-none items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-elevated hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {children ? (
              <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
            ) : (
              <div className="h-5 flex-none" />
            )}

            {footer ? (
              <div className="flex flex-none flex-wrap justify-end gap-2 border-t border-line bg-elevated/40 px-5 py-3.5">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
