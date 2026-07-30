import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/types";

/* =========================================================================
   StatusBadge.

   Colour never carries the meaning on its own — every badge has a dot and
   a word. Draft is neutral (nothing has happened yet), sent is brass (it's
   in flight), paid is positive, overdue is negative. Those are the only
   four states the system has, so they get the four tones it has.
   ========================================================================= */

const STYLES: Record<InvoiceStatus, { chip: string; dot: string; label: string }> = {
  draft: {
    chip: "bg-elevated text-ink-muted ring-line",
    dot: "bg-ink-muted/60",
    label: "Draft",
  },
  sent: {
    chip: "bg-brass/[0.09] text-brass-ink ring-brass/15",
    dot: "bg-brass",
    label: "Sent",
  },
  paid: {
    chip: "bg-positive/10 text-positive ring-positive/20",
    dot: "bg-positive",
    label: "Paid",
  },
  overdue: {
    chip: "bg-negative/10 text-negative ring-negative/20",
    dot: "bg-negative",
    label: "Overdue",
  },
};

export default function StatusBadge({
  status,
  size = "md",
  className,
}: {
  status: InvoiceStatus;
  size?: "sm" | "md";
  className?: string;
}) {
  const s = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex flex-none items-center gap-1.5 rounded-full font-semibold ring-1",
        size === "sm" ? "px-2 py-0.5 text-[10.5px]" : "px-2.5 py-1 text-[11.5px]",
        s.chip,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}
