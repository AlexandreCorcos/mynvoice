"use client";

/* =========================================================================
   Expenses.

   Opens with the shape of the money going out — this month's total, fixed
   vs variable, and where it went — because a flat list of forty rows
   answers none of those.

   Category colours are user-chosen and stored, so this is the one screen
   where the palette isn't ours to control. It's confined to small dots and
   a proportion bar; the surrounding UI stays on tokens.
   ========================================================================= */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Loader2,
  Pencil,
  Plus,
  Repeat,
  Shuffle,
  Tag,
  Trash2,
  Wallet,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { CountUp, EASE_OUT } from "@/components/motion";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/app/button";
import { Panel, PanelHeader } from "@/components/app/panel";
import { Field, Input, SearchInput, Select, Textarea } from "@/components/app/form";
import { SegmentedControl } from "@/components/app/segmented-control";
import { Modal } from "@/components/app/modal";
import { RowMenu } from "@/components/app/menu";
import EmptyState from "@/components/ui/empty-state";
import type { Expense, ExpenseCategory, ExpenseType } from "@/types";

type TypeFilter = "all" | ExpenseType;

const FALLBACK_COLOUR = "var(--ink-muted)";

/* ------------------------------------------------------------------ */
/* Expense form                                                        */
/* ------------------------------------------------------------------ */

function ExpenseForm({
  open,
  expense,
  categories,
  currency,
  onClose,
  onSaved,
}: {
  open: boolean;
  expense: Expense | null;
  categories: ExpenseCategory[];
  currency: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    description: "",
    amount: "",
    category_id: "",
    expense_type: "variable" as ExpenseType,
    expense_date: new Date().toISOString().split("T")[0],
    vendor: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm({
      description: expense?.description ?? "",
      amount: expense ? String(expense.amount) : "",
      category_id: expense?.category_id ?? "",
      expense_type: expense?.expense_type ?? "variable",
      expense_date: expense?.expense_date ?? new Date().toISOString().split("T")[0],
      vendor: expense?.vendor ?? "",
      notes: expense?.notes ?? "",
    });
    setError("");
  }, [open, expense]);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount) || 0,
        category_id: form.category_id || null,
        vendor: form.vendor || null,
        notes: form.notes || null,
      };
      if (expense) await api.put(`/expenses/${expense.id}`, payload);
      else await api.post("/expenses/", payload);
      onSaved();
    } catch {
      setError("Couldn't save this expense. Check the amount and date.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={expense ? "Edit expense" : "New expense"}
      description="Fixed costs repeat every month; variable ones are one-offs."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="expense-form" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? "Saving…" : expense ? "Save changes" : "Add expense"}
          </Button>
        </>
      }
    >
      <form id="expense-form" onSubmit={submit} className="space-y-3.5">
        {error ? (
          <p className="rounded-[10px] bg-negative/10 px-3.5 py-2.5 text-[12.5px] font-medium text-negative ring-1 ring-negative/20">
            {error}
          </p>
        ) : null}

        <Field label="Description" required>
          <Input
            required
            autoFocus
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="Figma — team plan"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={`Amount (${currency})`} required>
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
          <Field label="Date" required>
            <Input
              type="date"
              required
              value={form.expense_date}
              onChange={(e) => set({ expense_date: e.target.value })}
            />
          </Field>
          <Field label="Category">
            <Select
              value={form.category_id}
              onChange={(e) => set({ category_id: e.target.value })}
            >
              <option value="">Uncategorised</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Type">
            <Select
              value={form.expense_type}
              onChange={(e) => set({ expense_type: e.target.value as ExpenseType })}
            >
              <option value="variable">Variable — one-off</option>
              <option value="fixed">Fixed — every month</option>
            </Select>
          </Field>
        </div>

        <Field label="Vendor">
          <Input
            value={form.vendor}
            onChange={(e) => set({ vendor: e.target.value })}
            placeholder="Who you paid"
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
/* Categories                                                          */
/* ------------------------------------------------------------------ */

const SWATCHES = ["#8A6A3D", "#3F6B4A", "#B4332E", "#6E6862", "#A98A5C", "#4A5A6B"];

