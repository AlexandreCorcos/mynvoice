"use client";

/* =========================================================================
   InvoiceEditor — shared by /invoices/new and /invoices/[id]/edit.

   The two screens were near-identical copies before; they're now one
   component with different initial values and a different submit.

   Three things carry this screen:

     · line items reorder by dragging a handle, with a real spring — the
       row lifts, the others part, it lands. Handle-only dragging, because
       drag-anywhere fights every text input in the row.
     · the summary rail is sticky and its total counts to the new figure
       on every keystroke, so the consequence of what you type is always
       on screen.
     · nothing blocks: totals, tax and discount recalculate locally.
   ========================================================================= */

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AnimatePresence,
  Reorder,
  motion,
  useDragControls,
} from "framer-motion";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  GripVertical,
  Loader2,
  Package,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { currencySymbol, formatCurrency } from "@/lib/utils";
import { CountUp, EASE_OUT } from "@/components/motion";
import { Panel, PanelHeader } from "./panel";
import { PageHeader } from "./page-header";
import { Button } from "./button";
import { Field, Input, Select, Textarea } from "./form";
import { Modal } from "./modal";
import type { Client, Item } from "@/types";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type LineItem = {
  id: string;
  description: string;
  quantity: string;
  unit_price: string;
  unit: string;
};

export type InvoiceForm = {
  client_id: string;
  issue_date: string;
  due_date: string;
  tax_rate: string;
  discount_amount: string;
  currency: string;
  notes: string;
  terms: string;
  pdf_template: string;
};

export type InvoicePayload = {
  client_id: string | null;
  issue_date: string;
  due_date: string;
  tax_rate: number;
  discount_amount: number;
  currency: string;
  notes: string | null;
  terms: string | null;
  pdf_template: string;
  items: {
    description: string;
    quantity: number;
    unit_price: number;
    unit: string | null;
    sort_order: number;
  }[];
};

let seq = 1;
export function blankLine(): LineItem {
  return { id: `line-${seq++}`, description: "", quantity: "1", unit_price: "", unit: "" };
}

const TEMPLATES = [
  { id: "classic", title: "Classic", desc: "Graphite header, banded rows" },
  { id: "minimal", title: "Minimal", desc: "Hairlines and white space" },
  { id: "bold", title: "Bold", desc: "Full header, accent blocks" },
] as const;

/* ------------------------------------------------------------------ */
/* Template preview                                                    */
/* ------------------------------------------------------------------ */

