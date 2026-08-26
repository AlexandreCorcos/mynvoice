"use client";

/* =========================================================================
   Closing — the period detail / reconciliation screen.

   Tick each transaction off against the bank statement, watch the progress
   fill, then close the period. Closing stamps a snapshot; if anything in the
   range changes afterwards a "changed since close" banner appears, and the
   period can always be reopened.
   ========================================================================= */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Download,
  Loader2,
  Lock,
  Pencil,
  Trash2,
  TriangleAlert,
  Unlock,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatCurrency, formatDate, num } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { EASE_OUT } from "@/components/motion";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/app/button";
import { Panel, PanelHeader } from "@/components/app/panel";
import { Field, Input } from "@/components/app/form";
import { Modal } from "@/components/app/modal";
import Toast, { type ToastType } from "@/components/ui/toast";
import type { AccountingPeriod, Expense } from "@/types";

function csvCell(value: unknown): string {
  const s = String(value ?? "");
  // Guard against spreadsheet formula injection.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export default function ClosingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const currency = user?.currency || "GBP";

  const [period, setPeriod] = useState<AccountingPeriod | null>(null);
  const [entries, setEntries] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const p = await api.get<AccountingPeriod>(`/periods/${params.id}`);
      setPeriod(p);
      const rows = await api.get<Expense[]>(
        `/expenses/?date_from=${p.start_date}&date_to=${p.end_date}&limit=500`
      );
      setEntries(rows);
    } catch {
      router.push("/closing");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* Live totals from what's on screen now. */
  const totals = useMemo(() => {
    const income = entries
      .filter((e) => e.kind === "income")
      .reduce((s, e) => s + num(e.amount), 0);
    const expense = entries
      .filter((e) => e.kind === "expense")
      .reduce((s, e) => s + num(e.amount), 0);
    const reconciled = entries.filter((e) => e.reconciled_at).length;
    return {
      income,
      expense,
      net: income - expense,
      count: entries.length,
      reconciled,
    };
  }, [entries]);

  /* When closed, has anything in the window changed since the snapshot? */
  const drift = useMemo(() => {
    if (!period?.is_closed) return null;
    const changed =
      num(period.snapshot_net) !== totals.net ||
      num(period.snapshot_entry_count) !== totals.count ||
      num(period.snapshot_income) !== totals.income ||
      num(period.snapshot_expense) !== totals.expense;
    return changed
      ? { snapshotNet: num(period.snapshot_net), liveNet: totals.net }
      : null;
  }, [period, totals]);

  const closed = period?.is_closed ?? false;
  const allTicked = totals.count > 0 && totals.reconciled === totals.count;

  const toggleTick = async (e: Expense) => {
    const on = !e.reconciled_at;
    // Optimistic: flip locally, then persist.
    setEntries((prev) =>
      prev.map((x) =>
        x.id === e.id
          ? { ...x, reconciled_at: on ? new Date().toISOString() : null }
          : x
      )
    );
    try {
      await api.post(`/expenses/${e.id}/${on ? "reconcile" : "unreconcile"}`);
    } catch {
      fetchAll();
    }
  };

  const tickAll = async (on: boolean) => {
    setBusy(true);
    const ids = entries.map((e) => e.id);
    setEntries((prev) =>
      prev.map((x) => ({
        ...x,
        reconciled_at: on ? x.reconciled_at ?? new Date().toISOString() : null,
      }))
    );
    try {
      await api.post(`/expenses/reconcile-bulk`, { ids, reconciled: on });
    } catch {
      fetchAll();
    } finally {
      setBusy(false);
    }
  };

  const doClose = async () => {
    setBusy(true);
    try {
      const p = await api.post<AccountingPeriod>(`/periods/${params.id}/close`);
      setPeriod(p);
      setCloseOpen(false);
      setToast({ message: "Period closed.", type: "success" });
    } catch {
      setToast({ message: "Couldn't close the period.", type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const doReopen = async () => {
    setBusy(true);
    try {
      const p = await api.post<AccountingPeriod>(`/periods/${params.id}/reopen`);
      setPeriod(p);
      setToast({ message: "Period reopened.", type: "success" });
    } catch {
      setToast({ message: "Couldn't reopen the period.", type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    try {
      await api.delete(`/periods/${params.id}`);
      router.push("/closing");
    } catch {
      setToast({ message: "Couldn't delete the period.", type: "error" });
      setDeleteOpen(false);
    }
  };

  const [downloading, setDownloading] = useState(false);

  const exportPdf = async () => {
    if (!period) return;
    setDownloading(true);
    try {
      const res = await api.raw(`/periods/${period.id}/pdf`);
      if (!res.ok) {
        setToast({ message: "Couldn't generate the PDF.", type: "error" });
        return;
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `${period.name.replace(/[^\w-]+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setToast({ message: "Couldn't reach the server to build the PDF.", type: "error" });
    } finally {
      setDownloading(false);
    }
  };

  const exportCsv = () => {
    if (!period) return;
    const header = ["Date", "Type", "Description", "Amount", "Reconciled"];
    const lines = [header.map(csvCell).join(",")];
    for (const e of entries) {
      lines.push(
        [
          e.expense_date,
          e.kind,
          e.description,
          num(e.amount).toFixed(2),
          e.reconciled_at ? "yes" : "no",
        ]
          .map(csvCell)
          .join(",")
      );
    }
    const blob = new Blob([lines.join("\r\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${period.name.replace(/[^\w-]+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-4 w-32 animate-pulse rounded-full bg-elevated" />
        <div className="h-40 animate-pulse rounded-[16px] bg-elevated" />
        <div className="h-96 animate-pulse rounded-[16px] bg-elevated" />
      </div>
    );
  }
  if (!period) return null;

  const pct = totals.count ? Math.round((totals.reconciled / totals.count) * 100) : 0;

  return (
    <div className="space-y-5">
      <Link
        href="/closing"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to closing
      </Link>

      <PageHeader
        eyebrow={`${formatDate(period.start_date)} – ${formatDate(period.end_date)}`}
        title={period.name}
        actions={
          <>
            <Button variant="secondary" onClick={exportPdf} disabled={downloading}>
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              PDF
            </Button>
            <Button variant="secondary" onClick={exportCsv}>
              <Download className="h-4 w-4" />
              CSV
            </Button>
            {!closed ? (
              <>
                <Button variant="ghost" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button variant="primary" onClick={() => setCloseOpen(true)} disabled={busy}>
                  <Lock className="h-4 w-4" />
                  Close period
                </Button>
              </>
            ) : (
              <Button variant="secondary" onClick={doReopen} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
                Reopen
              </Button>
            )}
          </>
        }
      />

      {closed ? (
        <div className="flex items-center gap-3 rounded-[14px] bg-positive/10 p-3.5 ring-1 ring-positive/20">
          <CheckCircle2 className="h-4 w-4 flex-none text-positive" />
          <span className="text-[13px] text-ink">
            Closed {period.closed_at ? formatDate(period.closed_at) : ""}. Reopen to make changes.
          </span>
        </div>
      ) : null}

      {drift ? (
        <div className="flex items-center gap-3 rounded-[14px] bg-brass/[0.09] p-3.5 ring-1 ring-brass/20">
          <TriangleAlert className="h-4 w-4 flex-none text-brass-ink" />
          <span className="text-[13px] text-ink">
            Changed since close: net was{" "}
            <b className="tabular-nums">{formatCurrency(drift.snapshotNet, currency)}</b>, now{" "}
            <b className="tabular-nums">{formatCurrency(drift.liveNet, currency)}</b>. Reopen and
            close again to update the snapshot.
          </span>
        </div>
      ) : null}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Income", value: totals.income, tone: "positive" as const },
          { label: "Expense", value: totals.expense, tone: "ink" as const },
          { label: "Net", value: totals.net, tone: "net" as const },
        ].map((k) => (
          <Panel key={k.label}>
            <PanelHeader title={k.label} />
            <p
              className={cn(
                "mt-3 text-[24px] font-extrabold leading-none tracking-[-0.02em] tabular-nums",
                k.tone === "positive"
                  ? "text-positive"
                  : k.tone === "net"
                    ? k.value >= 0
                      ? "text-positive"
                      : "text-negative"
                    : "text-ink"
              )}
            >
              {k.tone === "net" ? (k.value >= 0 ? "+" : "−") : ""}
              {formatCurrency(Math.abs(k.value), currency)}
            </p>
          </Panel>
        ))}
        <Panel>
          <PanelHeader title="Ticked off" caption={`${totals.reconciled} of ${totals.count}`} />
          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-elevated">
            <motion.span
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: EASE_OUT }}
              className="block h-full rounded-full bg-brass"
            />
          </div>
          <p className="mt-2 text-[12px] text-ink-muted">{pct}% reconciled</p>
        </Panel>
      </div>

      {/* Entries */}
      <Panel className="p-0">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <span className="text-[13px] font-semibold text-ink">
            {totals.count} transaction{totals.count === 1 ? "" : "s"} in this window
          </span>
          {totals.count > 0 ? (
            <Button
              variant="ghost"
              onClick={() => tickAll(!allTicked)}
              disabled={busy}
              className="h-8 px-3 text-[12.5px]"
            >
              {allTicked ? "Untick all" : "Tick all"}
            </Button>
          ) : null}
        </div>

        {totals.count === 0 ? (
          <p className="px-5 py-10 text-center text-[13px] text-ink-muted">
            No transactions fall in this date window yet.
          </p>
        ) : (
          <ul className="divide-y divide-line/70">
            {entries.map((e) => {
              const on = Boolean(e.reconciled_at);
              const income = e.kind === "income";
              return (
                <li
                  key={e.id}
                  className="flex items-center gap-3 px-4 py-3 sm:px-5"
                >
                  <button
                    type="button"
                    onClick={() => toggleTick(e)}
                    aria-pressed={on}
                    aria-label={on ? "Untick" : "Tick off"}
                    className={cn(
                      "flex h-5 w-5 flex-none items-center justify-center rounded-[6px] ring-1 transition-colors",
                      on
                        ? "bg-brass text-white ring-brass"
                        : "bg-card text-transparent ring-line hover:ring-brass-soft"
                    )}
                  >
                    <Check className="h-3 w-3" />
                  </button>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-ink">
                      {e.description}
                    </span>
                    <span className="block truncate text-[11.5px] text-ink-muted">
                      {formatDate(e.expense_date)}
                      {e.source === "invoice" ? " · from invoice" : ""}
                    </span>
                  </span>

                  <span
                    className={cn(
                      "flex-none text-[13.5px] font-bold tabular-nums",
                      income ? "text-positive" : "text-ink"
                    )}
                  >
                    {income ? "+" : "−"}
                    {formatCurrency(num(e.amount), e.currency || currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {!closed ? (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            onClick={() => setDeleteOpen(true)}
            className="text-negative hover:bg-negative/10"
          >
            <Trash2 className="h-4 w-4" />
            Delete period
          </Button>
        </div>
      ) : null}

      <EditPeriodModal
        open={editOpen}
        period={period}
        onClose={() => setEditOpen(false)}
        onSaved={(p) => {
          setEditOpen(false);
          setPeriod(p);
          fetchAll();
        }}
      />

      <Modal
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        title="Close this period?"
        description={
          allTicked
            ? "Every transaction is ticked off. Closing snapshots the totals; you can still reopen it later."
            : `${totals.reconciled} of ${totals.count} ticked off. You can close anyway — closing is reversible.`
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setCloseOpen(false)}>
              Not yet
            </Button>
            <Button variant="primary" onClick={doClose} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Close period
            </Button>
          </>
        }
      />

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Delete ${period.name}?`}
        description="This removes the period. Your transactions are not touched."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={doDelete}>
              <Trash2 className="h-4 w-4" />
              Delete period
            </Button>
          </>
        }
      />

      {toast ? (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      ) : null}
    </div>
  );
}

function EditPeriodModal({
  open,
  period,
  onClose,
  onSaved,
}: {
  open: boolean;
  period: AccountingPeriod;
  onClose: () => void;
  onSaved: (p: AccountingPeriod) => void;
}) {
  const [form, setForm] = useState({
    name: period.name,
    start: period.start_date,
    end: period.end_date,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm({ name: period.name, start: period.start_date, end: period.end_date });
      setError("");
    }
  }, [open, period]);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const saved = await api.patch<AccountingPeriod>(`/periods/${period.id}`, {
        name: form.name,
        start_date: form.start,
        end_date: form.end,
      });
      onSaved(saved);
    } catch (err) {
      setError(
        (err as { message?: string })?.message ||
          "Couldn't save. Check the dates don't overlap another period."
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
      title="Edit period"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="edit-period-form" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
    >
      <form id="edit-period-form" onSubmit={submit} className="space-y-3.5">
        {error ? (
          <p className="rounded-[10px] bg-negative/10 px-3.5 py-2.5 text-[12.5px] font-medium text-negative ring-1 ring-negative/20">
            {error}
          </p>
        ) : null}
        <Field label="Name" required>
          <Input
            required
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
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
