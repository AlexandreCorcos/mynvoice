"use client";

/* =========================================================================
   Invoice detail.

   Two halves: the document your client will recognise, and a rail that
   answers "what happens next?". The rail carries the lifecycle as a
   timeline rather than a badge, because the useful question on this screen
   is rarely "what is it now" — it's "what's left to do".
   ========================================================================= */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  Mail,
  Pencil,
  Send,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatCurrency, formatDate, formatQuantity } from "@/lib/utils";
import { EASE_OUT } from "@/components/motion";
import { Panel, PanelHeader, Overline } from "@/components/app/panel";
import { Button, ButtonLink } from "@/components/app/button";
import { Field, Input } from "@/components/app/form";
import { Modal } from "@/components/app/modal";
import { RowMenu, type MenuItem } from "@/components/app/menu";
import StatusBadge from "@/components/ui/status-badge";
import Toast, { type ToastType } from "@/components/ui/toast";
import type { Client, Invoice, InvoiceStatus, PaymentMethod } from "@/types";

const PAYMENT_METHODS: { label: string; value: PaymentMethod }[] = [
  { label: "Bank transfer", value: "bank_transfer" },
  { label: "Card", value: "card" },
  { label: "Cash", value: "cash" },
  { label: "Other", value: "other" },
];

/* ------------------------------------------------------------------ */
/* Lifecycle rail                                                      */
/* ------------------------------------------------------------------ */

const STEPS: { key: InvoiceStatus; label: string; done: string }[] = [
  { key: "draft", label: "Drafted", done: "Created and saved" },
  { key: "sent", label: "Sent", done: "Delivered to the client" },
  { key: "paid", label: "Paid", done: "Money received" },
];

