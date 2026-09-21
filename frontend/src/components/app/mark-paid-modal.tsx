"use client";

/* =========================================================================
   Mark as paid.

   Shared by the invoice list and the invoice detail. The money rarely
   arrives on the day it gets recorded, so the date is asked for alongside
   the method rather than stamped with today — revenue is cash-basis, and
   this date is the day the income lands in the ledger.
   ========================================================================= */

import { useEffect, useState } from "react";
import { Field, Input } from "@/components/app/form";
import { Modal } from "@/components/app/modal";
import type { PaymentMethod } from "@/types";

const PAYMENT_METHODS: { label: string; value: PaymentMethod }[] = [
  { label: "Bank transfer", value: "bank_transfer" },
  { label: "Card", value: "card" },
  { label: "Cash", value: "cash" },
  { label: "Other", value: "other" },
];

/** Today as YYYY-MM-DD in the viewer's own timezone — `toISOString()` is
    UTC, which is yesterday for anyone west of Greenwich late in the evening. */
function localToday() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function MarkPaidModal({
  open,
  onClose,
  onConfirm,
  busy = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (method: PaymentMethod, paymentDate: string) => void;
  busy?: boolean;
}) {
  const [date, setDate] = useState(localToday);

  /* Each opening starts from today, not from the last invoice's date. */
  useEffect(() => {
    if (open) setDate(localToday());
  }, [open]);

  const today = localToday();
  const valid = Boolean(date) && date <= today;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mark as paid"
      description="When and how did the money arrive? This is recorded against the invoice."
    >
      <div className="space-y-4">
        <Field label="Date received" required>
          <Input
            type="date"
            required
            max={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((pm) => (
            <button
              key={pm.value}
              disabled={busy || !valid}
              onClick={() => onConfirm(pm.value, date)}
              className="rounded-[10px] bg-card px-4 py-3 text-[13px] font-semibold text-ink ring-1 ring-line transition-colors hover:bg-brass hover:text-white hover:ring-brass disabled:pointer-events-none disabled:opacity-50"
            >
              {pm.label}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