function TemplatePreview({ id }: { id: string }) {
  if (id === "minimal") {
    return (
      <>
        <span className="flex items-center justify-between">
          <span className="block h-1.5 w-1/3 rounded bg-ink/70" />
          <span className="block h-1.5 w-1/5 rounded bg-line" />
        </span>
        <span className="mt-1 block h-px w-full bg-ink/60" />
        <span className="mt-1.5 block h-1.5 w-2/3 rounded bg-line" />
        <span className="mt-1 block h-1.5 w-1/2 rounded bg-line" />
      </>
    );
  }
  if (id === "bold") {
    return (
      <>
        <span className="flex h-4 w-full items-center rounded bg-brass px-1.5">
          <span className="block h-1 w-1/3 rounded bg-white/70" />
        </span>
        <span className="mt-1.5 block h-1.5 w-3/4 rounded bg-line" />
        <span className="mt-1 block h-1.5 w-1/2 rounded bg-line" />
      </>
    );
  }
  return (
    <>
      <span className="block h-2 w-full rounded bg-graphite" />
      <span className="mt-1.5 block h-1.5 w-3/4 rounded bg-line" />
      <span className="mt-1 block h-1.5 w-1/2 rounded bg-elevated" />
      <span className="mt-1 block h-1.5 w-2/3 rounded bg-line" />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* One draggable line                                                  */
/* ------------------------------------------------------------------ */

function LineRow({
  item,
  currency,
  canRemove,
  onChange,
  onRemove,
}: {
  item: LineItem;
  currency: string;
  canRemove: boolean;
  onChange: (patch: Partial<LineItem>) => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  const [dragging, setDragging] = useState(false);

  const amount =
    (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);

  const handle = (
    <button
      type="button"
      aria-label="Drag to reorder"
      onPointerDown={(e) => {
        e.preventDefault();
        controls.start(e);
      }}
      className="flex h-9 w-7 flex-none cursor-grab touch-none items-center justify-center rounded-md text-ink-muted/50 transition-colors hover:bg-elevated hover:text-brass-ink active:cursor-grabbing"
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );

  const remove = (
    <button
      type="button"
      onClick={onRemove}
      disabled={!canRemove}
      aria-label="Remove line"
      className="flex h-9 w-9 flex-none items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-negative/10 hover:text-negative disabled:pointer-events-none disabled:opacity-30"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );

  return (
    <Reorder.Item
      value={item}
      /* Handle-only dragging: dragging from anywhere would hijack every
         text selection inside the row. */
      dragListener={false}
      dragControls={controls}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => setDragging(false)}
      style={{ position: "relative" }}
      animate={{
        scale: dragging ? 1.01 : 1,
        boxShadow: dragging
          ? "0 22px 40px -20px rgba(28,25,23,0.45)"
          : "0 0 0 0 rgba(28,25,23,0)",
      }}
      transition={{ duration: 0.2 }}
      className="rounded-[12px] bg-card ring-1 ring-line"
    >
      {/* Two explicit layouts rather than one clever responsive grid — mixing
          `col-start` overrides across breakpoints put fields on the wrong
          row, and this is far easier to keep honest. */}

      {/* desktop */}
      <div className="hidden grid-cols-[28px_1fr_84px_112px_104px_36px] items-center gap-2 p-2.5 sm:grid">
        {handle}
        <Input
          placeholder="What are you charging for?"
          value={item.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className="h-9"
        />
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="1"
          value={item.quantity}
          onChange={(e) => onChange({ quantity: e.target.value })}
          className="h-9 tabular-nums"
        />
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={item.unit_price}
          onChange={(e) => onChange({ unit_price: e.target.value })}
          className="h-9 tabular-nums"
        />
        <span className="flex h-9 items-center justify-end text-[13px] font-bold tabular-nums text-ink">
          {formatCurrency(amount, currency)}
        </span>
        {remove}
      </div>

      {/* mobile */}
      <div className="space-y-2 p-3 sm:hidden">
        <div className="flex items-center gap-2">
          {handle}
          <Input
            placeholder="What are you charging for?"
            value={item.description}
            onChange={(e) => onChange({ description: e.target.value })}
            className="h-9 flex-1"
          />
          {remove}
        </div>
        <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 pl-9">
          <label className="block">
            <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              Qty
            </span>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="1"
              value={item.quantity}
              onChange={(e) => onChange({ quantity: e.target.value })}
              className="h-9 tabular-nums"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              Unit price
            </span>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={item.unit_price}
              onChange={(e) => onChange({ unit_price: e.target.value })}
              className="h-9 tabular-nums"
            />
          </label>
          <span className="flex h-9 items-center justify-end text-[13px] font-bold tabular-nums text-ink">
            {formatCurrency(amount, currency)}
          </span>
        </div>
      </div>
    </Reorder.Item>
  );
}

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */

export function InvoiceEditor({
  mode,
  invoiceNumber,
  initialForm,
  initialItems,
  clients,
  catalog,
  onSubmit,
}: {
  mode: "create" | "edit";
  invoiceNumber?: string;
  initialForm: InvoiceForm;
  initialItems: LineItem[];
  clients: Client[];
  catalog: Item[];
  onSubmit: (payload: InvoicePayload) => Promise<void>;
}) {
  const router = useRouter();
  const [form, setForm] = useState<InvoiceForm>(initialForm);
  const [items, setItems] = useState<LineItem[]>(initialItems);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState("");

  const set = (patch: Partial<InvoiceForm>) => setForm((f) => ({ ...f, ...patch }));

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, i) =>
          sum + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0),
        0
      ),
    [items]
  );
  const taxRate = parseFloat(form.tax_rate) || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const discount = parseFloat(form.discount_amount) || 0;
  const total = subtotal + taxAmount - discount;

  const filteredCatalog = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q)
    );
  }, [catalog, catalogQuery]);

  const addFromCatalog = (ci: Item) => {
    setItems((prev) => [
      ...prev,
      {
        id: `line-${seq++}`,
        description: ci.description ? `${ci.name} — ${ci.description}` : ci.name,
        quantity: "1",
        unit_price: String(ci.unit_price),
        unit: ci.unit ?? "",
      },
    ]);
    setCatalogOpen(false);
    setCatalogQuery("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const usable = items.filter((i) => i.description && i.unit_price);
    if (usable.length === 0) {
      setError("Add at least one line item with a description and a price.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSubmit({
        client_id: form.client_id || null,
        issue_date: form.issue_date,
        due_date: form.due_date,
        tax_rate: taxRate,
        discount_amount: discount,
        currency: form.currency,
        notes: form.notes || null,
        terms: form.terms || null,
        pdf_template: form.pdf_template,
        items: usable.map((i, index) => ({
          description: i.description,
          quantity: parseFloat(i.quantity) || 1,
          unit_price: parseFloat(i.unit_price) || 0,
          unit: i.unit || null,
          sort_order: index,
        })),
      });
    } catch {
      setError(
        mode === "create"
          ? "Couldn't create the invoice. Check the dates and line items."
          : "Couldn't save your changes. Check the dates and line items."
      );
      setSaving(false);
    }
  };

  const symbol = currencySymbol(form.currency);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Link
        href={mode === "edit" && invoiceNumber ? "/invoices" : "/invoices"}
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to invoices
      </Link>

      <PageHeader
        eyebrow={mode === "create" ? "New invoice" : "Editing"}
        title={
          mode === "create"
            ? "Let's get you paid."
            : `Editing ${invoiceNumber ?? "invoice"}`
        }
        subtitle={
          mode === "create"
            ? "Pick a client, drop in your lines. Totals keep themselves up to date."
            : "Changes apply the moment you save. Paid invoices can't be edited."
        }
      />

      <AnimatePresence>
        {error ? (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-[12px] bg-negative/10 px-4 py-3 text-[13px] font-medium text-negative ring-1 ring-negative/20"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>

      <div className="grid gap-4 xl:grid-cols-[1fr_330px] xl:items-start">
        {/* ── the form ─────────────────────────────────────────── */}
        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Details" caption="Who it's for and when it's due" />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Client" hint={clients.length === 0 ? "No clients yet — you can add one later." : undefined}>
                <Select
                  value={form.client_id}
                  onChange={(e) => set({ client_id: e.target.value })}
                >
                  <option value="">No client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Currency">
                <Select
                  value={form.currency}
                  onChange={(e) => set({ currency: e.target.value })}
                >
                  <option value="GBP">GBP (£)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                </Select>
              </Field>

              <Field label="Issue date" required>
                <Input
                  type="date"
                  required
                  value={form.issue_date}
                  onChange={(e) => set({ issue_date: e.target.value })}
                />
              </Field>

              <Field label="Due date" required>
                <Input
                  type="date"
                  required
                  value={form.due_date}
                  onChange={(e) => set({ due_date: e.target.value })}
                />
              </Field>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Line items"
              caption="Drag the handle to reorder — the order is what your client sees"
              action={
                catalog.length > 0 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setCatalogOpen(true)}
                  >
                    <Package className="h-3.5 w-3.5" />
                    From catalogue
                  </Button>
                ) : null
              }
            />

            <div className="mt-5 hidden grid-cols-[28px_1fr_84px_112px_104px_36px] gap-2 px-2.5 sm:grid">
              <span />
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Description
              </span>
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Qty
              </span>
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Unit price
              </span>
              <span className="text-right text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Amount
              </span>
              <span />
            </div>

            <Reorder.Group
              axis="y"
              values={items}
              onReorder={setItems}
              className="mt-2 space-y-2"
            >
              {items.map((item) => (
                <LineRow
                  key={item.id}
                  item={item}
                  currency={form.currency}
                  canRemove={items.length > 1}
                  onChange={(patch) =>
                    setItems((prev) =>
                      prev.map((i) => (i.id === item.id ? { ...i, ...patch } : i))
                    )
                  }
                  onRemove={() =>
                    setItems((prev) => prev.filter((i) => i.id !== item.id))
                  }
                />
              ))}
            </Reorder.Group>

            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, blankLine()])}
              className="group mt-2 flex w-full items-center justify-center gap-2 rounded-[12px] border border-dashed border-line py-2.5 text-[13px] font-semibold text-ink-muted transition-colors hover:border-brass-soft hover:text-brass-ink"
            >
              <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
              Add line item
            </button>
          </Panel>

          <Panel>
            <PanelHeader title="PDF template" caption="How the document your client opens will look" />
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {TEMPLATES.map((t) => {
                const selected = form.pdf_template === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => set({ pdf_template: t.id })}
                    aria-pressed={selected}
                    className={`rounded-[14px] p-3 text-left ring-1 transition-all duration-200 ${
                      selected
                        ? "bg-brass/[0.06] ring-2 ring-brass"
                        : "bg-card ring-line hover:ring-brass-soft/50"
                    }`}
                  >
                    <span className="block h-16 rounded-[9px] bg-elevated p-2">
                      <TemplatePreview id={t.id} />
                    </span>
                    <span className="mt-2.5 block text-[13px] font-bold text-ink">
                      {t.title}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] text-ink-muted">
                      {t.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Notes & terms" caption="Both appear on the PDF" />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Notes" hint="Anything the client should read first.">
                <Textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => set({ notes: e.target.value })}
                  placeholder="Thanks for your business…"
                />
              </Field>
              <Field label="Payment terms" hint="Shown under the total.">
                <Textarea
                  rows={3}
                  value={form.terms}
                  onChange={(e) => set({ terms: e.target.value })}
                  placeholder="Payment due within 30 days…"
                />
              </Field>
            </div>
          </Panel>
        </div>

        {/* ── the running total ────────────────────────────────── */}
        <div className="xl:sticky xl:top-20">
          <Panel>
            <PanelHeader title="Summary" caption="Updates as you type" />

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Field label="Tax rate (%)">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.tax_rate}
                  onChange={(e) => set({ tax_rate: e.target.value })}
                  className="tabular-nums"
                />
              </Field>
              <Field label={`Discount (${symbol})`}>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discount_amount}
                  onChange={(e) => set({ discount_amount: e.target.value })}
                  className="tabular-nums"
                />
              </Field>
            </div>

            <dl className="mt-5 space-y-2 border-t border-line pt-4 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Subtotal</dt>
                <dd className="font-semibold tabular-nums text-ink">
                  {formatCurrency(subtotal, form.currency)}
                </dd>
              </div>
              {taxRate > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Tax ({taxRate}%)</dt>
                  <dd className="font-semibold tabular-nums text-ink">
                    {formatCurrency(taxAmount, form.currency)}
                  </dd>
                </div>
              ) : null}
              {discount > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Discount</dt>
                  <dd className="font-semibold tabular-nums text-negative">
                    −{formatCurrency(discount, form.currency)}
                  </dd>
                </div>
              ) : null}
            </dl>

            <div className="mt-4 flex items-end justify-between border-t border-line pt-4">
              <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Total
              </span>
              <motion.span
                key={Math.round(total * 100)}
                initial={{ opacity: 0.5, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: EASE_OUT }}
                className="text-[26px] font-extrabold leading-none tracking-[-0.02em] tabular-nums text-ink"
              >
                <CountUp
                  to={total}
                  duration={0.4}
                  format={(n) => formatCurrency(n, form.currency)}
                />
              </motion.span>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {mode === "create" ? "Creating…" : "Saving…"}
                  </>
                ) : mode === "create" ? (
                  "Create invoice"
                ) : (
                  "Save changes"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/invoices")}
              >
                Cancel
              </Button>
            </div>

            <p className="mt-3 text-center text-[11.5px] text-ink-muted">
              {items.filter((i) => i.description && i.unit_price).length} of{" "}
              {items.length} lines ready
            </p>
          </Panel>
        </div>
      </div>

      {/* ── catalogue picker ─────────────────────────────────────── */}
      <Modal
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        title="Add from catalogue"
        description="Your saved items and services, priced and ready."
        size="md"
      >
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <Input
            autoFocus
            placeholder="Search the catalogue…"
            value={catalogQuery}
            onChange={(e) => setCatalogQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="max-h-[46vh] space-y-1.5 overflow-y-auto">
          {filteredCatalog.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-ink-muted">
              Nothing matches that.
            </p>
          ) : (
            filteredCatalog.map((ci) => (
              <button
                key={ci.id}
                type="button"
                onClick={() => addFromCatalog(ci)}
                className="flex w-full items-center justify-between gap-4 rounded-[10px] px-3 py-2.5 text-left ring-1 ring-line transition-colors hover:bg-elevated"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-semibold text-ink">
                    {ci.name}
                  </span>
                  {ci.description ? (
                    <span className="block truncate text-[12px] text-ink-muted">
                      {ci.description}
                    </span>
                  ) : null}
                </span>
                <span className="flex-none text-right">
                  <span className="block text-[13.5px] font-bold tabular-nums text-ink">
                    {formatCurrency(ci.unit_price, form.currency)}
                  </span>
                  {ci.unit ? (
                    <span className="block text-[11px] text-ink-muted">per {ci.unit}</span>
                  ) : null}
                </span>
              </button>
            ))
          )}
        </div>
      </Modal>
    </form>
  );
}

/** Shared loading shell for both editor routes. */
export function EditorSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-4 w-32 animate-pulse rounded-full bg-elevated" />
      <div className="h-9 w-72 animate-pulse rounded-lg bg-elevated" />
      <div className="grid gap-4 xl:grid-cols-[1fr_330px]">
        <div className="space-y-4">
          <div className="h-44 animate-pulse rounded-[16px] bg-elevated" />
          <div className="h-64 animate-pulse rounded-[16px] bg-elevated" />
        </div>
        <div className="h-96 animate-pulse rounded-[16px] bg-elevated" />
      </div>
    </div>
  );
}
