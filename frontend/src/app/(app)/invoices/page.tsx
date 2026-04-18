"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  FileText,
  MoreHorizontal,
  Copy,
  Trash2,
  Eye,
  Send,
  CheckCircle,
  LayoutGrid,
  List,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import StatusBadge from "@/components/ui/status-badge";
import EmptyState from "@/components/ui/empty-state";
import type { Client, InvoiceListItem, InvoiceStatus, PaymentMethod } from "@/types";

const statusFilters: { label: string; value: InvoiceStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
];

function getStatusDescription(inv: InvoiceListItem): string | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(inv.due_date);
  due.setHours(0, 0, 0, 0);
  const diff = Math.floor(
    (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (inv.status === "overdue")
    return `Overdue by ${diff} day${diff !== 1 ? "s" : ""}`;
  if (inv.status === "sent" && diff === 0) return "Due today";
  if (inv.status === "sent" && diff < 0 && diff >= -3)
    return `Due in ${Math.abs(diff)} day${Math.abs(diff) !== 1 ? "s" : ""}`;
  return null;
}

function getStatusIconColour(status: InvoiceStatus) {
  switch (status) {
    case "paid":
      return { bg: "bg-emerald-50", text: "text-emerald-500" };
    case "overdue":
      return { bg: "bg-red-50", text: "text-red-500" };
    case "sent":
      return { bg: "bg-blue-50", text: "text-blue-500" };
    default:
      return { bg: "bg-gray-50", text: "text-gray-400" };
  }
}

const paymentMethods: { label: string; value: PaymentMethod }[] = [
  { label: "Bank Transfer", value: "bank_transfer" },
  { label: "Card", value: "card" },
  { label: "Cash", value: "cash" },
  { label: "Other", value: "other" },
];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">(
    "all"
  );
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [paymentModal, setPaymentModal] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      const qs = params.toString() ? `?${params.toString()}` : "";

      const [inv, cl] = await Promise.all([
        api.get<InvoiceListItem[]>(`/invoices/${qs}`),
        api.get<Client[]>("/clients/"),
      ]);
      setInvoices(inv);
      setClients(cl);
    } catch {
      // handle
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null);
        setMenuPosition(null);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(null);
    setMenuPosition(null);
  }

  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));

  const handleMarkSent = async (id: string) => {
    try {
      await api.patch(`/invoices/${id}/status`, { status: "sent" });
      fetchData();
    } catch {
      // handle
    }
    closeMenu();
  };

  const handleMarkPaid = async (id: string, paymentMethod: PaymentMethod) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      await api.patch(`/invoices/${id}/status`, {
        status: "paid",
        payment_method: paymentMethod,
        payment_date: today,
      });
      fetchData();
    } catch {
      // handle
    }
    setPaymentModal(null);
    closeMenu();
  };

  const handleDuplicate = async (id: string) => {
    await api.post(`/invoices/${id}/duplicate`);
    fetchData();
    closeMenu();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this invoice?")) return;
    await api.delete(`/invoices/${id}`);
    setInvoices((prev) => prev.filter((i) => i.id !== id));
    closeMenu();
  };

  // Shared action dropdown renderer
  function renderActionsDropdown(inv: InvoiceListItem) {
    return (
      <div className="relative">
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (menuOpen === inv.id) {
              closeMenu();
            } else {
              const rect = e.currentTarget.getBoundingClientRect();
              setMenuPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
              setMenuOpen(inv.id);
            }
          }}
          className="rounded-lg p-1.5 text-text-secondary opacity-0 transition-opacity hover:bg-surface-light group-hover:opacity-100"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {menuOpen === inv.id && menuPosition && (
          <div
            ref={menuRef}
            style={{ top: menuPosition.top, right: menuPosition.right }}
            className="fixed z-50 w-44 rounded-xl bg-white py-1 shadow-[var(--shadow-dropdown)]"
          >
            <Link
              href={`/invoices/${inv.id}`}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-light"
            >
              <Eye className="h-3.5 w-3.5" />
              View
            </Link>
            {inv.status === "draft" && (
              <button
                onClick={() => handleMarkSent(inv.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-light"
              >
                <Send className="h-3.5 w-3.5" />
                Mark as Sent
              </button>
            )}
            {(inv.status === "sent" || inv.status === "overdue") && (
              <button
                onClick={() => {
                  setPaymentModal(inv.id);
                  closeMenu();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-light"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Mark as Paid
              </button>
            )}
            <button
              onClick={() => handleDuplicate(inv.id)}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-light"
            >
              <Copy className="h-3.5 w-3.5" />
              Duplicate
            </button>
            {inv.status !== "paid" && (
              <button
                onClick={() => handleDelete(inv.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderDueInfo(inv: InvoiceListItem) {
    const desc = getStatusDescription(inv);
    if (inv.status === "overdue" && desc) {
      return <span className="text-red-500 font-medium">{desc}</span>;
    }
    if (desc) {
      return <span className="text-orange-500 font-medium">{desc}</span>;
    }
    return <span>Due {formatDate(inv.due_date)}</span>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[var(--radius-input)] border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-petrol-mid focus:outline-none"
          />
        </div>
        <Link
          href="/invoices/new"
          className="inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-coral px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-coral-dark"
        >
          <Plus className="h-4 w-4" />
          Create Invoice
        </Link>
      </div>

      {/* Status filter tabs + View toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1 rounded-xl bg-white p-1 shadow-[var(--shadow-card)] w-fit">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
                statusFilter === f.value
                  ? "bg-petrol-dark text-white"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-light"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 rounded-xl bg-white p-1 shadow-[var(--shadow-card)]">
          <button
            onClick={() => setViewMode("card")}
            className={cn(
              "rounded-lg p-2 transition-colors",
              viewMode === "card"
                ? "bg-petrol-dark text-white"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-light"
            )}
            title="Card view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={cn(
              "rounded-lg p-2 transition-colors",
              viewMode === "table"
                ? "bg-petrol-dark text-white"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-light"
            )}
            title="Table view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]"
            />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices found"
          description={
            statusFilter !== "all"
              ? `No ${statusFilter} invoices. Try a different filter.`
              : "Create your first invoice to get started."
          }
          action={
            statusFilter === "all" ? (
              <Link
                href="/invoices/new"
                className="inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-coral px-4 py-2.5 text-sm font-semibold text-white hover:bg-coral-dark transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create your first invoice
              </Link>
            ) : undefined
          }
        />
      ) : viewMode === "card" ? (
        /* ========== CARD VIEW ========== */
        <div className="space-y-3">
          {invoices.map((inv) => {
            const client = inv.client_id ? clientMap[inv.client_id] : null;
            const colours = getStatusIconColour(inv.status);

            return (
              <div
                key={inv.id}
                className="group relative flex items-center gap-4 rounded-[var(--radius-card)] bg-white px-5 py-4 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]"
              >
                {/* Status indicator */}
                <div className="hidden sm:block">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl",
                      colours.bg
                    )}
                  >
                    <FileText className={cn("h-5 w-5", colours.text)} />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="font-semibold text-text-primary hover:text-petrol-mid transition-colors"
                    >
                      {inv.invoice_number}
                    </Link>
                    <StatusBadge status={inv.status} />
                  </div>
                  <p className="mt-0.5 text-sm text-text-secondary truncate">
                    {client?.company_name || "No client"} &middot;{" "}
                    {renderDueInfo(inv)}
                  </p>
                </div>

                {/* Amount */}
                <div className="text-right">
                  <p className="text-base font-semibold text-text-primary">
                    {formatCurrency(inv.total, inv.currency)}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {formatDate(inv.issue_date)}
                  </p>
                </div>

                {/* Actions */}
                {renderActionsDropdown(inv)}
              </div>
            );
          })}
        </div>
      ) : (
        /* ========== TABLE VIEW ========== */
        <div className="overflow-x-auto rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Date
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Invoice #
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Client
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Due Date
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Amount
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.map((inv) => {
                const client = inv.client_id
                  ? clientMap[inv.client_id]
                  : null;
                const desc = getStatusDescription(inv);

                return (
                  <tr
                    key={inv.id}
                    className="group transition-colors hover:bg-surface-light/50"
                  >
                    <td className="whitespace-nowrap px-5 py-3.5 text-text-secondary">
                      {formatDate(inv.issue_date)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="font-semibold text-text-primary hover:text-petrol-mid transition-colors"
                      >
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-text-primary">
                      {client?.company_name || "No client"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={inv.status} />
                        {desc && (
                          <span
                            className={cn(
                              "text-xs font-medium",
                              inv.status === "overdue"
                                ? "text-red-500"
                                : "text-orange-500"
                            )}
                          >
                            {desc}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-text-secondary">
                      {formatDate(inv.due_date)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-text-primary">
                      {formatCurrency(inv.total, inv.currency)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right">
                      {renderActionsDropdown(inv)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment Method Modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-dropdown)]">
            <h3 className="text-lg font-semibold text-text-primary mb-1">
              Mark as Paid
            </h3>
            <p className="text-sm text-text-secondary mb-5">
              Select the payment method used.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((pm) => (
                <button
                  key={pm.value}
                  onClick={() => handleMarkPaid(paymentModal, pm.value)}
                  className="rounded-[var(--radius-button)] border border-gray-200 px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:border-petrol-mid hover:bg-petrol-dark hover:text-white"
                >
                  {pm.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPaymentModal(null)}
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
