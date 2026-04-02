"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Package,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  MoreHorizontal,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import EmptyState from "@/components/ui/empty-state";
import type { Item } from "@/types";

const UNIT_OPTIONS = ["hour", "day", "item", "project"] as const;

export default function ItemsPage() {
  const { user } = useAuth();
  const currency = user?.currency || "GBP";

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await api.get<Item[]>(`/items/${params}`);
      setItems(res);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item? This cannot be undone.")) return;
    await api.delete(`/items/${id}`);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setMenuOpen(null);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = () => setMenuOpen(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [menuOpen]);

  const filtered = items.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[var(--radius-input)] border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-petrol-mid focus:outline-none"
          />
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-petrol-dark px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-petrol-mid"
        >
          <Plus className="h-4 w-4" />
          New Item
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)] overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse border-b border-gray-50 last:border-0"
            />
          ))}
        </div>
      ) : filtered.length === 0 && !search ? (
        <EmptyState
          icon={Package}
          title="No items yet"
          description="Goods and Services. If they have a price tag, put them here."
          action={
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-coral px-4 py-2.5 text-sm font-semibold text-white hover:bg-coral-dark transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add your first item
            </button>
          }
        />
      ) : filtered.length === 0 && search ? (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] bg-white px-8 py-16 text-center shadow-[var(--shadow-card)]">
          <Search className="h-7 w-7 text-text-secondary" />
          <h3 className="mt-4 text-base font-semibold text-text-primary">
            No results found
          </h3>
          <p className="mt-1.5 text-sm text-text-secondary">
            No items match &ldquo;{search}&rdquo;
          </p>
        </div>
      ) : (
        /* Table */
        <div className="rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)] overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_1.5fr_0.75fr_0.6fr_0.6fr_0.4fr] gap-4 border-b border-gray-100 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">
            <span>Name</span>
            <span>Description</span>
            <span>Rate</span>
            <span>Unit</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>

          {/* Rows */}
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group relative grid grid-cols-1 sm:grid-cols-[1fr_1.5fr_0.75fr_0.6fr_0.6fr_0.4fr] gap-2 sm:gap-4 items-center border-b border-gray-50 px-5 py-3.5 last:border-0 transition-colors hover:bg-surface-light/50"
            >
              {/* Name */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg bg-petrol-dark/5">
                  <Package className="h-4 w-4 text-petrol-dark" />
                </div>
                <span className="text-sm font-semibold text-text-primary truncate">
                  {item.name}
                </span>
              </div>

              {/* Description */}
              <span className="text-sm text-text-secondary truncate">
                {item.description || "\u2014"}
              </span>

              {/* Rate */}
              <span className="text-sm font-medium text-text-primary">
                {formatCurrency(item.unit_price, currency)}
              </span>

              {/* Unit */}
              <span className="text-sm text-text-secondary capitalize">
                {item.unit || "\u2014"}
              </span>

              {/* Status */}
              <div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    item.is_active
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {item.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Actions */}
              <div className="flex justify-end">
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(menuOpen === item.id ? null : item.id);
                    }}
                    className="rounded-lg p-1.5 text-text-secondary opacity-0 transition-opacity hover:bg-gray-100 group-hover:opacity-100"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {menuOpen === item.id && (
                    <div
                      className="absolute right-0 top-8 z-10 w-36 rounded-xl bg-white py-1 shadow-[var(--shadow-dropdown)]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setShowModal(true);
                          setMenuOpen(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-light"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ItemModal
          item={editingItem}
          currency={currency}
          onClose={() => {
            setShowModal(false);
            setEditingItem(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setEditingItem(null);
            fetchItems();
          }}
        />
      )}
    </div>
  );
}

function ItemModal({
  item,
  currency,
  onClose,
  onSaved,
}: {
  item: Item | null;
  currency: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: item?.name || "",
    description: item?.description || "",
    unit_price: item?.unit_price?.toString() || "",
    unit: item?.unit || "hour",
    is_active: item?.is_active ?? true,
  });
  const [customUnit, setCustomUnit] = useState(
    item?.unit && !UNIT_OPTIONS.includes(item.unit as (typeof UNIT_OPTIONS)[number])
      ? item.unit
      : ""
  );
  const [useCustomUnit, setUseCustomUnit] = useState(
    item?.unit != null &&
      !UNIT_OPTIONS.includes(item.unit as (typeof UNIT_OPTIONS)[number])
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const resolvedUnit = useCustomUnit ? customUnit : form.unit;

    try {
      const data = {
        name: form.name,
        description: form.description || null,
        unit_price: parseFloat(form.unit_price),
        unit: resolvedUnit || null,
        is_active: form.is_active,
      };

      if (item) {
        await api.put(`/items/${item.id}`, data);
      } else {
        await api.post("/items/", data);
      }
      onSaved();
    } catch {
      setError("Failed to save item. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-dropdown)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-text-primary">
            {item ? "Edit Item" : "New Item"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-light transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-[var(--radius-input)] bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              placeholder="e.g. Web Development, Logo Design"
              className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={2}
              placeholder="Optional description for this item"
              className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none resize-none"
            />
          </div>

          {/* Rate & Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Rate ({currency}) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.unit_price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, unit_price: e.target.value }))
                }
                required
                placeholder="0.00"
                className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Unit
              </label>
              {useCustomUnit ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    placeholder="Custom unit"
                    className="flex-1 rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setUseCustomUnit(false);
                      setCustomUnit("");
                      setForm((f) => ({ ...f, unit: "hour" }));
                    }}
                    className="rounded-[var(--radius-input)] border border-gray-300 px-2 text-text-secondary hover:bg-gray-50 transition-colors"
                    title="Use preset units"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <select
                  value={form.unit}
                  onChange={(e) => {
                    if (e.target.value === "__custom") {
                      setUseCustomUnit(true);
                    } else {
                      setForm((f) => ({ ...f, unit: e.target.value }));
                    }
                  }}
                  className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none bg-white"
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>
                      {u.charAt(0).toUpperCase() + u.slice(1)}
                    </option>
                  ))}
                  <option value="__custom">Custom...</option>
                </select>
              )}
            </div>
          </div>

          {/* Status (only visible when editing) */}
          {item && (
            <div className="flex items-center gap-3">
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, is_active: e.target.checked }))
                  }
                  className="peer sr-only"
                />
                <div className="h-5 w-9 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-petrol-dark peer-checked:after:translate-x-full" />
              </label>
              <span className="text-sm text-text-primary">Active</span>
            </div>
          )}

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
              {saving ? "Saving..." : item ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
