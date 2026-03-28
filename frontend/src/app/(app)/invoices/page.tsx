"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Filter,
  FileText,
  MoreHorizontal,
  Copy,
  Trash2,
  Eye,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import StatusBadge from "@/components/ui/status-badge";
import EmptyState from "@/components/ui/empty-state";
import type { Client, InvoiceListItem, InvoiceStatus } from "@/types";

const statusFilters: { label: string; value: InvoiceStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">(
    "all"
  );
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

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

  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));

  const handleDuplicate = async (id: string) => {
    await api.post(`/invoices/${id}/duplicate`);
    fetchData();
    setMenuOpen(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this invoice?")) return;
    await api.delete(`/invoices/${id}`);
    setInvoices((prev) => prev.filter((i) => i.id !== id));
    setMenuOpen(null);
  };

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

      {/* Status filter tabs */}
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

      {/* Invoice Cards */}
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
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const client = inv.client_id ? clientMap[inv.client_id] : null;
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
                      inv.status === "paid"
                        ? "bg-emerald-50"
                        : inv.status === "overdue"
                          ? "bg-red-50"
                          : inv.status === "sent"
                            ? "bg-blue-50"
                            : "bg-gray-50"
                    )}
                  >
                    <FileText
                      className={cn(
                        "h-5 w-5",
                        inv.status === "paid"
                          ? "text-emerald-500"
                          : inv.status === "overdue"
                            ? "text-red-500"
                            : inv.status === "sent"
                              ? "text-blue-500"
                              : "text-gray-400"
                      )}
                    />
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
                    {client?.company_name || "No client"} &middot; Due{" "}
                    {formatDate(inv.due_date)}
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
                <div className="relative">
                  <button
                    onClick={() =>
                      setMenuOpen(menuOpen === inv.id ? null : inv.id)
                    }
                    className="rounded-lg p-1.5 text-text-secondary opacity-0 transition-opacity hover:bg-surface-light group-hover:opacity-100"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {menuOpen === inv.id && (
                    <div className="absolute right-0 top-8 z-10 w-40 rounded-xl bg-white py-1 shadow-[var(--shadow-dropdown)]">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-light"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Link>
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
