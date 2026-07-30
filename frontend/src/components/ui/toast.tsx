"use client";

/* =========================================================================
   Toast.

   A graphite pill in both themes — same surface as the sidebar — with the
   only colour in the icon chip. A full-bleed red or green banner would be
   the loudest thing on any screen it appears over, which is the wrong
   priority for a message that disappears in four seconds.
   ========================================================================= */

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, Info, X } from "lucide-react";
import { EASE_OUT } from "@/components/motion";

export type ToastType = "success" | "error" | "warning" | "info";

const ICONS = {
  success: CheckCircle,
  error: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
};

const CHIP: Record<ToastType, string> = {
  success: "bg-positive-on-dark/15 text-positive-on-dark",
  error: "bg-[#F08A84]/15 text-[#F08A84]",
  warning: "bg-brass-on-dark/15 text-brass-on-dark",
  info: "bg-white/10 text-white/70",
};

export default function Toast({
  message,
  type = "success",
  onClose,
  duration = 4000,
}: {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}) {
  const [open, setOpen] = useState(true);
  const Icon = ICONS[type];

  useEffect(() => {
    const timer = setTimeout(() => setOpen(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  return (
    <AnimatePresence onExitComplete={onClose}>
      {open ? (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.18 } }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
          className="fixed bottom-5 right-5 z-[100] flex max-w-[calc(100vw-2.5rem)] items-center gap-3 rounded-[14px] bg-graphite py-3 pl-3 pr-2.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)] ring-1 ring-white/10"
        >
          <span
            className={`flex h-8 w-8 flex-none items-center justify-center rounded-[10px] ${CHIP[type]}`}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-[13px] font-medium text-white">{message}</span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Dismiss"
            className="ml-1 flex h-7 w-7 flex-none items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
