"use client";

/* =========================================================================
   Invoices.

   A hybrid, not a table: every invoice is a row you can scan in one pass —
   status, who, how much, when — with the detail columns appearing as the
   screen gets wider rather than being crammed in or scrolled to.

   Rows animate on filter change via `layout`, so switching from All to
   Overdue reads as a list settling rather than a page swap.
   ========================================================================= */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Ban,
  CheckCircle,
  Copy,
  Eye,
  FileText,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatCurrency, formatDate, num } from "@/lib/utils";
import { EASE_OUT } from "@/components/motion";
import { PageHeader } from "@/components/app/page-header";
import { Button, ButtonLink } from "@/components/app/button";
import { SearchInput } from "@/components/app/form";
import { SegmentedControl } from "@/components/app/segmented-control";
import { RowMenu, type MenuItem } from "@/components/app/menu";
import { Modal } from "@/components/app/modal";
import StatusBadge from "@/components/ui/status-badge";
import EmptyState from "@/components/ui/empty-state";
import type {
  Client,
  InvoiceListItem,
  InvoiceStatus,
  PaymentMethod,
} from "@/types";

type Filter = InvoiceStatus | "all";

const PAYMENT_METHODS: { label: string; value: PaymentMethod }[] = [
  { label: "Bank transfer", value: "bank_transfer" },
  { label: "Card", value: "card" },
  { label: "Cash", value: "cash" },
  { label: "Other", value: "other" },
];

/** Days between today and the due date, positive when overdue. */
function daysPastDue(dueDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - due.getTime()) / 86_400_000);
}

