"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, GripVertical, Trash2, ArrowLeft, Package } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import type { Client, Invoice, Item } from "@/types";

interface ItemForm {
  id: string;
  description: string;
  quantity: string;
  unit_price: string;
  unit: string;
}

let nextId = 1;
function newItem(): ItemForm {
  return {
    id: `new-${nextId++}`,
    description: "",
    quantity: "1",
    unit_price: "",
    unit: "",
  };
}

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [catalogItems, setCatalogItems] = useState<Item[]>([]);
  const [showCatalog, setShowCatalog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    client_id: "",
    issue_date: "",
    due_date: "",
    tax_rate: "0",
    discount_amount: "0",
    currency: "GBP",
    notes: "",
    terms: "",
  });

  const [items, setItems] = useState<ItemForm[]>([newItem()]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invoiceData, clientsData, catalogData] = await Promise.all([
          api.get<Invoice>(`/invoices/${invoiceId}`),
          api.get<Client[]>("/clients/"),
          api.get<Item[]>("/items/"),
        ]);

        // If not a draft, redirect to invoice detail
        if (invoiceData.status !== "draft") {
          router.replace(`/invoices/${invoiceId}`);
          return;
        }

        setInvoice(invoiceData);
        setClients(clientsData);
        setCatalogItems(catalogData);

        // Pre-fill form
        setForm({
          client_id: invoiceData.client_id || "",
          issue_date: invoiceData.issue_date,
          due_date: invoiceData.due_date,
          tax_rate: String(invoiceData.tax_rate),
          discount_amount: String(invoiceData.discount_amount),
          currency: invoiceData.currency,
          notes: invoiceData.notes || "",
          terms: invoiceData.terms || "",
        });

        // Pre-fill line items
        if (invoiceData.items && invoiceData.items.length > 0) {
          const sortedItems = [...invoiceData.items].sort(
            (a, b) => a.sort_order - b.sort_order
          );
          setItems(
            sortedItems.map((item) => ({
              id: `existing-${nextId++}`,
              description: item.description,
              quantity: String(item.quantity),
              unit_price: String(item.unit_price),
              unit: item.unit || "",
            }))
          );
        }
      } catch {
        setError("Failed to load invoice.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [invoiceId, router]);

  const addFromCatalog = (catalogItem: Item) => {
    setItems((prev) => [
      ...prev,
      {
        id: `new-${nextId++}`,
        description: catalogItem.name + (catalogItem.description ? ` - ${catalogItem.description}` : ""),
        quantity: "1",
        unit_price: String(catalogItem.unit_price),
        unit: catalogItem.unit || "",
      },
    ]);
    setShowCatalog(false);
  };

  // Calculate totals
  const subtotal = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price) || 0;
    return sum + qty * price;
  }, 0);

  const taxRate = parseFloat(form.tax_rate) || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const discount = parseFloat(form.discount_amount) || 0;
  const total = subtotal + taxAmount - discount;

  const updateItem = (index: number, field: keyof ItemForm, value: string) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Drag and drop
  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;

    setItems((prev) => {
      const newItems = [...prev];
      const [dragged] = newItems.splice(dragIndex, 1);
      newItems.splice(index, 0, dragged);
      return newItems;
    });
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const invoiceData = {
        client_id: form.client_id || null,
        issue_date: form.issue_date,
        due_date: form.due_date,
        tax_rate: parseFloat(form.tax_rate) || 0,
        discount_amount: parseFloat(form.discount_amount) || 0,
        currency: form.currency,
        notes: form.notes || null,
        terms: form.terms || null,
        items: items
          .filter((item) => item.description && item.unit_price)
          .map((item, index) => ({
            description: item.description,
            quantity: parseFloat(item.quantity) || 1,
            unit_price: parseFloat(item.unit_price) || 0,
            unit: item.unit || null,
            sort_order: index,
          })),
      };

      await api.put<Invoice>(`/invoices/${invoiceId}`, invoiceData);
      router.push(`/invoices/${invoiceId}`);
    } catch {
      setError("Failed to save invoice. Please check your inputs.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-4 w-4 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
        </div>
        <div className="space-y-6">
          <div className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)]">
            <div className="h-5 w-32 rounded bg-gray-200 animate-pulse mb-5" />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <div key={i}>
                  <div className="h-4 w-20 rounded bg-gray-200 animate-pulse mb-1" />
                  <div className="h-10 rounded bg-gray-100 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)]">
            <div className="h-5 w-24 rounded bg-gray-200 animate-pulse mb-5" />
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 rounded bg-gray-100 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[var(--radius-card)] bg-white p-8 shadow-[var(--shadow-card)] text-center">
          <p className="text-text-secondary">Invoice not found.</p>
          <Link
            href="/invoices"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-petrol-mid hover:text-petrol-dark transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to invoices
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={`/invoices/${invoiceId}`}
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to invoice
      </Link>

      <h1 className="text-xl font-bold text-text-primary mb-6">
        Edit Invoice — {invoice.invoice_number}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-[var(--radius-input)] bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Header section */}
        <div className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-base font-semibold text-text-primary mb-5">
            Invoice Details
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Client
              </label>
              <select
                value={form.client_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, client_id: e.target.value }))
                }
                className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2.5 text-sm focus:border-petrol-mid focus:outline-none bg-white"
              >
                <option value="">Select client (optional)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Currency
              </label>
              <select
                value={form.currency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, currency: e.target.value }))
                }
                className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2.5 text-sm focus:border-petrol-mid focus:outline-none bg-white"
              >
                <option value="GBP">GBP (£)</option>
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Issue date *
              </label>
              <input
                type="date"
                value={form.issue_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, issue_date: e.target.value }))
                }
                required
                className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2.5 text-sm focus:border-petrol-mid focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Due date *
              </label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, due_date: e.target.value }))
                }
                required
                className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2.5 text-sm focus:border-petrol-mid focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-base font-semibold text-text-primary mb-5">
            Line Items
          </h2>

          {/* Header */}
          <div className="hidden sm:grid sm:grid-cols-[28px_1fr_80px_100px_100px_32px] gap-3 mb-2 px-1">
            <div />
            <span className="text-xs font-medium text-text-secondary">
              Description
            </span>
            <span className="text-xs font-medium text-text-secondary">Qty</span>
            <span className="text-xs font-medium text-text-secondary">
              Unit Price
            </span>
            <span className="text-xs font-medium text-text-secondary text-right">
              Amount
            </span>
            <div />
          </div>

          {/* Items */}
          <div className="space-y-2">
            {items.map((item, index) => {
              const qty = parseFloat(item.quantity) || 0;
              const price = parseFloat(item.unit_price) || 0;
              const amount = qty * price;

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`grid grid-cols-1 sm:grid-cols-[28px_1fr_80px_100px_100px_32px] gap-3 rounded-xl border border-gray-200 p-3 sm:p-2 sm:border-transparent sm:hover:border-gray-200 transition-colors ${
                    dragIndex === index ? "opacity-50" : ""
                  }`}
                >
                  <div className="hidden sm:flex items-center justify-center cursor-grab">
                    <GripVertical className="h-4 w-4 text-text-secondary/40" />
                  </div>
                  <input
                    type="text"
                    placeholder="Item description"
                    value={item.description}
                    onChange={(e) =>
                      updateItem(index, "description", e.target.value)
                    }
                    className="rounded-[var(--radius-input)] border border-gray-200 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, "quantity", e.target.value)
                    }
                    className="rounded-[var(--radius-input)] border border-gray-200 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={item.unit_price}
                    onChange={(e) =>
                      updateItem(index, "unit_price", e.target.value)
                    }
                    className="rounded-[var(--radius-input)] border border-gray-200 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none"
                  />
                  <div className="flex items-center justify-end text-sm font-medium text-text-primary">
                    {formatCurrency(amount, form.currency)}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    className="flex items-center justify-center rounded-lg p-1 text-text-secondary hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:hover:text-text-secondary disabled:hover:bg-transparent transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, newItem()])}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-button)] border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-text-secondary hover:border-petrol-mid hover:text-petrol-mid transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add item
            </button>
            {catalogItems.length > 0 && (
              <button
                type="button"
                onClick={() => setShowCatalog(!showCatalog)}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-button)] border border-gray-300 px-3 py-2 text-sm font-medium text-petrol-mid hover:bg-petrol-dark hover:text-white transition-colors"
              >
                <Package className="h-4 w-4" />
                Pick from catalog
              </button>
            )}
          </div>

          {/* Catalog picker dropdown */}
          {showCatalog && catalogItems.length > 0 && (
            <div className="mt-2 rounded-xl border border-gray-200 bg-white shadow-[var(--shadow-dropdown)] max-h-60 overflow-y-auto">
              {catalogItems.map((ci) => (
                <button
                  key={ci.id}
                  type="button"
                  onClick={() => addFromCatalog(ci)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-light transition-colors border-b border-gray-50 last:border-b-0"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">{ci.name}</p>
                    {ci.description && (
                      <p className="text-xs text-text-secondary truncate max-w-xs">{ci.description}</p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-semibold text-text-primary">
                      {formatCurrency(ci.unit_price, form.currency)}
                    </p>
                    {ci.unit && (
                      <p className="text-xs text-text-secondary">per {ci.unit}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Totals & notes */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Notes */}
          <div className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)]">
            <h2 className="text-base font-semibold text-text-primary mb-4">
              Notes & Terms
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={3}
                  placeholder="Any notes for the client..."
                  className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Payment terms
                </label>
                <textarea
                  value={form.terms}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, terms: e.target.value }))
                  }
                  rows={2}
                  placeholder="e.g. Payment due within 30 days..."
                  className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)]">
            <h2 className="text-base font-semibold text-text-primary mb-4">
              Summary
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Tax rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.tax_rate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, tax_rate: e.target.value }))
                    }
                    className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Discount
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.discount_amount}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        discount_amount: e.target.value,
                      }))
                    }
                    className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2 border-t border-gray-100 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Subtotal</span>
                  <span className="font-medium">
                    {formatCurrency(subtotal, form.currency)}
                  </span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">
                      Tax ({taxRate}%)
                    </span>
                    <span className="font-medium">
                      {formatCurrency(taxAmount, form.currency)}
                    </span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Discount</span>
                    <span className="font-medium text-coral">
                      -{formatCurrency(discount, form.currency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-100 pt-2">
                  <span className="text-base font-semibold">Total</span>
                  <span className="text-xl font-bold text-petrol-dark">
                    {formatCurrency(total, form.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link
            href={`/invoices/${invoiceId}`}
            className="rounded-[var(--radius-button)] border border-gray-300 px-5 py-2.5 text-sm font-medium text-text-primary hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-[var(--radius-button)] bg-petrol-dark px-5 py-2.5 text-sm font-semibold text-white hover:bg-petrol-mid disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
