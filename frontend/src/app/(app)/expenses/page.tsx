"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Wallet,
  Tag,
  Filter,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import EmptyState from "@/components/ui/empty-state";
import type { Expense, ExpenseCategory, ExpenseType } from "@/types";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState<ExpenseType | "">("");
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.set("category_id", filterCategory);
      if (filterType) params.set("expense_type", filterType);
      const qs = params.toString() ? `?${params.toString()}` : "";

      const [exp, cats] = await Promise.all([
        api.get<Expense[]>(`/expenses/${qs}`),
        api.get<ExpenseCategory[]>("/expenses/categories"),
      ]);
      setExpenses(exp);
      setCategories(cats);
    } catch {
      // handle
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const categoryMap = Object.fromEntries(
    categories.map((c) => [c.id, c])
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    await api.delete(`/expenses/${id}`);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    setMenuOpen(null);
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const fixedTotal = expenses
    .filter((e) => e.expense_type === "fixed")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const variableTotal = expenses
    .filter((e) => e.expense_type === "variable")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <p className="text-sm font-medium text-text-secondary">Total</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">
            {formatCurrency(totalExpenses)}
          </p>
        </div>
        <div className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <p className="text-sm font-medium text-text-secondary">Fixed</p>
          <p className="mt-1 text-2xl font-bold text-petrol-dark">
            {formatCurrency(fixedTotal)}
          </p>
        </div>
        <div className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
          <p className="text-sm font-medium text-text-secondary">Variable</p>
          <p className="mt-1 text-2xl font-bold text-coral">
            {formatCurrency(variableTotal)}
          </p>
        </div>
      </div>

      {/* Actions & filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none bg-white"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ExpenseType | "")}
            className="rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none bg-white"
          >
            <option value="">All Types</option>
            <option value="fixed">Fixed</option>
            <option value="variable">Variable</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="inline-flex items-center gap-2 rounded-[var(--radius-button)] border border-gray-300 px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-gray-50 transition-colors"
          >
            <Tag className="h-4 w-4" />
            Categories
          </button>
          <button
            onClick={() => {
              setEditingExpense(null);
              setShowExpenseModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-petrol-dark px-4 py-2.5 text-sm font-semibold text-white hover:bg-petrol-mid transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Expense list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]"
            />
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No expenses yet"
          description="Track your business expenses to get a full financial picture."
          action={
            <button
              onClick={() => setShowExpenseModal(true)}
              className="inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-coral px-4 py-2.5 text-sm font-semibold text-white hover:bg-coral-dark transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add your first expense
            </button>
          }
        />
      ) : (
        <div className="space-y-2">
          {expenses.map((exp) => {
            const cat = exp.category_id ? categoryMap[exp.category_id] : null;
            return (
              <div
                key={exp.id}
                className="group flex items-center gap-4 rounded-[var(--radius-card)] bg-white px-5 py-3.5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]"
              >
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: cat?.colour
                      ? `${cat.colour}20`
                      : "#F0F3F5",
                  }}
                >
                  <Wallet
                    className="h-4 w-4"
                    style={{ color: cat?.colour || "#5C677D" }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {exp.description}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {cat && (
                      <span className="text-xs text-text-secondary">
                        {cat.name}
                      </span>
                    )}
                    <span
                      className={cn(
                        "text-xs px-1.5 py-0.5 rounded-full",
                        exp.expense_type === "fixed"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-orange-50 text-orange-600"
                      )}
                    >
                      {exp.expense_type}
                    </span>
                    {exp.vendor && (
                      <span className="text-xs text-text-secondary">
                        &middot; {exp.vendor}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-text-primary">
                    {formatCurrency(exp.amount, exp.currency)}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {formatDate(exp.expense_date)}
                  </p>
                </div>
                <div className="relative">
                  <button
                    onClick={() =>
                      setMenuOpen(menuOpen === exp.id ? null : exp.id)
                    }
                    className="rounded-lg p-1.5 text-text-secondary opacity-0 hover:bg-surface-light group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {menuOpen === exp.id && (
                    <div className="absolute right-0 top-8 z-10 w-36 rounded-xl bg-white py-1 shadow-[var(--shadow-dropdown)]">
                      <button
                        onClick={() => {
                          setEditingExpense(exp);
                          setShowExpenseModal(true);
                          setMenuOpen(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-light"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <ExpenseModal
          expense={editingExpense}
          categories={categories}
          onClose={() => {
            setShowExpenseModal(false);
            setEditingExpense(null);
          }}
          onSaved={() => {
            setShowExpenseModal(false);
            setEditingExpense(null);
            fetchData();
          }}
        />
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <CategoryModal
          categories={categories}
          onClose={() => setShowCategoryModal(false)}
          onChanged={fetchData}
        />
      )}
    </div>
  );
}

function ExpenseModal({
  expense,
  categories,
  onClose,
  onSaved,
}: {
  expense: Expense | null;
  categories: ExpenseCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    description: expense?.description || "",
    amount: expense?.amount?.toString() || "",
    category_id: expense?.category_id || "",
    expense_type: expense?.expense_type || "variable",
    expense_date:
      expense?.expense_date || new Date().toISOString().split("T")[0],
    vendor: expense?.vendor || "",
    notes: expense?.notes || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...form,
        amount: parseFloat(form.amount),
        category_id: form.category_id || null,
      };
      if (expense) {
        await api.put(`/expenses/${expense.id}`, data);
      } else {
        await api.post("/expenses/", data);
      }
      onSaved();
    } catch {
      // handle
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-dropdown)]">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-text-primary">
            {expense ? "Edit Expense" : "New Expense"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-light">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Description *</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              required
              className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Amount *</label>
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
              <label className="block text-sm font-medium text-text-primary mb-1">Date *</label>
              <input
                type="date"
                value={form.expense_date}
                onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
                required
                className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Category</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none bg-white"
              >
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Type</label>
              <select
                value={form.expense_type}
                onChange={(e) => setForm((f) => ({ ...f, expense_type: e.target.value as ExpenseType }))}
                className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none bg-white"
              >
                <option value="variable">Variable</option>
                <option value="fixed">Fixed</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Vendor</label>
            <input
              type="text"
              value={form.vendor}
              onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
              className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-[var(--radius-button)] border border-gray-300 px-4 py-2 text-sm font-medium text-text-primary hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-[var(--radius-button)] bg-petrol-dark px-4 py-2 text-sm font-semibold text-white hover:bg-petrol-mid disabled:opacity-50 transition-colors">
              {saving ? "Saving..." : expense ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CategoryModal({
  categories,
  onClose,
  onChanged,
}: {
  categories: ExpenseCategory[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [colour, setColour] = useState("#0F4C5C");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post("/expenses/categories", { name, colour });
    setName("");
    onChanged();
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/expenses/categories/${id}`);
    onChanged();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-dropdown)]">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-text-primary">
            Expense Categories
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-light">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
          <form onSubmit={handleAdd} className="flex gap-2 mb-4">
            <input
              type="color"
              value={colour}
              onChange={(e) => setColour(e.target.value)}
              className="h-9 w-9 cursor-pointer rounded-lg border border-gray-300 p-0.5"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Category name"
              className="flex-1 rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-[var(--radius-button)] bg-petrol-dark px-3 py-2 text-sm font-semibold text-white hover:bg-petrol-mid transition-colors"
            >
              Add
            </button>
          </form>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: cat.colour || "#0F4C5C" }}
                  />
                  <span className="text-sm text-text-primary">{cat.name}</span>
                </div>
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="text-text-secondary hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-sm text-text-secondary text-center py-4">
                No categories yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