/** The one line of urgency worth showing next to a row, if any. */
function urgency(inv: InvoiceListItem) {
  const diff = daysPastDue(inv.due_date);
  if (inv.status === "overdue") {
    return { text: `${diff} day${diff === 1 ? "" : "s"} late`, tone: "negative" as const };
  }
  if (inv.status === "sent" && diff === 0) {
    return { text: "Due today", tone: "warn" as const };
  }
  if (inv.status === "sent" && diff < 0 && diff >= -3) {
    const n = Math.abs(diff);
    return { text: `Due in ${n} day${n === 1 ? "" : "s"}`, tone: "warn" as const };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Row                                                                 */
/* ------------------------------------------------------------------ */

function InvoiceRow({
  inv,
  clientName,
  index,
  menu,
}: {
  inv: InvoiceListItem;
  clientName: string;
  index: number;
  menu: MenuItem[];
}) {
  const u = urgency(inv);
  const paidOff = inv.status === "paid";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.99, transition: { duration: 0.15 } }}
      transition={{ duration: 0.45, delay: Math.min(index, 8) * 0.03, ease: EASE_OUT }}
      className="group relative"
    >
      <Link
        href={`/invoices/${inv.id}`}
        className="flex items-center gap-4 rounded-[14px] bg-card px-4 py-3.5 ring-1 ring-line transition-all duration-200 hover:shadow-[var(--shadow-card-hover)] hover:ring-brass-soft/40"
      >
        {/* status rail — a colour and a shape, readable at a glance */}
        <span
          className={cn(
            "hidden h-9 w-9 flex-none items-center justify-center rounded-[11px] sm:flex",
            paidOff
              ? "bg-positive/10 text-positive"
              : inv.status === "overdue"
                ? "bg-negative/10 text-negative"
                : inv.status === "sent"
                  ? "bg-brass/[0.09] text-brass-ink"
                  : "bg-elevated text-ink-muted"
          )}
        >
          <FileText className="h-4 w-4" />
        </span>

        {/* number + client */}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[14px] font-bold tracking-[-0.01em] text-ink">
              {inv.invoice_number}
            </span>
            <StatusBadge status={inv.status} size="sm" />
            {u ? (
              <span
                className={cn(
                  "text-[11.5px] font-semibold",
                  u.tone === "negative" ? "text-negative" : "text-brass-ink"
                )}
              >
                {u.text}
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block truncate text-[12.5px] text-ink-muted">
            {clientName}
          </span>
        </span>

        {/* issue date — only when there's room */}
        <span className="hidden w-28 flex-none text-[12.5px] text-ink-muted lg:block">
          {formatDate(inv.issue_date)}
        </span>

        {/* due date */}
        <span className="hidden w-28 flex-none text-[12.5px] text-ink-muted md:block">
          {formatDate(inv.due_date)}
        </span>

        {/* amount — fixed width so it lines up with the column key */}
        <span className="w-28 flex-none text-right">
          <span className="block text-[14.5px] font-bold tabular-nums text-ink">
            {formatCurrency(num(inv.total), inv.currency)}
          </span>
          {num(inv.balance_due) > 0 && num(inv.balance_due) !== num(inv.total) ? (
            <span className="block text-[11px] tabular-nums text-ink-muted">
              {formatCurrency(num(inv.balance_due), inv.currency)} left
            </span>
          ) : null}
        </span>

        <span className="w-8 flex-none" />
      </Link>

      {/* The menu lives outside the Link so its clicks don't navigate. */}
      <span className="absolute right-3 top-1/2 -translate-y-1/2">
        <RowMenu items={menu} label={`Actions for ${inv.invoice_number}`} />
      </span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [payingId, setPayingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [inv, cl] = await Promise.all([
        api.get<InvoiceListItem[]>("/invoices/"),
        api.get<Client[]>("/clients/"),
      ]);
      setInvoices(inv);
      setClients(cl);
    } catch {
      /* the empty state covers it */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clientName = useCallback(
    (id: string | null) =>
      (id ? clients.find((c) => c.id === id)?.company_name : null) ?? "No client",
    [clients]
  );

  /* Filtering and searching happen here rather than on the server: the list
     is small enough that a round trip per keystroke would feel worse. */
  const counts = useMemo(() => {
    const base: Record<Filter, number> = {
      all: invoices.length,
      draft: 0,
      sent: 0,
      paid: 0,
      overdue: 0,
      cancelled: 0,
    };
    for (const i of invoices) base[i.status] += 1;
    return base;
  }, [invoices]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((i) => {
      if (filter !== "all" && i.status !== filter) return false;
      if (!q) return true;
      return (
        i.invoice_number.toLowerCase().includes(q) ||
        clientName(i.client_id).toLowerCase().includes(q)
      );
    });
  }, [invoices, filter, search, clientName]);

  /* Outstanding means money asked for and not received, so drafts are out —
     the same rule the dashboard and reports use. Counting them here would
     make this header disagree with every other screen. */
  const openInvoices = useMemo(
    () => visible.filter((i) => i.status === "sent" || i.status === "overdue"),
    [visible]
  );

  const outstanding = useMemo(
    () => openInvoices.reduce((sum, i) => sum + num(i.balance_due), 0),
    [openInvoices]
  );

  /* ---- actions ---- */

  const markSent = async (id: string) => {
    await api.patch(`/invoices/${id}/status`, { status: "sent" });
    fetchData();
  };

  const markPaid = async (method: PaymentMethod) => {
    if (!payingId) return;
    await api.patch(`/invoices/${payingId}/status`, {
      status: "paid",
      payment_method: method,
      payment_date: new Date().toISOString().split("T")[0],
    });
    setPayingId(null);
    fetchData();
  };

  const cancel = async (id: string) => {
    await api.patch(`/invoices/${id}/status`, { status: "cancelled" });
    fetchData();
  };

  const reopen = async (id: string) => {
    await api.patch(`/invoices/${id}/status`, { status: "draft" });
    fetchData();
  };

  const duplicate = async (id: string) => {
    await api.post(`/invoices/${id}/duplicate`);
    fetchData();
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    await api.delete(`/invoices/${deletingId}`);
    setInvoices((prev) => prev.filter((i) => i.id !== deletingId));
    setDeletingId(null);
  };

  const menuFor = (inv: InvoiceListItem): MenuItem[] => [
    { label: "View", icon: Eye, href: `/invoices/${inv.id}` },
    {
      label: "Edit",
      icon: Pencil,
      href: `/invoices/${inv.id}/edit`,
      show: inv.status !== "paid" && inv.status !== "cancelled",
    },
    {
      label: "Mark as sent",
      icon: Send,
      onSelect: () => markSent(inv.id),
      show: inv.status === "draft",
    },
    {
      label: "Mark as paid",
      icon: CheckCircle,
      onSelect: () => setPayingId(inv.id),
      show: inv.status === "sent" || inv.status === "overdue",
    },
    { label: "Duplicate", icon: Copy, onSelect: () => duplicate(inv.id) },
    {
      label: "Cancel invoice",
      icon: Ban,
      onSelect: () => cancel(inv.id),
      show: inv.status !== "paid" && inv.status !== "cancelled",
    },
    {
      label: "Reopen",
      icon: RotateCcw,
      onSelect: () => reopen(inv.id),
      show: inv.status === "cancelled",
    },
    {
      label: "Delete",
      icon: Trash2,
      tone: "danger",
      onSelect: () => setDeletingId(inv.id),
      show: inv.status !== "paid",
    },
  ];

  const deleting = invoices.find((i) => i.id === deletingId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Invoices"
        title="Everything you've billed."
        subtitle={(() => {
          if (outstanding <= 0) {
            return "Nothing outstanding — every invoice on this list is settled.";
          }
          const open = openInvoices.length;
          const money = formatCurrency(outstanding, invoices[0]?.currency ?? "GBP");
          return `${money} still outstanding across ${open} ${
            open === 1 ? "invoice" : "invoices"
          }.`;
        })()}
        actions={
          <ButtonLink href="/invoices/new" variant="primary">
            <Plus className="h-4 w-4" />
            New invoice
          </ButtonLink>
        }
      />

      {/* controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SegmentedControl<Filter>
          layoutId="invoice-filter"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "draft", label: "Draft", count: counts.draft },
            { value: "sent", label: "Sent", count: counts.sent },
            { value: "overdue", label: "Overdue", count: counts.overdue },
            { value: "paid", label: "Paid", count: counts.paid },
            { value: "cancelled", label: "Cancelled", count: counts.cancelled },
          ]}
        />
        <SearchInput
          placeholder="Search by number or client…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="lg:w-72"
        />
      </div>

      {/* column key — only where the columns actually exist */}
      {!loading && visible.length > 0 ? (
        <div className="hidden items-center gap-4 px-4 md:flex">
          <span className="hidden h-9 w-9 flex-none sm:block" />
          <span className="flex-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Invoice
          </span>
          <span className="hidden w-28 flex-none text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted lg:block">
            Issued
          </span>
          <span className="w-28 flex-none text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Due
          </span>
          <span className="w-28 flex-none text-right text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Amount
          </span>
          <span className="w-8 flex-none" />
        </div>
      ) : null}

      {/* rows */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[68px] animate-pulse rounded-[14px] bg-elevated" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={
            invoices.length === 0
              ? "No invoices yet"
              : search
                ? "Nothing matches that search"
                : `No ${filter} invoices`
          }
          description={
            invoices.length === 0
              ? "Your first invoice takes about a minute. Pick a client, add your lines, send."
              : search
                ? "Try a different invoice number or client name."
                : "Nothing in this state right now. Try another filter."
          }
          action={
            invoices.length === 0 ? (
              <ButtonLink href="/invoices/new" variant="primary">
                <Plus className="h-4 w-4" />
                Create your first invoice
              </ButtonLink>
            ) : search ? (
              <Button variant="secondary" onClick={() => setSearch("")}>
                Clear search
              </Button>
            ) : undefined
          }
        />
      ) : (
        <motion.div layout className="space-y-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((inv, i) => (
              <InvoiceRow
                key={inv.id}
                inv={inv}
                index={i}
                clientName={clientName(inv.client_id)}
                menu={menuFor(inv)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ---- mark as paid ---- */}
      <Modal
        open={Boolean(payingId)}
        onClose={() => setPayingId(null)}
        title="Mark as paid"
        description="How did the money arrive? This is recorded against the invoice."
      >
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((pm) => (
            <button
              key={pm.value}
              onClick={() => markPaid(pm.value)}
              className="rounded-[10px] bg-card px-4 py-3 text-[13px] font-semibold text-ink ring-1 ring-line transition-colors hover:bg-brass hover:text-white hover:ring-brass"
            >
              {pm.label}
            </button>
          ))}
        </div>
      </Modal>

      {/* ---- delete ---- */}
      <Modal
        open={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        title={`Delete ${deleting?.invoice_number ?? "invoice"}?`}
        description="This removes the invoice and its line items. It can't be undone."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeletingId(null)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              <Trash2 className="h-4 w-4" />
              Delete invoice
            </Button>
          </>
        }
      />
    </div>
  );
}
