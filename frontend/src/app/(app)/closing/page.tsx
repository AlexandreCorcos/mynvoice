"use client";

/* =========================================================================
   Closing — the list of accounting periods.

   Each period is a date window over the Transactions ledger. You tick its
   entries off against the bank statement, then close it. Closing is soft: a
   period can be reopened and adjusted at any time, and a snapshot of its
   totals is kept so later edits show up as drift.
   ========================================================================= */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, Lock, Plus, Unlock } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatCurrency, formatDate, num } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { EASE_OUT } from "@/components/motion";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/app/button";
import { Field, Input } from "@/components/app/form";
import { Modal } from "@/components/app/modal";
import EmptyState from "@/components/ui/empty-state";
import type { AccountingPeriod } from "@/types";

/* First day of the month after the given YYYY-MM-DD date. */
function nextMonthRange(afterEnd: string | null): {
  name: string;
  start: string;
  end: string;
} {
  const base = afterEnd ? new Date(afterEnd) : new Date();
  const y = base.getFullYear();
  const m = afterEnd ? base.getMonth() + 1 : base.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0); // last day of that month
  const iso = (d: Date) => d.toISOString().split("T")[0];
  const name = start.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
  return { name, start: iso(start), end: iso(end) };
}

function NewPeriodModal({
  open,
  suggestion,
  onClose,
  onCreated,
}: {
  open: boolean;
  suggestion: { name: string; start: string; end: string };
  onClose: () => void;
  onCreated: (p: AccountingPeriod) => void;
}) {
  const [form, setForm] = useState(suggestion);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(suggestion);
      setError("");
    }
  }, [open, suggestion]);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const created = await api.post<AccountingPeriod>("/periods/", {
        name: form.name,
        start_date: form.start,
        end_date: form.end,
      });
      onCreated(created);
    } catch (err) {
      setError(
        (err as { message?: string })?.message ||
          "Couldn't create the period. Check the dates don't overlap another."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="New period"
      description="A date window to reconcile and close, usually a month."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="period-form" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? "Creating…" : "Create period"}
          </Button>
        </>
      }
    >
      <form id="period-form" onSubmit={submit} className="space-y-3.5">
        {error ? (
          <p className="rounded-[10px] bg-negative/10 px-3.5 py-2.5 text-[12.5px] font-medium text-negative ring-1 ring-negative/20">
            {error}
          </p>
        ) : null}
        <Field label="Name" required>
          <Input
            required
            autoFocus
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="August 2026"
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="From" required>
            <Input
              type="date"
              required
              value={form.start}
              onChange={(e) => set({ start: e.target.value })}
            />
          </Field>
          <Field label="To" required>
            <Input
              type="date"
              required
              value={form.end}
              onChange={(e) => set({ end: e.target.value })}
            />
          </Field>
        </div>
      </form>
    </Modal>
  );
}

export default function ClosingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const currency = user?.currency || "GBP";

  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const data = await api.get<AccountingPeriod[]>("/periods/");
      setPeriods(data);
    } catch {
      /* empty state covers it */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const suggestion = useMemo(() => {
    const latestEnd = periods.length
      ? periods.reduce((max, p) => (p.end_date > max ? p.end_date : max), periods[0].end_date)
      : null;
    return nextMonthRange(latestEnd);
  }, [periods]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Closing"
        title="Close the books, month by month."
        subtitle="Reconcile each period against your bank, then lock in the numbers."
        actions={
          <Button variant="primary" onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" />
            New period
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[68px] animate-pulse rounded-[14px] bg-elevated" />
          ))}
        </div>
      ) : periods.length === 0 ? (
        <EmptyState
          icon={Lock}
          title="No periods yet"
          description="Create your first period — a month is the usual unit — reconcile its transactions against the bank, and close it."
          action={
            <Button variant="primary" onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" />
              New period
            </Button>
          }
        />
      ) : (
        <motion.div layout className="space-y-2">
          <AnimatePresence initial={false}>
            {periods.map((p, i) => {
              const net = p.is_closed ? num(p.snapshot_net) : p.net;
              const ticked = p.is_closed
                ? num(p.snapshot_reconciled_count)
                : p.reconciled_count;
              const total = p.is_closed ? num(p.snapshot_entry_count) : p.entry_count;
              return (
                <motion.button
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: Math.min(i, 8) * 0.03, ease: EASE_OUT }}
                  onClick={() => router.push(`/closing/${p.id}`)}
                  className="flex w-full items-center gap-4 rounded-[14px] bg-card px-4 py-3.5 text-left ring-1 ring-line transition-all duration-200 hover:shadow-[var(--shadow-card-hover)] hover:ring-brass-soft/40"
                >
                  <span
                    className={cn(
                      "hidden h-9 w-9 flex-none items-center justify-center rounded-[11px] sm:flex",
                      p.is_closed
                        ? "bg-elevated text-ink-muted"
                        : "bg-brass/[0.09] text-brass-ink"
                    )}
                  >
                    {p.is_closed ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <Unlock className="h-4 w-4" />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[14px] font-bold tracking-[-0.01em] text-ink">
                        {p.name}
                      </span>
                      <span
                        className={cn(
                          "inline-flex flex-none items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1",
                          p.is_closed
                            ? "bg-positive/10 text-positive ring-positive/20"
                            : "bg-elevated text-ink-muted ring-line"
                        )}
                      >
                        {p.is_closed ? (
                          <>
                            <CheckCircle2 className="h-2.5 w-2.5" /> Closed
                          </>
                        ) : (
                          "Open"
                        )}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-[12.5px] text-ink-muted">
                      {formatDate(p.start_date)} – {formatDate(p.end_date)}
                      {total > 0 ? ` · ${ticked}/${total} ticked off` : ""}
                    </span>
                  </span>

                  <span className="text-right">
                    <span
                      className={cn(
                        "block text-[14.5px] font-bold tabular-nums",
                        net >= 0 ? "text-positive" : "text-negative"
                      )}
                    >
                      {net >= 0 ? "+" : "−"}
                      {formatCurrency(Math.abs(net), currency)}
                    </span>
                    <span className="block text-[11px] text-ink-muted">net</span>
                  </span>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      <NewPeriodModal
        open={newOpen}
        suggestion={suggestion}
        onClose={() => setNewOpen(false)}
        onCreated={(p) => {
          setNewOpen(false);
          router.push(`/closing/${p.id}`);
        }}
      />
    </div>
  );
}