function Timeline({ invoice }: { invoice: Invoice }) {
  /* Overdue is "sent, and late" rather than a fourth step in the line. */
  const reached =
    invoice.status === "paid" ? 2 : invoice.status === "draft" ? 0 : 1;
  const late = invoice.status === "overdue";

  return (
    <ol className="relative">
      {STEPS.map((step, i) => {
        const done = i < reached;
        const current = i === reached;
        const pending = i > reached;

        return (
          <li key={step.key} className="relative flex gap-3.5 pb-5 last:pb-0">
            {/* connector */}
            {i < STEPS.length - 1 ? (
              <span className="absolute left-[11px] top-6 h-[calc(100%-16px)] w-px bg-line">
                <motion.span
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: done ? 1 : 0 }}
                  transition={{ duration: 0.5, delay: 0.15 + i * 0.1, ease: EASE_OUT }}
                  className="block h-full w-full origin-top bg-brass"
                />
              </span>
            ) : null}

            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.35, delay: i * 0.08, ease: EASE_OUT }}
              className={cn(
                "relative z-10 flex h-[23px] w-[23px] flex-none items-center justify-center rounded-full ring-1",
                done || (current && invoice.status === "paid")
                  ? "bg-brass text-white ring-brass"
                  : current
                    ? late
                      ? "bg-negative/10 text-negative ring-negative/30"
                      : "bg-brass/[0.12] text-brass-ink ring-brass/30"
                    : "bg-elevated text-ink-muted/50 ring-line"
              )}
            >
              {done || (current && invoice.status === "paid") ? (
                <Check className="h-3 w-3" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
              )}
            </motion.span>

            <span className="min-w-0 pt-0.5">
              <span
                className={cn(
                  "block text-[13px] font-bold",
                  pending ? "text-ink-muted/60" : "text-ink"
                )}
              >
                {step.label}
                {current && late ? (
                  <span className="ml-2 text-[11.5px] font-semibold text-negative">
                    overdue
                  </span>
                ) : null}
              </span>
              <span className="block text-[11.5px] text-ink-muted">
                {step.key === "sent" && invoice.sent_at
                  ? `${formatDate(invoice.sent_at)}${
                      invoice.sent_to_email ? ` · ${invoice.sent_to_email}` : ""
                    }`
                  : step.key === "paid" && invoice.payment_date
                    ? formatDate(invoice.payment_date)
                    : step.key === "draft"
                      ? formatDate(invoice.created_at)
                      : pending
                        ? "Not yet"
                        : step.done}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [payOpen, setPayOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sendEmail, setSendEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const fetchInvoice = useCallback(async () => {
    try {
      const inv = await api.get<Invoice>(`/invoices/${params.id}`);
      setInvoice(inv);
      if (inv.client_id) {
        setClient(await api.get<Client>(`/clients/${inv.client_id}`));
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

  const setStatus = async (status: InvoiceStatus, method?: PaymentMethod) => {
    if (!invoice) return;
    setBusy(true);
    try {
      const body: Record<string, unknown> = { status };
      if (method) {
        body.payment_method = method;
        body.payment_date = new Date().toISOString().split("T")[0];
      }
      await api.patch<Invoice>(`/invoices/${invoice.id}/status`, body);
      await fetchInvoice();
      setPayOpen(false);
    } catch {
      setToast({ message: "Couldn't update the status.", type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const duplicate = async () => {
    if (!invoice) return;
    const dup = await api.post<Invoice>(`/invoices/${invoice.id}/duplicate`);
    router.push(`/invoices/${dup.id}`);
  };

  const remove = async () => {
    if (!invoice) return;
    await api.delete(`/invoices/${invoice.id}`);
    router.push("/invoices");
  };

  const downloadPdf = async () => {
    if (!invoice) return;
    setDownloading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const token = localStorage.getItem("access_token");

      /* A network or CORS failure *rejects* rather than returning a
         non-ok response, so this needs a catch as well as an `ok` check —
         without it the rejection escaped and the button did nothing at
         all, with no message to the user. */
      const res = await fetch(`${base}/invoices/${invoice.id}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        setToast({
          message: "Couldn't generate the PDF. The server rejected the request.",
          type: "error",
        });
        return;
      }

      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.invoice_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setToast({
        message: "Couldn't reach the server to build the PDF.",
        type: "error",
      });
    } finally {
      setDownloading(false);
    }
  };

  const sendInvoice = async () => {
    if (!invoice || !sendEmail) return;
    setSending(true);
    try {
      await api.post(`/invoices/${invoice.id}/send`, { email: sendEmail });
      setToast({ message: `Sent to ${sendEmail}.`, type: "success" });
      setSendOpen(false);
      setSendEmail("");
      fetchInvoice();
    } catch {
      /* Deliberately not blaming SMTP: this also fires when PDF generation
         fails or the server is unreachable, and sending someone to check
         mail settings for a PDF fault wastes their afternoon. */
      setToast({
        message: "Couldn't send the invoice. Check the server logs.",
        type: "error",
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-4 w-32 animate-pulse rounded-full bg-elevated" />
        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <div className="h-[560px] animate-pulse rounded-[16px] bg-elevated" />
          <div className="h-80 animate-pulse rounded-[16px] bg-elevated" />
        </div>
      </div>
    );
  }

  if (!invoice) return null;

  const paid = invoice.status === "paid";
  const partly = Number(invoice.amount_paid) > 0 && Number(invoice.balance_due) > 0;

  const menu: MenuItem[] = [
    { label: "Edit", icon: Pencil, href: `/invoices/${invoice.id}/edit`, show: !paid },
    { label: "Duplicate", icon: Copy, onSelect: duplicate },
    {
      label: "Mark overdue",
      icon: AlertTriangle,
      onSelect: () => setStatus("overdue"),
      show: invoice.status === "sent",
    },
    {
      label: "Delete",
      icon: Trash2,
      tone: "danger",
      onSelect: () => setDeleteOpen(true),
      show: !paid,
    },
  ];

  return (
    <div className="space-y-5">
      <Link
        href="/invoices"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to invoices
      </Link>

      {/* header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <h1 className="text-[26px] font-extrabold tracking-[-0.025em] text-ink">
            {invoice.invoice_number}
          </h1>
          <StatusBadge status={invoice.status} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={downloadPdf} disabled={downloading}>
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            PDF
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setSendEmail(client?.email ?? "");
              setSendOpen(true);
            }}
          >
            <Mail className="h-4 w-4" />
            Email
          </Button>
          <RowMenu items={menu} label="More actions" className="h-10 w-10 ring-1 ring-line" />
        </div>
      </motion.div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px] xl:items-start">
        {/* ── the document ─────────────────────────────────────── */}
        <Panel className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <Overline>Issued</Overline>
              <p className="mt-1 text-[14px] font-semibold text-ink">
                {formatDate(invoice.issue_date)}
              </p>
            </div>
            <div className="text-right">
              <Overline>Due</Overline>
              <p
                className={cn(
                  "mt-1 text-[14px] font-semibold",
                  invoice.status === "overdue" ? "text-negative" : "text-ink"
                )}
              >
                {formatDate(invoice.due_date)}
              </p>
            </div>
          </div>

          {client ? (
            <div className="mt-6 rounded-[12px] bg-elevated/60 p-4">
              <Overline>Bill to</Overline>
              <p className="mt-1.5 text-[15px] font-bold text-ink">
                {client.company_name}
              </p>
              {client.contact_person ? (
                <p className="text-[13px] text-ink-muted">{client.contact_person}</p>
              ) : null}
              <p className="text-[13px] text-ink-muted">{client.email}</p>
              {client.address_line1 ? (
                <p className="mt-1 text-[13px] text-ink-muted">
                  {client.address_line1}
                  {client.city ? `, ${client.city}` : ""}
                  {client.postcode ? ` ${client.postcode}` : ""}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* items */}
          <div className="mt-7 overflow-x-auto">
            <table className="w-full min-w-[420px]">
              <thead>
                <tr className="border-b border-line">
                  <th className="pb-2.5 text-left">
                    <Overline>Description</Overline>
                  </th>
                  <th className="w-20 pb-2.5 text-right">
                    <Overline>Qty</Overline>
                  </th>
                  <th className="w-28 pb-2.5 text-right">
                    <Overline>Unit</Overline>
                  </th>
                  <th className="w-28 pb-2.5 text-right">
                    <Overline>Amount</Overline>
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, i) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 + i * 0.05, ease: EASE_OUT }}
                    className="border-b border-line/60 last:border-0"
                  >
                    <td className="py-3 pr-4 text-[13.5px] text-ink">
                      {item.description}
                    </td>
                    <td className="py-3 text-right text-[13px] tabular-nums text-ink-muted">
                      {formatQuantity(Number(item.quantity))}
                      {item.unit ? ` ${item.unit}` : ""}
                    </td>
                    <td className="py-3 text-right text-[13px] tabular-nums text-ink-muted">
                      {formatCurrency(item.unit_price, invoice.currency)}
                    </td>
                    <td className="py-3 text-right text-[13.5px] font-semibold tabular-nums text-ink">
                      {formatCurrency(item.amount, invoice.currency)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* totals */}
          <div className="mt-6 flex justify-end">
            <dl className="w-full max-w-[280px] space-y-2 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Subtotal</dt>
                <dd className="font-semibold tabular-nums text-ink">
                  {formatCurrency(invoice.subtotal, invoice.currency)}
                </dd>
              </div>
              {Number(invoice.tax_rate) > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Tax ({invoice.tax_rate}%)</dt>
                  <dd className="font-semibold tabular-nums text-ink">
                    {formatCurrency(invoice.tax_amount, invoice.currency)}
                  </dd>
                </div>
              ) : null}
              {Number(invoice.discount_amount) > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Discount</dt>
                  <dd className="font-semibold tabular-nums text-negative">
                    −{formatCurrency(invoice.discount_amount, invoice.currency)}
                  </dd>
                </div>
              ) : null}

              <div className="flex items-baseline justify-between border-t border-line pt-2.5">
                <dt className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                  Total
                </dt>
                <dd className="text-[22px] font-extrabold tabular-nums text-ink">
                  {formatCurrency(invoice.total, invoice.currency)}
                </dd>
              </div>

              {partly ? (
                <>
                  <div className="flex justify-between">
                    <dt className="text-positive">Paid so far</dt>
                    <dd className="font-semibold tabular-nums text-positive">
                      −{formatCurrency(invoice.amount_paid, invoice.currency)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between border-t border-line pt-2.5">
                    <dt className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                      Balance due
                    </dt>
                    <dd className="text-[18px] font-extrabold tabular-nums text-negative">
                      {formatCurrency(invoice.balance_due, invoice.currency)}
                    </dd>
                  </div>
                </>
              ) : null}
            </dl>
          </div>

          {invoice.notes || invoice.terms ? (
            <div className="mt-8 grid gap-6 border-t border-line pt-6 sm:grid-cols-2">
              {invoice.notes ? (
                <div>
                  <Overline>Notes</Overline>
                  <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-ink-muted">
                    {invoice.notes}
                  </p>
                </div>
              ) : null}
              {invoice.terms ? (
                <div>
                  <Overline>Payment terms</Overline>
                  <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-ink-muted">
                    {invoice.terms}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </Panel>

        {/* ── the rail ─────────────────────────────────────────── */}
        <div className="space-y-4 xl:sticky xl:top-20">
          {paid ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, ease: EASE_OUT }}
              className="flex items-center gap-3 rounded-[16px] bg-positive/10 p-4 ring-1 ring-positive/20"
            >
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-positive/15">
                <CheckCircle2 className="h-[18px] w-[18px] text-positive" />
              </span>
              <span>
                <span className="block text-[13.5px] font-bold text-ink">
                  Settled in full
                </span>
                <span className="block text-[12px] text-ink-muted">
                  {invoice.payment_method
                    ? `${invoice.payment_method.replace(/_/g, " ")}`
                    : "Payment recorded"}
                  {invoice.payment_date ? ` · ${formatDate(invoice.payment_date)}` : ""}
                </span>
              </span>
            </motion.div>
          ) : null}

          <Panel>
            <PanelHeader title="Progress" caption="Where this invoice has got to" />
            <div className="mt-5">
              <Timeline invoice={invoice} />
            </div>

            {/* the one thing to do next */}
            {invoice.status === "draft" ? (
              <Button
                variant="primary"
                className="mt-5 w-full"
                disabled={busy}
                onClick={() => setStatus("sent")}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Mark as sent
              </Button>
            ) : !paid ? (
              <Button
                variant="primary"
                className="mt-5 w-full"
                disabled={busy}
                onClick={() => setPayOpen(true)}
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark as paid
              </Button>
            ) : null}

            {!paid ? (
              <ButtonLink
                href={`/invoices/${invoice.id}/edit`}
                variant="ghost"
                className="mt-2 w-full"
              >
                <Pencil className="h-4 w-4" />
                Edit invoice
              </ButtonLink>
            ) : null}
          </Panel>

          <Panel>
            <PanelHeader title="Amount" />
            <p className="mt-3 text-[30px] font-extrabold leading-none tracking-[-0.025em] tabular-nums text-ink">
              {formatCurrency(paid ? invoice.total : invoice.balance_due, invoice.currency)}
            </p>
            <p className="mt-1.5 text-[12.5px] text-ink-muted">
              {paid
                ? "Received in full"
                : partly
                  ? `of ${formatCurrency(invoice.total, invoice.currency)} still outstanding`
                  : "outstanding"}
            </p>
          </Panel>
        </div>
      </div>

      {/* ---- mark as paid ---- */}
      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Mark as paid"
        description="How did the money arrive? This is recorded against the invoice."
      >
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((pm) => (
            <button
              key={pm.value}
              disabled={busy}
              onClick={() => setStatus("paid", pm.value)}
              className="rounded-[10px] bg-card px-4 py-3 text-[13px] font-semibold text-ink ring-1 ring-line transition-colors hover:bg-brass hover:text-white hover:ring-brass disabled:opacity-50"
            >
              {pm.label}
            </button>
          ))}
        </div>
      </Modal>

      {/* ---- send ---- */}
      <Modal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        title="Send this invoice"
        description={`${invoice.invoice_number} goes out as a PDF attachment, with a copy to you.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSendOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!sendEmail || sending}
              onClick={sendInvoice}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? "Sending…" : "Send invoice"}
            </Button>
          </>
        }
      >
        <Field
          label="Send to"
          hint={
            invoice.sent_to_email
              ? `Last sent to ${invoice.sent_to_email}${
                  invoice.sent_at ? ` on ${formatDate(invoice.sent_at)}` : ""
                }`
              : undefined
          }
        >
          <Input
            type="email"
            autoFocus
            value={sendEmail}
            onChange={(e) => setSendEmail(e.target.value)}
            placeholder="client@example.com"
          />
        </Field>
      </Modal>

      {/* ---- delete ---- */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Delete ${invoice.invoice_number}?`}
        description="This removes the invoice and its line items. It can't be undone."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={remove}>
              <Trash2 className="h-4 w-4" />
              Delete invoice
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
