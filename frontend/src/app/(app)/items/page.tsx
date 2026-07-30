"use client";

/* =========================================================================
   Items & Services — the catalogue behind the invoice editor.

   Small records, so they get compact rows rather than cards. Inactive
   items stay visible but recede: they're still pickable history, not
   deleted, and hiding them makes the list lie about what exists.
   ========================================================================= */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { EASE_OUT } from "@/components/motion";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/app/button";
import { Field, Input, SearchInput, Select, Textarea } from "@/components/app/form";
import { Modal } from "@/components/app/modal";
import { RowMenu } from "@/components/app/menu";
import { SegmentedControl } from "@/components/app/segmented-control";
import EmptyState from "@/components/ui/empty-state";
import type { Item } from "@/types";

const UNIT_OPTIONS = ["hour", "day", "item", "project"] as const;
const CUSTOM = "__custom";

type Filter = "all" | "active" | "archived";

/* ------------------------------------------------------------------ */
/* Form                                                                */
/* ------------------------------------------------------------------ */

function ItemForm({
  item,
  open,
  currency,
  onClose,
  onSaved,
}: {
  item: Item | null;
  open: boolean;
  currency: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const preset = item?.unit && (UNIT_OPTIONS as readonly string[]).includes(item.unit);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState<string>("hour");
  const [customUnit, setCustomUnit] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(item?.name ?? "");
    setDescription(item?.description ?? "");
    setPrice(item ? String(item.unit_price) : "");
    setUnit(item?.unit ? (preset ? item.unit : CUSTOM) : "hour");
    setCustomUnit(item?.unit && !preset ? item.unit : "");
    setActive(item?.is_active ?? true);
    setError("");
  }, [open, item, preset]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        name,
        description: description || null,
        unit_price: parseFloat(price) || 0,
        unit: (unit === CUSTOM ? customUnit : unit) || null,
        is_active: active,
      };
      if (item) await api.put(`/items/${item.id}`, payload);
      else await api.post("/items/", payload);
      onSaved();
    } catch {
      setError("Couldn't save this item. Check the price and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={item ? `Edit ${item.name}` : "New item"}
      description="Anything you bill for more than once belongs here."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="item-form" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? "Saving…" : item ? "Save changes" : "Add item"}
          </Button>
        </>
      }
    >
      <form id="item-form" onSubmit={submit} className="space-y-3.5">
        {error ? (
          <p className="rounded-[10px] bg-negative/10 px-3.5 py-2.5 text-[12.5px] font-medium text-negative ring-1 ring-negative/20">
            {error}
          </p>
        ) : null}

        <Field label="Name" required>
          <Input
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Web development"
          />
        </Field>

        <Field label="Description" hint="Appears under the line item on the invoice.">
          <Textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Front-end build, two rounds of revisions"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={`Unit price (${currency})`} required>
            <Input
              type="number"
              min="0"
              step="0.01"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="tabular-nums"
            />
          </Field>

          <Field label="Unit">
            {unit === CUSTOM ? (
              <div className="flex gap-2">
                <Input
                  autoFocus
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value)}
                  placeholder="e.g. licence"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setUnit("hour");
                    setCustomUnit("");
                  }}
                >
                  Presets
                </Button>
              </div>
            ) : (
              <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    per {u}
                  </option>
                ))}
                <option value={CUSTOM}>Something else…</option>
              </Select>
            )}
          </Field>
        </div>

        <label className="flex items-center gap-2.5">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 rounded border-line accent-[var(--brass)]"
          />
          <span className="text-[12.5px] text-ink">
            Available in the invoice editor
          </span>
        </label>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function ItemsPage() {
  const { user } = useAuth();
  const currency = user?.currency || "GBP";

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      setItems(await api.get<Item[]>("/items/"));
    } catch {
      /* empty state covers it */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const counts = useMemo(
    () => ({
      all: items.length,
      active: items.filter((i) => i.is_active).length,
      archived: items.filter((i) => !i.is_active).length,
    }),
    [items]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (filter === "active" && !i.is_active) return false;
      if (filter === "archived" && i.is_active) return false;
      if (!q) return true;
      return (
        i.name.toLowerCase().includes(q) ||
        (i.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, filter, search]);

  const remove = async () => {
    if (!deleting) return;
    await api.delete(`/items/${deleting.id}`);
    setItems((prev) => prev.filter((i) => i.id !== deleting.id));
    setDeleting(null);
  };

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Items & services"
        title="What you sell, priced once."
        subtitle="Save the things you bill for and drop them into any invoice from the catalogue picker."
        actions={
          <Button variant="primary" onClick={openNew}>
            <Plus className="h-4 w-4" />
            New item
          </Button>
        }
      />

      {items.length > 0 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SegmentedControl<Filter>
            layoutId="item-filter"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "active", label: "Active", count: counts.active },
              { value: "archived", label: "Archived", count: counts.archived },
            ]}
          />
          <SearchInput
            placeholder="Search the catalogue…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:w-64"
          />
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[62px] animate-pulse rounded-[14px] bg-elevated" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Package}
          title={items.length === 0 ? "Nothing in the catalogue yet" : "Nothing matches that"}
          description={
            items.length === 0
              ? "Add the services and products you bill for and they become one-click line items."
              : "Try a different name, or switch the filter."
          }
          action={
            items.length === 0 ? (
              <Button variant="primary" onClick={openNew}>
                <Plus className="h-4 w-4" />
                Add your first item
              </Button>
            ) : undefined
          }
        />
      ) : (
        <motion.div layout className="space-y-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((item, i) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.99, transition: { duration: 0.15 } }}
                transition={{ duration: 0.4, delay: Math.min(i, 8) * 0.03, ease: EASE_OUT }}
                className={cn(
                  "flex items-center gap-4 rounded-[14px] bg-card px-4 py-3 ring-1 ring-line transition-shadow duration-200 hover:shadow-[var(--shadow-card)]",
                  !item.is_active && "opacity-60"
                )}
              >
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[11px] bg-brass/[0.08] text-brass-ink">
                  <Package className="h-4 w-4" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[14px] font-bold tracking-[-0.01em] text-ink">
                      {item.name}
                    </span>
                    {!item.is_active ? (
                      <span className="flex-none rounded-full bg-elevated px-2 py-0.5 text-[10.5px] font-semibold text-ink-muted ring-1 ring-line">
                        Archived
                      </span>
                    ) : null}
                  </span>
                  {item.description ? (
                    <span className="mt-0.5 block truncate text-[12.5px] text-ink-muted">
                      {item.description}
                    </span>
                  ) : null}
                </span>

                <span className="flex-none text-right">
                  <span className="block text-[14.5px] font-bold tabular-nums text-ink">
                    {formatCurrency(item.unit_price, currency)}
                  </span>
                  {item.unit ? (
                    <span className="block text-[11.5px] text-ink-muted">per {item.unit}</span>
                  ) : null}
                </span>

                <RowMenu
                  label={`Actions for ${item.name}`}
                  items={[
                    {
                      label: "Edit",
                      icon: Pencil,
                      onSelect: () => {
                        setEditing(item);
                        setFormOpen(true);
                      },
                    },
                    {
                      label: "Delete",
                      icon: Trash2,
                      tone: "danger",
                      onSelect: () => setDeleting(item),
                    },
                  ]}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <ItemForm
        open={formOpen}
        item={editing}
        currency={currency}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          fetchItems();
        }}
      />

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.name ?? "item"}?`}
        description="Invoices that already use it keep their line — only the catalogue entry goes."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={remove}>
              <Trash2 className="h-4 w-4" />
              Delete item
            </Button>
          </>
        }
      />
    </div>
  );
}
