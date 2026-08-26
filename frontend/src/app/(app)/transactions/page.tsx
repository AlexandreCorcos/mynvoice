"use client";

/* =========================================================================
   Transactions.

   One running ledger of money in and money out. Income and expense share a
   table (server-side it's still "expenses"), split by `kind`. The screen
   opens with the shape of the month — in, out, and the net between them —
   then the running list underneath.

   Category colours are user-chosen and stored, so this is the one screen
   where the palette isn't ours to control. It's confined to small dots and
   a proportion bar; the surrounding UI stays on tokens.
   ========================================================================= */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
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
import { cn, formatCurrency, formatDate, num } from "@/lib/utils";
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
import type {
  Expense,
  ExpenseCategory,
  ExpenseType,
  TransactionKind,
} from "@/types";

type KindFilter = "all" | TransactionKind;

const FALLBACK_COLOUR = "var(--ink-muted)";

/* ------------------------------------------------------------------ */
/* Transaction form                                                    */
/* ------------------------------------------------------------------ */

function TransactionForm({
  open,
  tx,
  initialKind,
  categories,
  currency,
  onClose,
  onSaved,
}: {
  open: boolean;
  tx: Expense | null;
  initialKind: TransactionKind;
  categories: ExpenseCategory[];
  currency: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [kind, setKind] = useState<TransactionKind>(initialKind);
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

  /* Editing locks the kind to what was saved; creating starts from whichever
     button was pressed and can be flipped with the toggle. */
  const isEdit = Boolean(tx);
  const isIncome = kind === "income";

  useEffect(() => {
    if (!open) return;
    setKind(tx?.kind ?? initialKind);
    setForm({
      description: tx?.description ?? "",
      amount: tx ? String(tx.amount) : "",
      category_id: tx?.category_id ?? "",
      expense_type: tx?.expense_type ?? "variable",
      expense_date: tx?.expense_date ?? new Date().toISOString().split("T")[0],
      vendor: tx?.vendor ?? "",
      notes: tx?.notes ?? "",
    });
    setError("");
  }, [open, tx, initialKind]);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  /* Only this kind's categories belong in the picker. */
  const pickable = useMemo(
    () => categories.filter((c) => c.kind === kind),
    [categories, kind]
  );

  const pickKind = (next: TransactionKind) => {
    if (next === kind) return;
    setKind(next);
    setForm((f) => ({ ...f, category_id: "" })); // categories don't cross kinds
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        kind,
        description: form.description,
        amount: parseFloat(form.amount) || 0,
        expense_date: form.expense_date,
        category_id: form.category_id || null,
        expense_type: isIncome ? "variable" : form.expense_type,
        vendor: form.vendor || null,
        notes: form.notes || null,
      };
      if (tx) await api.put(`/expenses/${tx.id}`, payload);
      else await api.post("/expenses/", payload);
      onSaved();
    } catch {
      setError("Couldn't save this. Check the amount and date.");
    } finally {
      setSaving(false);
    }
  };

  const noun = isIncome ? "income" : "expense";

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={tx ? `Edit ${noun}` : `New ${noun}`}
      description={
        isIncome
          ? "Money received that isn't already tracked by an invoice."
          : "Fixed costs repeat every month; variable ones are one-offs."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="tx-form" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? "Saving…" : tx ? "Save changes" : `Add ${noun}`}
          </Button>
        </>
      }
    >
      <form id="tx-form" onSubmit={submit} className="space-y-3.5">
        {error ? (
          <p className="rounded-[10px] bg-negative/10 px-3.5 py-2.5 text-[12.5px] font-medium text-negative ring-1 ring-negative/20">
            {error}
          </p>
        ) : null}

        {/* kind toggle — only when creating; editing keeps the saved kind */}
        {isEdit ? (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
              isIncome
                ? "bg-positive/10 text-positive ring-positive/20"
                : "bg-elevated text-ink-muted ring-line"
            )}
          >
            {isIncome ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownLeft className="h-3 w-3" />
            )}
            {isIncome ? "Income" : "Expense"}
          </span>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {(["expense", "income"] as const).map((k) => {
              const active = kind === k;
              const income = k === "income";
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => pickKind(k)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-[10px] py-2 text-[13px] font-semibold ring-1 transition-colors",
                    active
                      ? income
                        ? "bg-positive/10 text-positive ring-positive/25"
                        : "bg-brass/[0.1] text-brass-ink ring-brass/25"
                      : "text-ink-muted ring-line hover:bg-elevated"
                  )}
                >
                  {income ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownLeft className="h-3.5 w-3.5" />
                  )}
                  {income ? "Income" : "Expense"}
                </button>
              );
            })}
          </div>
        )}

        <Field label="Description" required>
          <Input
            required
            autoFocus
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder={isIncome ? "Coaching session" : "Figma — team plan"}
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
              {pickable.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          {isIncome ? null : (
            <Field label="Type">
              <Select
                value={form.expense_type}
                onChange={(e) => set({ expense_type: e.target.value as ExpenseType })}
              >
                <option value="variable">Variable — one-off</option>
                <option value="fixed">Fixed — every month</option>
              </Select>
            </Field>
          )}
        </div>

        <Field label={isIncome ? "Received from" : "Vendor"}>
          <Input
            value={form.vendor}
            onChange={(e) => set({ vendor: e.target.value })}
            placeholder={isIncome ? "Who paid you" : "Who you paid"}
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
  const [kind, setKind] = useState<TransactionKind>("expense");
  const [name, setName] = useState("");
  const [colour, setColour] = useState(SWATCHES[0]);
  const [busy, setBusy] = useState(false);

  const shown = useMemo(
    () => categories.filter((c) => c.kind === kind),
    [categories, kind]
  );

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.post("/expenses/categories", { name: name.trim(), kind, colour });
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
      description="Your own buckets — income and expense keep separate lists."
    >
      <div className="mb-4">
        <SegmentedControl<TransactionKind>
          layoutId="category-kind"
          value={kind}
          onChange={setKind}
          options={[
            { value: "expense", label: "Expense" },
            { value: "income", label: "Income" },
          ]}
        />
      </div>

      <form onSubmit={add} className="flex flex-wrap items-end gap-2">
        <Field label={`New ${kind} category`} className="min-w-[180px] flex-1">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={kind === "income" ? "Consulting" : "Software"}
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
        {shown.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-ink-muted">
            No {kind} categories yet.
          </p>
        ) : (
          shown.map((c) => (
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

export default function TransactionsPage() {
  const { user } = useAuth();
  const currency = user?.currency || "GBP";

  const [rows, setRows] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formKind, setFormKind] = useState<TransactionKind>("expense");
  const [catsOpen, setCatsOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [tx, cats] = await Promise.all([
        api.get<Expense[]>("/expenses/"),
        api.get<ExpenseCategory[]>("/expenses/categories"),
      ]);
      setRows(tx);
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
    return rows.filter((e) => {
      if (kindFilter !== "all" && e.kind !== kindFilter) return false;
      if (categoryFilter && e.category_id !== categoryFilter) return false;
      if (!q) return true;
      return (
        e.description.toLowerCase().includes(q) ||
        (e.vendor ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, kindFilter, categoryFilter, search]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      income: rows.filter((e) => e.kind === "income").length,
      expense: rows.filter((e) => e.kind === "expense").length,
    }),
    [rows]
  );

  /* This month: money in, money out, and the net between them. */
  const summary = useMemo(() => {
    const now = new Date();
    const thisMonth = rows.filter((e) => {
      const d = new Date(e.expense_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const sum = (list: Expense[]) => list.reduce((s, e) => s + num(e.amount), 0);
    const income = sum(thisMonth.filter((e) => e.kind === "income"));
    const expense = sum(thisMonth.filter((e) => e.kind === "expense"));
    return { income, expense, net: income - expense, count: thisMonth.length };
  }, [rows]);

  /* Where the money goes — expenses only, biggest first. */
  const breakdown = useMemo(() => {
    const totals = new Map<string, { label: string; colour: string; amount: number }>();
    for (const e of rows) {
      if (e.kind !== "expense") continue;
      const cat = categoryOf(e.category_id);
      const key = cat?.id ?? "none";
      const entry = totals.get(key) ?? {
        label: cat?.name ?? "Uncategorised",
        colour: cat?.colour ?? FALLBACK_COLOUR,
        amount: 0,
      };
      entry.amount += num(e.amount);
      totals.set(key, entry);
    }
    const list = [...totals.values()].sort((a, b) => b.amount - a.amount);
    const total = list.reduce((s, r) => s + r.amount, 0);
    return { rows: list, total };
  }, [rows, categoryOf]);

  const remove = async () => {
    if (!deleting) return;
    await api.delete(`/expenses/${deleting.id}`);
    setRows((prev) => prev.filter((e) => e.id !== deleting.id));
    setDeleting(null);
  };

  const openNew = (kind: TransactionKind) => {
    setEditing(null);
    setFormKind(kind);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Transactions"
        title="Every pound in and out."
        subtitle="Income and expenses in one running ledger, in your own categories."
        actions={
          <>
            <Button variant="secondary" onClick={() => setCatsOpen(true)}>
              <Tag className="h-4 w-4" />
              Categories
            </Button>
            <Button variant="secondary" onClick={() => openNew("income")}>
              <ArrowUpRight className="h-4 w-4 text-positive" />
              Income
            </Button>
            <Button variant="primary" onClick={() => openNew("expense")}>
              <Plus className="h-4 w-4" />
              Expense
            </Button>
          </>
        }
      />

      {/* ── the shape of it ──────────────────────────────────────── */}
      {!loading && rows.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
          <Panel>
            <PanelHeader title="This month" caption={`${summary.count} recorded`} />
            <p
              className={cn(
                "mt-4 text-[30px] font-extrabold leading-none tracking-[-0.025em] tabular-nums",
                summary.net >= 0 ? "text-positive" : "text-negative"
              )}
            >
              <CountUp
                to={summary.net}
                format={(n) => `${n >= 0 ? "+" : "−"}${formatCurrency(Math.abs(n), currency)}`}
                duration={1.2}
              />
            </p>
            <p className="mt-1.5 text-[12px] text-ink-muted">net this month</p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[12px] bg-elevated/60 p-3.5">
                <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-ink-muted">
                  <ArrowUpRight className="h-3.5 w-3.5 text-positive" />
                  Income
                </span>
                <p className="mt-1 text-[17px] font-bold tabular-nums text-ink">
                  {formatCurrency(summary.income, currency)}
                </p>
              </div>
              <div className="rounded-[12px] bg-elevated/60 p-3.5">
                <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-ink-muted">
                  <ArrowDownLeft className="h-3.5 w-3.5 text-ink-muted" />
                  Expense
                </span>
                <p className="mt-1 text-[17px] font-bold tabular-nums text-ink">
                  {formatCurrency(summary.expense, currency)}
                </p>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Where it goes" caption="Expenses, biggest first" />

            {breakdown.rows.length === 0 ? (
              <p className="mt-6 text-center text-[13px] text-ink-muted">
                No expenses recorded yet.
              </p>
            ) : (
              <>
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
              </>
            )}
          </Panel>
        </div>
      ) : null}

      {/* ── filters ──────────────────────────────────────────────── */}
      {rows.length > 0 ? (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl<KindFilter>
              layoutId="tx-kind"
              value={kindFilter}
              onChange={setKindFilter}
              options={[
                { value: "all", label: "All", count: counts.all },
                { value: "income", label: "Income", count: counts.income },
                { value: "expense", label: "Expense", count: counts.expense },
              ]}
            />
            {categories.length > 0 ? (
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
            placeholder="Search description or name…"
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
          title={rows.length === 0 ? "No transactions yet" : "Nothing matches that"}
          description={
            rows.length === 0
              ? "Record money in and out and the dashboard tells you the whole story, not half of it."
              : "Try a different search, category or type."
          }
          action={
            rows.length === 0 ? (
              <Button variant="primary" onClick={() => openNew("expense")}>
                <Plus className="h-4 w-4" />
                Record your first transaction
              </Button>
            ) : undefined
          }
        />
      ) : (
        <motion.div layout className="space-y-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((e, i) => {
              const cat = categoryOf(e.category_id);
              const income = e.kind === "income";
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
                      {income ? (
                        <span className="inline-flex flex-none items-center gap-1 rounded-full bg-positive/10 px-2 py-0.5 text-[10.5px] font-semibold text-positive ring-1 ring-positive/20">
                          <ArrowUpRight className="h-2.5 w-2.5" />
                          Income
                        </span>
                      ) : (
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
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-[12.5px] text-ink-muted">
                      {cat?.name ?? "Uncategorised"}
                      {e.vendor ? ` · ${e.vendor}` : ""}
                    </span>
                  </span>

                  <span className="hidden w-24 flex-none text-[12.5px] text-ink-muted sm:block">
                    {formatDate(e.expense_date)}
                  </span>

                  <span
                    className={cn(
                      "w-28 flex-none text-right text-[14.5px] font-bold tabular-nums",
                      income ? "text-positive" : "text-ink"
                    )}
                  >
                    {income ? "+" : ""}
                    {formatCurrency(num(e.amount), e.currency || currency)}
                  </span>

                  <RowMenu
                    label={`Actions for ${e.description}`}
                    items={[
                      {
                        label: "Edit",
                        icon: Pencil,
                        onSelect: () => {
                          setEditing(e);
                          setFormKind(e.kind);
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

      <TransactionForm
        open={formOpen}
        tx={editing}
        initialKind={formKind}
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
        title="Delete this transaction?"
        description={deleting?.description}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={remove}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </>
        }
      />
    </div>
  );
}
