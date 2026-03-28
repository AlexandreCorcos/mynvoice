"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  CheckCircle,
  Copy,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import StatusBadge from "@/components/ui/status-badge";
import type { Client, Invoice, InvoiceStatus, PaymentMethod } from "@/types";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const fetchInvoice = useCallback(async () => {
    try {
      const inv = await api.get<Invoice>(`/invoices/${params.id}`);
      setInvoice(inv);
      if (inv.client_id) {
        const cl = await api.get<Client>(`/clients/${inv.client_id}`);
        setClient(cl);
      }
    } catch {
      router.push("/invoices");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handleStatusChange = async (
    status: InvoiceStatus,
    paymentMethod?: PaymentMethod
  ) => {
    if (!invoice) return;
    const body: Record<string, unknown> = { status };
    if (paymentMethod) {
      body.payment_method = paymentMethod;
      body.payment_date = new Date().toISOString().split("T")[0];
    }
    await api.patch<Invoice>(`/invoices/${invoice.id}/status`, body);
    fetchInvoice();
    setShowStatusModal(false);
  };

  const handleDuplicate = async () => {
    if (!invoice) return;
    const dup = await api.post<Invoice>(`/invoices/${invoice.id}/duplicate`);
    router.push(`/invoices/${dup.id}`);
  };

  const handleDelete = async () => {
    if (!invoice || !confirm("Delete this invoice?")) return;
    await api.delete(`/invoices/${invoice.id}`);
    router.push("/invoices");
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
        <div className="h-96 animate-pulse rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]" />
      </div>
    );
  }

  if (!invoice) return null;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/invoices"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to invoices
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-text-primary">
            {invoice.invoice_number}
          </h2>
          <StatusBadge status={invoice.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          {invoice.status === "draft" && (
            <button
              onClick={() => handleStatusChange("sent")}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-button)] bg-petrol-dark px-4 py-2 text-sm font-semibold text-white hover:bg-petrol-mid transition-colors"
            >
              <Send className="h-4 w-4" />
              Mark as Sent
            </button>
          )}
          {(invoice.status === "sent" || invoice.status === "overdue") && (
            <button
              onClick={() => setShowStatusModal(true)}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-button)] bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              Mark as Paid
            </button>
          )}
          {invoice.status === "sent" && (
            <button
              onClick={() => handleStatusChange("overdue")}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-button)] border border-red-200 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              <AlertTriangle className="h-4 w-4" />
              Mark Overdue
            </button>
          )}
          <button
            onClick={handleDuplicate}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-button)] border border-gray-300 px-4 py-2 text-sm font-medium text-text-primary hover:bg-gray-50 transition-colors"
          >
            <Copy className="h-4 w-4" />
            Duplicate
          </button>
          {invoice.status !== "paid" && (
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-button)] border border-red-200 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Invoice Preview */}
      <div className="rounded-[var(--radius-card)] bg-white p-8 shadow-[var(--shadow-card)]">
        {/* Top section */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-sm text-text-secondary mb-1">Issued</p>
            <p className="font-medium">{formatDate(invoice.issue_date)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-text-secondary mb-1">Due</p>
            <p className="font-medium">{formatDate(invoice.due_date)}</p>
          </div>
        </div>

        {/* Client info */}
        {client && (
          <div className="mb-8 rounded-xl bg-surface-light p-4">
            <p className="text-xs font-medium text-text-secondary mb-1">
              Bill to
            </p>
            <p className="font-semibold text-text-primary">
              {client.company_name}
            </p>
            {client.contact_person && (
              <p className="text-sm text-text-secondary">
                {client.contact_person}
              </p>
            )}
            <p className="text-sm text-text-secondary">{client.email}</p>
            {client.address_line1 && (
              <p className="text-sm text-text-secondary mt-1">
                {client.address_line1}
                {client.city && `, ${client.city}`}
                {client.postcode && ` ${client.postcode}`}
              </p>
            )}
          </div>
        )}

        {/* Items table */}
        <table className="w-full mb-6">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="pb-3 text-left text-xs font-medium text-text-secondary">
                Description
              </th>
              <th className="pb-3 text-right text-xs font-medium text-text-secondary w-20">
                Qty
              </th>
              <th className="pb-3 text-right text-xs font-medium text-text-secondary w-28">
                Unit Price
              </th>
              <th className="pb-3 text-right text-xs font-medium text-text-secondary w-28">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="py-3 text-sm text-text-primary">
                  {item.description}
                </td>
                <td className="py-3 text-right text-sm text-text-secondary">
                  {item.quantity}
                  {item.unit && ` ${item.unit}`}
                </td>
                <td className="py-3 text-right text-sm text-text-secondary">
                  {formatCurrency(item.unit_price, invoice.currency)}
                </td>
                <td className="py-3 text-right text-sm font-medium">
                  {formatCurrency(item.amount, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="ml-auto w-64 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Subtotal</span>
            <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
          </div>
          {Number(invoice.tax_rate) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">
                Tax ({invoice.tax_rate}%)
              </span>
              <span>
                {formatCurrency(invoice.tax_amount, invoice.currency)}
              </span>
            </div>
          )}
          {Number(invoice.discount_amount) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Discount</span>
              <span className="text-coral">
                -{formatCurrency(invoice.discount_amount, invoice.currency)}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-200 pt-2">
            <span className="font-semibold">Total</span>
            <span className="text-xl font-bold text-petrol-dark">
              {formatCurrency(invoice.total, invoice.currency)}
            </span>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-8 border-t border-gray-100 pt-6">
            <p className="text-xs font-medium text-text-secondary mb-1">
              Notes
            </p>
            <p className="text-sm text-text-secondary whitespace-pre-line">
              {invoice.notes}
            </p>
          </div>
        )}

        {/* Payment info */}
        {invoice.status === "paid" && invoice.payment_method && (
          <div className="mt-6 rounded-xl bg-emerald-50 p-4">
            <p className="text-sm font-medium text-emerald-700">
              Paid via {invoice.payment_method.replace("_", " ")}
              {invoice.payment_date && ` on ${formatDate(invoice.payment_date)}`}
            </p>
          </div>
        )}
      </div>

      {/* Mark as Paid Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-dropdown)]">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Mark as Paid
            </h3>
            <p className="text-sm text-text-secondary mb-5">
              Select payment method:
            </p>
            <div className="space-y-2">
              {(
                [
                  ["bank_transfer", "Bank Transfer"],
                  ["card", "Card"],
                  ["cash", "Cash"],
                  ["other", "Other"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => handleStatusChange("paid", value)}
                  className="w-full rounded-[var(--radius-button)] border border-gray-200 px-4 py-2.5 text-left text-sm font-medium hover:border-petrol-mid hover:bg-surface-light transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowStatusModal(false)}
              className="mt-4 w-full rounded-[var(--radius-button)] border border-gray-300 px-4 py-2 text-sm font-medium text-text-secondary hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
