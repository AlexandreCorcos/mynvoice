"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, Plus, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import EmptyState from "@/components/ui/empty-state";
import Toast from "@/components/ui/toast";
import type { Client, InvoiceListItem } from "@/types";

interface Payment {
  id: string;
  invoice_id: string | null;
  client_id: string | null;
  payment_number: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_mode: string;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

const PAYMENT_MODE_LABELS: Record<string, string> = {
  bank_transfer: "Bank Transfer",
  card: "Card",
  cash: "Cash",
  other: "Other",
};

export default function PaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [p, c, inv] = await Promise.all([
        api.get<Payment[]>("/payments/"),
        api.get<Client[]>("/clients/"),
        api.get<InvoiceListItem[]>("/invoices/"),
      ]);
      setPayments(p);
      setClients(c);
      setInvoices(inv);
    } catch {
      // handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));
  const invoiceMap = Object.fromEntries(invoices.map((i) => [i.id, i]));

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this payment?")) return;
    try {
      await api.delete(`/payments/${id}`);
      setPayments((prev) => prev.filter((p) => p.id !== id));
      setToast({ message: "Payment deleted", type: "success" });
    } catch {
      setToast({ message: "Failed to delete payment", type: "error" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Payments Received</h1>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-petrol-dark px-4 py-2.5 text-sm font-semibold text-white hover:bg-petrol-mid transition-colors"
        >
          <Plus className="h-4 w-4" />
          Record Payment
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]"
            />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payments recorded"
          description="Payments are automatically recorded when you mark invoices as paid. You can also record payments manually."
          action={
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-coral px-4 py-2.5 text-sm font-semibold text-white hover:bg-coral-dark transition-colors"
            >
              <Plus className="h-4 w-4" />
              Record Payment
            </button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-text-secondary">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Payment #</th>
                <th className="px-5 py-3 font-medium">Reference</th>
                <th className="px-5 py-3 font-medium">Customer Name</th>
                <th className="px-5 py-3 font-medium">Invoice #</th>
                <th className="px-5 py-3 font-medium">Mode</th>
                <th className="px-5 py-3 font-medium text-right">Amount</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => {
                const client = payment.client_id ? clientMap[payment.client_id] : null;
                const invoice = payment.invoice_id ? invoiceMap[payment.invoice_id] : null;

                return (
                  <tr
                    key={payment.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-surface-light transition-colors"
                  >
                    <td className="px-5 py-3.5 text-text-primary">
                      {formatDate(payment.payment_date)}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-text-primary">
                      {payment.payment_number}
                    </td>
                    <td className="px-5 py-3.5 text-text-secondary">
                      {payment.reference || "-"}
                    </td>
                    <td className="px-5 py-3.5 text-text-primary">
                      {client ? client.company_name : "\u2014"}
                    </td>
                    <td className="px-5 py-3.5">
                      {invoice ? (
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="font-medium text-petrol-mid hover:text-petrol-dark transition-colors"
                        >
                          {invoice.invoice_number}
                        </Link>
                      ) : (
                        <span className="text-text-secondary">&mdash;</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-text-primary">
                      {PAYMENT_MODE_LABELS[payment.payment_mode] || payment.payment_mode}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-text-primary">
                      {formatCurrency(payment.amount, payment.currency)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleDelete(payment.id)}
                        className="rounded-lg p-1.5 text-text-secondary hover:bg-red-50 hover:text-red-500 transition-colors"
                        title="Delete payment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Payment Modal */}
      {showModal && (
        <RecordPaymentModal
          clients={clients}
          invoices={invoices}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            setToast({ message: "Payment recorded successfully", type: "success" });
            fetchData();
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

function RecordPaymentModal({
  clients,
  invoices,
  onClose,
  onSaved,
}: {
  clients: Client[];
  invoices: InvoiceListItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));

  const unpaidInvoices = invoices.filter(
    (inv) => inv.status === "sent" || inv.status === "overdue"
  );

  const [form, setForm] = useState({
    invoice_id: "",
    client_id: "",
    amount: "",
    currency: "GBP",
    payment_date: new Date().toISOString().split("T")[0],
    payment_mode: "bank_transfer",
    reference: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const handleInvoiceChange = (invoiceId: string) => {
    if (!invoiceId) {
      setForm((f) => ({ ...f, invoice_id: "", client_id: "", amount: "", currency: "GBP" }));
      return;
    }
    const inv = invoices.find((i) => i.id === invoiceId);
    if (inv) {
      setForm((f) => ({
        ...f,
        invoice_id: invoiceId,
        client_id: inv.client_id || "",
        amount: inv.total.toString(),
        currency: inv.currency,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/payments/", {
        invoice_id: form.invoice_id || null,
        client_id: form.client_id || null,
        amount: parseFloat(form.amount),
        currency: form.currency,
        payment_date: form.payment_date,
        payment_mode: form.payment_mode,
        reference: form.reference || null,
        notes: form.notes || null,
      });
      onSaved();
    } catch {
      // handle
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-dropdown)]">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-text-primary">Record Payment</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-light"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Invoice select */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Invoice
            </label>
            <select
              value={form.invoice_id}
              onChange={(e) => handleInvoiceChange(e.target.value)}
              className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none bg-white"
            >
              <option value="">No invoice (manual payment)</option>
              {unpaidInvoices.map((inv) => {
                const client = inv.client_id ? clientMap[inv.client_id] : null;
                return (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number}
                    {client ? ` \u2014 ${client.company_name}` : ""}
                    {` \u2014 ${formatCurrency(inv.total, inv.currency)}`}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Amount *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                required
                className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Date *
              </label>
              <input
                type="date"
                value={form.payment_date}
                onChange={(e) => setForm((f) => ({ ...f, payment_date: e.target.value }))}
                required
                className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none"
              />
            </div>
          </div>

          {/* Payment mode */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Payment Mode *
            </label>
            <select
              value={form.payment_mode}
              onChange={(e) => setForm((f) => ({ ...f, payment_mode: e.target.value }))}
              required
              className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none bg-white"
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="cash">Cash</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Reference */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Reference
            </label>
            <input
              type="text"
              value={form.reference}
              onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
              placeholder="e.g. bank reference"
              className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[var(--radius-button)] border border-gray-300 px-4 py-2 text-sm font-medium text-text-primary hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-[var(--radius-button)] bg-petrol-dark px-4 py-2 text-sm font-semibold text-white hover:bg-petrol-mid disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