function CategoryManager({
  open,
  categories,
  onClose,
  onChanged,
}: {
  open: boolean;
  categories: ExpenseCategory[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [colour, setColour] = useState(SWATCHES[0]);
  const [busy, setBusy] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.post("/expenses/categories", { name: name.trim(), colour });
      setName("");
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await api.delete(`/expenses/categories/${id}`);
    onChanged();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Categories"
      description="Your own buckets — expenses keep working without one."
    >
      <form onSubmit={add} className="flex flex-wrap items-end gap-2">
        <Field label="New category" className="min-w-[180px] flex-1">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Software"
          />
        </Field>
        <div className="flex items-center gap-1.5 pb-0.5">
          {SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Use colour ${c}`}
              aria-pressed={colour === c}
              onClick={() => setColour(c)}
              style={{ background: c }}
              className={cn(
                "h-7 w-7 rounded-full ring-offset-2 ring-offset-[var(--card)] transition-all",
                colour === c ? "ring-2 ring-ink" : "ring-1 ring-line"
              )}
            />
          ))}
        </div>
        <Button type="submit" variant="primary" disabled={busy || !name.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add
        </Button>
      </form>

      <div className="mt-5 space-y-1.5">
        {categories.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-ink-muted">No categories yet.</p>
        ) : (
          categories.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 ring-1 ring-line"
            >
              <span
                className="h-3 w-3 flex-none rounded-full"
                style={{ background: c.colour ?? FALLBACK_COLOUR }}
              />
              <span className="flex-1 truncate text-[13.5px] font-medium text-ink">
                {c.name}
              </span>
              <button
                onClick={() => remove(c.id)}
                aria-label={`Delete ${c.name}`}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-negative/10 hover:text-negative"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function ExpensesPage() {
  const { user } = useAuth();
  const currency = user?.currency || "GBP";

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [exp, cats] = await Promise.all([
        api.get<Expense[]>("/expenses/"),
        api.get<ExpenseCategory[]>("/expenses/categories"),
      ]);
      setExpenses(exp);
      setCategories(cats);
    } catch {
      /* empty state covers it */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const categoryOf = useCallback(
    (id: string | null) => (id ? categories.find((c) => c.id === id) : undefined),
    [categories]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((e) => {
      if (typeFilter !== "all" && e.expense_type !== typeFilter) return false;
      if (categoryFilter && e.category_id !== categoryFilter) return false;
      if (!q) return true;
      return (
        e.description.toLowerCase().includes(q) ||
        (e.vendor ?? "").toLowerCase().includes(q)
      );
    });
  }, [expenses, typeFilter, categoryFilter, search]);

  const counts = useMemo(
    () => ({
      all: expenses.length,
      fixed: expenses.filter((e) => e.expense_type === "fixed").length,
      variable: expenses.filter((e) => e.expense_type === "variable").length,
    }),
    [expenses]
  );

  /* This month, and the split that actually tells you something. */
  const summary = useMemo(() => {
    const now = new Date();
    const thisMonth = expenses.filter((e) => {
      const d = new Date(e.expense_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const sum = (list: Expense[]) => list.reduce((s, e) => s + e.amount, 0);
    return {
      month: sum(thisMonth),
      fixed: sum(thisMonth.filter((e) => e.expense_type === "fixed")),
      variable: sum(thisMonth.filter((e) => e.expense_type === "variable")),
      count: thisMonth.length,
    };
  }, [expenses]);

  /* Where the money went, biggest first. Uncategorised is a real bucket. */
  const breakdown = useMemo(() => {
    const totals = new Map<string, { label: string; colour: string; amount: number }>();
    for (const e of expenses) {
      const cat = categoryOf(e.category_id);
      const key = cat?.id ?? "none";
      const entry = totals.get(key) ?? {
        label: cat?.name ?? "Uncategorised",
        colour: cat?.colour ?? FALLBACK_COLOUR,
        amount: 0,
      };
      entry.amount += e.amount;
      totals.set(key, entry);
    }
    const rows = [...totals.values()].sort((a, b) => b.amount - a.amount);
    const total = rows.reduce((s, r) => s + r.amount, 0);
    return { rows, total };
  }, [expenses, categoryOf]);

  const remove = async () => {
    if (!deleting) return;
    await api.delete(`/expenses/${deleting.id}`);
    setExpenses((prev) => prev.filter((e) => e.id !== deleting.id));
    setDeleting(null);
  };

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Expenses"
        title="What the business costs to run."
        subtitle="Fixed and variable costs in your own categories, tracked month by month."
        actions={
          <>
            <Button variant="secondary" onClick={() => setCatsOpen(true)}>
              <Tag className="h-4 w-4" />
              Categories
            </Button>
            <Button variant="primary" onClick={openNew}>
              <Plus className="h-4 w-4" />
              New expense
            </Button>
          </>
        }
      />

      {/* ── the shape of it ──────────────────────────────────────── */}
      {!loading && expenses.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
          <Panel>
            <PanelHeader title="This month" caption={`${summary.count} recorded`} />
            <p className="mt-4 text-[30px] font-extrabold leading-none tracking-[-0.025em] tabular-nums text-ink">
              <CountUp
                to={summary.month}
                format={(n) => formatCurrency(n, currency)}
                duration={1.2}
              />
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                { label: "Fixed", value: summary.fixed, icon: Repeat },
                { label: "Variable", value: summary.variable, icon: Shuffle },
              ].map((s) => (
                <div key={s.label} className="rounded-[12px] bg-elevated/60 p-3.5">
                  <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-ink-muted">
                    <s.icon className="h-3.5 w-3.5" />
                    {s.label}
                  </span>
                  <p className="mt-1 text-[17px] font-bold tabular-nums text-ink">
                    {formatCurrency(s.value, currency)}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Where it goes" caption="All time, biggest first" />

            <div className="mt-4 flex h-3 w-full gap-[3px] overflow-hidden rounded-full bg-elevated">
              {breakdown.rows.map((r, i) => (
                <motion.span
                  key={r.label}
                  initial={{ width: 0 }}
                  animate={{
                    width: `${breakdown.total ? (r.amount / breakdown.total) * 100 : 0}%`,
                  }}
                  transition={{ duration: 0.8, delay: 0.1 + i * 0.06, ease: EASE_OUT }}
                  style={{ background: r.colour }}
                  className="h-full min-w-[4px] rounded-full"
                  title={`${r.label}: ${formatCurrency(r.amount, currency)}`}
                />
              ))}
            </div>

            <ul className="mt-4 space-y-2">
              {breakdown.rows.slice(0, 5).map((r) => (
                <li key={r.label} className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 flex-none rounded-[3px]"
                    style={{ background: r.colour }}
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
                    {r.label}
                  </span>
                  <span className="flex-none text-[11.5px] tabular-nums text-ink-muted">
                    {breakdown.total ? Math.round((r.amount / breakdown.total) * 100) : 0}%
                  </span>
                  <span className="w-24 flex-none text-right text-[13px] font-bold tabular-nums text-ink">
                    {formatCurrency(r.amount, currency)}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      ) : null}

      {/* ── filters ──────────────────────────────────────────────── */}
      {expenses.length > 0 ? (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl<TypeFilter>
              layoutId="expense-type"
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: "all", label: "All", count: counts.all },
                { value: "fixed", label: "Fixed", count: counts.fixed },
                { value: "variable", label: "Variable", count: counts.variable },
              ]}
            />
            {categories.length > 0 ? (
              /* Width lives on the wrapper — the control itself is w-full, and
                 a `w-auto` override loses the specificity race. */
              <div className="w-[180px]">
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
          </div>
          <SearchInput
            placeholder="Search description or vendor…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="lg:w-64"
          />
        </div>
      ) : null}

      {/* ── the list ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[62px] animate-pulse rounded-[14px] bg-elevated" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={expenses.length === 0 ? "No expenses yet" : "Nothing matches that"}
          description={
            expenses.length === 0
              ? "Record what the business costs to run and the dashboard starts telling you the whole story, not half of it."
              : "Try a different search, category or type."
          }
          action={
            expenses.length === 0 ? (
              <Button variant="primary" onClick={openNew}>
                <Plus className="h-4 w-4" />
                Record your first expense
              </Button>
            ) : undefined
          }
        />
      ) : (
        <motion.div layout className="space-y-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((e, i) => {
              const cat = categoryOf(e.category_id);
              return (
                <motion.div
                  key={e.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.99, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.4, delay: Math.min(i, 8) * 0.03, ease: EASE_OUT }}
                  className="flex items-center gap-4 rounded-[14px] bg-card px-4 py-3 ring-1 ring-line transition-shadow duration-200 hover:shadow-[var(--shadow-card)]"
                >
                  <span
                    className="h-9 w-1 flex-none rounded-full"
                    style={{ background: cat?.colour ?? FALLBACK_COLOUR }}
                  />

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="truncate text-[14px] font-bold tracking-[-0.01em] text-ink">
                        {e.description}
                      </span>
                      <span
                        className={cn(
                          "inline-flex flex-none items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1",
                          e.expense_type === "fixed"
                            ? "bg-brass/[0.08] text-brass-ink ring-brass/15"
                            : "bg-elevated text-ink-muted ring-line"
                        )}
                      >
                        {e.expense_type === "fixed" ? (
                          <Repeat className="h-2.5 w-2.5" />
                        ) : (
                          <Shuffle className="h-2.5 w-2.5" />
                        )}
                        {e.expense_type === "fixed" ? "Fixed" : "Variable"}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-[12.5px] text-ink-muted">
                      {cat?.name ?? "Uncategorised"}
                      {e.vendor ? ` · ${e.vendor}` : ""}
                    </span>
                  </span>

                  <span className="hidden w-24 flex-none text-[12.5px] text-ink-muted sm:block">
                    {formatDate(e.expense_date)}
                  </span>

                  <span className="w-24 flex-none text-right text-[14.5px] font-bold tabular-nums text-ink">
                    {formatCurrency(e.amount, e.currency || currency)}
                  </span>

                  <RowMenu
                    label={`Actions for ${e.description}`}
                    items={[
                      {
                        label: "Edit",
                        icon: Pencil,
                        onSelect: () => {
                          setEditing(e);
                          setFormOpen(true);
                        },
                      },
                      {
                        label: "Delete",
                        icon: Trash2,
                        tone: "danger",
                        onSelect: () => setDeleting(e),
                      },
                    ]}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      <ExpenseForm
        open={formOpen}
        expense={editing}
        categories={categories}
        currency={currency}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          fetchAll();
        }}
      />

      <CategoryManager
        open={catsOpen}
        categories={categories}
        onClose={() => setCatsOpen(false)}
        onChanged={fetchAll}
      />

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete this expense?"
        description={deleting?.description}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={remove}>
              <Trash2 className="h-4 w-4" />
              Delete expense
            </Button>
          </>
        }
      />
    </div>
  );
}
