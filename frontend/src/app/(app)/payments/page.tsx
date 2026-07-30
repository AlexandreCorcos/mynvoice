"use client";

/* =========================================================================
   Payments received.

   A ledger, so this one genuinely is a table — the value is in comparing
   figures down a column. On narrow screens it falls back to stacked cards
   rather than a horizontal scrollbar.

   Recording a payment against an unpaid invoice pre-fills the client,
   amount and currency, because that's the case in almost every entry.
   ========================================================================= */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CreditCard, Loader2, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, num } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { EASE_OUT } from "@/components/motion";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/app/button";
import { Panel, Overline } from "@/components/app/panel";
import { Field, Input, Select, Textarea } from "@/components/app/form";
import { Modal } from "@/components/app/modal";
import { RowMenu } from "@/components/app/menu";
import EmptyState from "@/components/ui/empty-state";
import Toast, { type ToastType } from "@/components/ui/toast";
import type { Client, InvoiceListItem, Payment } from "@/types";

const MODES: { value: string; label: string }[] = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

const modeLabel = (mode: string | null) =>
  MODES.find((m) => m.value === mode)?.label ?? mode ?? "—";

/* ------------------------------------------------------------------ */
/* Record form                                                         */
/* ------------------------------------------------------------------ */

function PaymentForm({
  open,
  clients,
  invoices,
  defaultCurrency,
  onClose,
  onSaved,
}: {
  open: boolean;
  clients: Client[];
  invoices: InvoiceListItem[];
  defaultCurrency: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const outstanding = useMemo(
    () => invoices.filter((i) => i.status === "sent" || i.status === "overdue"),
    [invoices]
  );

  const [form, setForm] = useState({
    invoice_id: "",
    client_id: "",
    amount: "",
    currency: defaultCurrency,
    payment_date: new Date().toISOString().split("T")[0],
    payment_mode: "bank_transfer",
    reference: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm({
      invoice_id: "",
      client_id: "",
      amount: "",
      currency: defaultCurrency,
      payment_date: new Date().toISOString().split("T")[0],
      payment_mode: "bank_transfer",
      reference: "",
      notes: "",
    });
    setError("");
  }, [open, defaultCurrency]);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  /* Picking an invoice fills in everything it already knows. */
  const pickInvoice = (id: string) => {
    if (!id) return set({ invoice_id: "", client_id: "", amount: "" });
    const inv = invoices.find((i) => i.id === id);
    if (!inv) return;
    set({
      invoice_id: id,
      client_id: inv.client_id ?? "",
      amount: String(num(inv.balance_due) || num(inv.total)),
      currency: inv.currency,
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/payments/", {
        invoice_id: form.invoice_id || null,
        client_id: form.client_id || null,
        amount: parseFloat(form.amount) || 0,
        currency: form.currency,
        payment_date: form.payment_date,
        payment_mode: form.payment_mode,
        reference: form.reference || null,
        notes: form.notes || null,
      });
      onSaved();
    } catch {
      setError("Couldn't record this payment. Check the amount and date.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Record a payment"
      description="Against an invoice, or on its own if money arrived some other way."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="payment-form" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? "Recording…" : "Record payment"}
          </Button>
        </>
      }
    >
      <form id="payment-form" onSubmit={submit} className="space-y-3.5">
        {error ? (
          <p className="rounded-[10px] bg-negative/10 px-3.5 py-2.5 text-[12.5px] font-medium text-negative ring-1 ring-negative/20">
            {error}
          </p>
        ) : null}

        <Field
          label="Invoice"
          hint={
            outstanding.length === 0
              ? "No unpaid invoices — record this as a standalone payment."
              : "Picking one fills in the client and amount."
          }
        >
          <Select
            value={form.invoice_id}
            onChange={(e) => pickInvoice(e.target.value)}
            disabled={outstanding.length === 0}
          >
            <option value="">No invoice (standalone payment)</option>
            {outstanding.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.invoice_number} — {formatCurrency(num(inv.balance_due), inv.currency)} due
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Client">
          <Select
            value={form.client_id}
            onChange={(e) => set({ client_id: e.target.value })}
          >
            <option value="">No client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company_name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Amount" required>
            <Input
              type="number"
              min="0"
              step="0.01"
              required
              value={form.amount}
              onChange={(e) => set({ amount: e.target.value })}
              placeholder="0.00"
              className="tabular-nums"
            />
          </Field>
          <Field label="Currency">
            <Select
              value={form.currency}
              onChange={(e) => set({ currency: e.target.value })}
            >
              <option value="GBP">GBP (£)</option>
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
            </Select>
          </Field>
          <Field label="Date received" required>
            <Input
              type="date"
              required
              value={form.payment_date}
              onChange={(e) => set({ payment_date: e.target.value })}
            />
          </Field>
          <Field label="Method">
            <Select
              value={form.payment_mode}
              onChange={(e) => set({ payment_mode: e.target.value })}
            >
              {MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Reference" hint="Whatever appears on your bank statement.">
          <Input
            value={form.reference}
            onChange={(e) => set({ reference: e.target.value })}
            placeholder="FT26073000123"
          />
        </Field>

        <Field label="Notes">
          <Textarea
            rows={2}
            value={form.notes}
            onChange={(e) => set({ notes: e.target.value })}
          />
        </Field>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function PaymentsPage() {
  const { user } = useAuth();
  const defaultCurrency = user?.currency || "GBP";

  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Payment | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [p, c, i] = await Promise.all([
        api.get<Payment[]>("/payments/"),
        api.get<Client[]>("/clients/"),
        api.get<InvoiceListItem[]>("/invoices/"),
      ]);
      setPayments(p);
      setClients(c);
      setInvoices(i);
    } catch {
      /* empty state covers it */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const clientName = (id: string | null) =>
    (id ? clients.find((c) => c.id === id)?.company_name : null) ?? "—";
  const invoiceOf = (id: string | null) =>
    id ? invoices.find((i) => i.id === id) : undefined;

  /* Only sum a currency against itself — mixing them would be a lie. */
  const receivedThisMonth = useMemo(() => {
    const now = new Date();
    return payments
      .filter((p) => {
        const d = new Date(p.payment_date);
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear() &&
          p.currency === defaultCurrency
        );
      })
      .reduce((sum, p) => sum + num(p.amount), 0);
  }, [payments, defaultCurrency]);

  const remove = async () => {
    if (!deleting) return;
    try {
      await api.delete(`/payments/${deleting.id}`);
      setPayments((prev) => prev.filter((p) => p.id !== deleting.id));
      setToast({ message: "Payment removed.", type: "success" });
    } catch {
      setToast({ message: "Couldn't remove that payment.", type: "error" });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Payments received"
        title="Money that actually arrived."
        subtitle={
          receivedThisMonth > 0
            ? `${formatCurrency(receivedThisMonth, defaultCurrency)} in so far this month.`
            : "Every payment recorded against an invoice, and the ones that came in on their own."
        }
        actions={
          <Button variant="primary" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Record payment
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-[14px] bg-elevated" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payments yet"
          description="Mark an invoice as paid, or record a payment here when money lands outside the usual flow."
          action={
            <Button variant="primary" onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" />
              Record a payment
            </Button>
          }
        />
      ) : (
        <>
          {/* desktop ledger */}
          <Panel padded={false} className="hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-line bg-elevated/40">
                    <th className="py-2.5 pl-5 pr-4">
                      <Overline>Date</Overline>
                    </th>
                    <th className="px-4 py-2.5">
                      <Overline>Payment</Overline>
                    </th>
                    <th className="px-4 py-2.5">
                      <Overline>Client</Overline>
                    </th>
                    <th className="px-4 py-2.5">
                      <Overline>Invoice</Overline>
                    </th>
                    <th className="px-4 py-2.5">
                      <Overline>Method</Overline>
                    </th>
                    <th className="px-4 py-2.5 text-right">
                      <Overline>Amount</Overline>
                    </th>
                    <th className="w-14 py-2.5 pr-3" />
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {payments.map((p, i) => {
                      const inv = invoiceOf(p.invoice_id);
                      return (
                        <motion.tr
                          key={p.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, transition: { duration: 0.15 } }}
                          transition={{
                            duration: 0.4,
                            delay: Math.min(i, 10) * 0.03,
                            ease: EASE_OUT,
                          }}
                          className="border-b border-line/60 transition-colors last:border-0 hover:bg-elevated/40"
                        >
                          <td className="py-3 pl-5 pr-4 text-[13px] text-ink-muted">
                            {formatDate(p.payment_date)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="block text-[13.5px] font-semibold text-ink">
                              {p.payment_number}
                            </span>
                            {p.reference ? (
                              <span className="block text-[11.5px] text-ink-muted">
                                {p.reference}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-[13.5px] text-ink">
                            {clientName(p.client_id)}
                          </td>
                          <td className="px-4 py-3 text-[13.5px]">
                            {inv ? (
                              <Link
                                href={`/invoices/${inv.id}`}
                                className="font-semibold text-brass-ink transition-colors hover:text-ink"
                              >
                                {inv.invoice_number}
                              </Link>
                            ) : (
                              <span className="text-ink-muted">Standalone</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[13px] text-ink-muted">
                            {modeLabel(p.payment_mode)}
                          </td>
                          <td className="px-4 py-3 text-right text-[14px] font-bold tabular-nums text-positive">
                            {formatCurrency(num(p.amount), p.currency)}
                          </td>
                          <td className="py-3 pr-3">
                            <div className="flex justify-end">
                              <RowMenu
                                label={`Actions for ${p.payment_number}`}
                                items={[
                                  {
                                    label: "Delete",
                                    icon: Trash2,
                                    tone: "danger",
                                    onSelect: () => setDeleting(p),
                                  },
                                ]}
                              />
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </Panel>

          {/* narrow screens — a table here would just be a scrollbar */}
          <div className="space-y-2 lg:hidden">
            {payments.map((p) => {
              const inv = invoiceOf(p.invoice_id);
              return (
                <div
                  key={p.id}
                  className="rounded-[14px] bg-card p-4 ring-1 ring-line"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-bold text-ink">
                        {p.payment_number}
                      </p>
                      <p className="text-[12px] text-ink-muted">
                        {formatDate(p.payment_date)} · {modeLabel(p.payment_mode)}
                      </p>
                    </div>
                    <span className="flex-none text-[15px] font-bold tabular-nums text-positive">
                      {formatCurrency(num(p.amount), p.currency)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
                    <span className="min-w-0 truncate text-[12.5px] text-ink-muted">
                      {clientName(p.client_id)}
                      {inv ? (
                        <>
                          {" · "}
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="font-semibold text-brass-ink"
                          >
                            {inv.invoice_number}
                          </Link>
                        </>
                      ) : null}
                    </span>
                    <RowMenu
                      label={`Actions for ${p.payment_number}`}
                      items={[
                        {
                          label: "Delete",
                          icon: Trash2,
                          tone: "danger",
                          onSelect: () => setDeleting(p),
                        },
                      ]}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <PaymentForm
        open={formOpen}
        clients={clients}
        invoices={invoices}
        defaultCurrency={defaultCurrency}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          setToast({ message: "Payment recorded.", type: "success" });
          fetchAll();
        }}
      />

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={`Remove ${deleting?.payment_number ?? "payment"}?`}
        description="The invoice it was recorded against goes back to outstanding."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={remove}>
              <Trash2 className="h-4 w-4" />
              Remove payment
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
