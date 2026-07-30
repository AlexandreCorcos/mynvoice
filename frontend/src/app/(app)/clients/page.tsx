"use client";

/* =========================================================================
   Clients.

   Cards rather than rows: a client is a small dossier — who they are, how
   to reach them, and what they owe — and that reads better as a block than
   as five columns. Receivables sit on the card because "who owes me money"
   is the question this screen is usually opened to answer.
   ========================================================================= */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  ChevronDown,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import { EASE_OUT } from "@/components/motion";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/app/button";
import { Field, Input, SearchInput, Textarea } from "@/components/app/form";
import { Modal } from "@/components/app/modal";
import { RowMenu } from "@/components/app/menu";
import EmptyState from "@/components/ui/empty-state";
import type { Client, Company } from "@/types";

/* Initials for the avatar tile — two letters, upper case, no punctuation. */
function initials(name: string) {
  return name
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/* ------------------------------------------------------------------ */
/* Collapsible form section                                            */
/* ------------------------------------------------------------------ */

function Section({
  title,
  caption,
  children,
  defaultOpen = false,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-[12px] ring-1 ring-line">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left"
      >
        <span>
          <span className="block text-[13px] font-bold text-ink">{title}</span>
          {caption ? (
            <span className="block text-[11.5px] text-ink-muted">{caption}</span>
          ) : null}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown className="h-4 w-4 text-ink-muted" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="border-t border-line p-3.5">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Form                                                                */
/* ------------------------------------------------------------------ */

type FormState = {
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address_line1: string;
  city: string;
  postcode: string;
  country: string;
  vat_number: string;
  notes: string;
  invoice_prefix: string;
  use_year_in_number: boolean;
  default_payment_terms_days: string;
  default_notes: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_sort_code: string;
};

function blank(client: Client | null): FormState {
  return {
    company_name: client?.company_name ?? "",
    contact_person: client?.contact_person ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    address_line1: client?.address_line1 ?? "",
    city: client?.city ?? "",
    postcode: client?.postcode ?? "",
    country: client?.country ?? "United Kingdom",
    vat_number: client?.vat_number ?? "",
    notes: client?.notes ?? "",
    invoice_prefix: client?.invoice_prefix ?? "",
    use_year_in_number: client?.use_year_in_number ?? false,
    default_payment_terms_days:
      client?.default_payment_terms_days != null
        ? String(client.default_payment_terms_days)
        : "",
    default_notes: client?.default_notes ?? "",
    bank_name: client?.bank_name ?? "",
    bank_account_name: client?.bank_account_name ?? "",
    bank_account_number: client?.bank_account_number ?? "",
    bank_sort_code: client?.bank_sort_code ?? "",
  };
}

function ClientForm({
  client,
  open,
  onClose,
  onSaved,
}: {
  client: Client | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => blank(client));
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  /* Reopening for a different client must not keep the last one's values. */
  useEffect(() => {
    if (open) {
      setForm(blank(client));
      setError("");
    }
  }, [open, client]);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const importBank = async () => {
    setImporting(true);
    try {
      const company = await api.get<Company>("/profile/company");
      set({
        bank_name: company.bank_name ?? "",
        bank_account_name: company.bank_account_name ?? "",
        bank_account_number: company.bank_account_number ?? "",
        bank_sort_code: company.bank_sort_code ?? "",
      });
    } catch {
      setError("Couldn't load your business bank details.");
    } finally {
      setImporting(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    /* The API takes null for "not set"; empty strings would be stored. */
    const orNull = (v: string) => v || null;
    const payload = {
      ...form,
      contact_person: orNull(form.contact_person),
      phone: orNull(form.phone),
      address_line1: orNull(form.address_line1),
      city: orNull(form.city),
      postcode: orNull(form.postcode),
      vat_number: orNull(form.vat_number),
      notes: orNull(form.notes),
      invoice_prefix: orNull(form.invoice_prefix),
      default_notes: orNull(form.default_notes),
      bank_name: orNull(form.bank_name),
      bank_account_name: orNull(form.bank_account_name),
      bank_account_number: orNull(form.bank_account_number),
      bank_sort_code: orNull(form.bank_sort_code),
      default_payment_terms_days: form.default_payment_terms_days
        ? Number(form.default_payment_terms_days)
        : null,
    };

    try {
      if (client) await api.put(`/clients/${client.id}`, payload);
      else await api.post("/clients/", payload);
      onSaved();
    } catch {
      setError("Couldn't save this client. Check the email address and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={client ? `Edit ${client.company_name}` : "New client"}
      description="Everything here is reused on every invoice you send them."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" form="client-form" type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? "Saving…" : client ? "Save changes" : "Add client"}
          </Button>
        </>
      }
    >
      <form id="client-form" onSubmit={submit} className="space-y-3">
        {error ? (
          <p className="rounded-[10px] bg-negative/10 px-3.5 py-2.5 text-[12.5px] font-medium text-negative ring-1 ring-negative/20">
            {error}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Company name" required className="sm:col-span-2">
            <Input
              required
              autoFocus
              value={form.company_name}
              onChange={(e) => set({ company_name: e.target.value })}
              placeholder="Northside Studio"
            />
          </Field>
          <Field label="Contact person">
            <Input
              value={form.contact_person}
              onChange={(e) => set({ contact_person: e.target.value })}
              placeholder="Rae Whitcombe"
            />
          </Field>
          <Field label="Email" required>
            <Input
              type="email"
              required
              value={form.email}
              onChange={(e) => set({ email: e.target.value })}
              placeholder="hello@northside.studio"
            />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
          </Field>
          <Field label="VAT number">
            <Input
              value={form.vat_number}
              onChange={(e) => set({ vat_number: e.target.value })}
            />
          </Field>
        </div>

        <Section title="Address" caption="Printed on the invoice">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Address" className="sm:col-span-2">
              <Input
                value={form.address_line1}
                onChange={(e) => set({ address_line1: e.target.value })}
              />
            </Field>
            <Field label="City">
              <Input value={form.city} onChange={(e) => set({ city: e.target.value })} />
            </Field>
            <Field label="Postcode">
              <Input
                value={form.postcode}
                onChange={(e) => set({ postcode: e.target.value })}
              />
            </Field>
            <Field label="Country" className="sm:col-span-2">
              <Input
                value={form.country}
                onChange={(e) => set({ country: e.target.value })}
              />
            </Field>
          </div>
        </Section>

        <Section title="Invoicing defaults" caption="Applied when you create an invoice for them">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Invoice prefix" hint="Leave blank to use your company default.">
              <Input
                value={form.invoice_prefix}
                onChange={(e) => set({ invoice_prefix: e.target.value })}
                placeholder="INV"
              />
            </Field>
            <Field label="Payment terms (days)">
              <Input
                type="number"
                min="0"
                value={form.default_payment_terms_days}
                onChange={(e) => set({ default_payment_terms_days: e.target.value })}
                placeholder="30"
                className="tabular-nums"
              />
            </Field>
            <label className="flex items-center gap-2.5 sm:col-span-2">
              <input
                type="checkbox"
                checked={form.use_year_in_number}
                onChange={(e) => set({ use_year_in_number: e.target.checked })}
                className="h-4 w-4 rounded border-line accent-[var(--brass)]"
              />
              <span className="text-[12.5px] text-ink">
                Include the year in their invoice numbers
              </span>
            </label>
            <Field label="Default notes" className="sm:col-span-2">
              <Textarea
                rows={2}
                value={form.default_notes}
                onChange={(e) => set({ default_notes: e.target.value })}
              />
            </Field>
          </div>
        </Section>

        <Section title="Bank details" caption="Only if this client pays into a different account">
          <div className="mb-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={importBank}
              disabled={importing}
            >
              {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Copy from my business details
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Bank name">
              <Input value={form.bank_name} onChange={(e) => set({ bank_name: e.target.value })} />
            </Field>
            <Field label="Account name">
              <Input
                value={form.bank_account_name}
                onChange={(e) => set({ bank_account_name: e.target.value })}
              />
            </Field>
            <Field label="Account number">
              <Input
                value={form.bank_account_number}
                onChange={(e) => set({ bank_account_number: e.target.value })}
                className="tabular-nums"
              />
            </Field>
            <Field label="Sort code">
              <Input
                value={form.bank_sort_code}
                onChange={(e) => set({ bank_sort_code: e.target.value })}
                className="tabular-nums"
              />
            </Field>
          </div>
        </Section>

        <Section title="Private notes" caption="Never shown to the client">
          <Textarea
            rows={3}
            value={form.notes}
            onChange={(e) => set({ notes: e.target.value })}
            placeholder="Always pays late, chase at day 25…"
          />
        </Section>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      setClients(await api.get<Client[]>("/clients/"));
    } catch {
      /* empty state covers it */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.company_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.contact_person ?? "").toLowerCase().includes(q)
    );
  }, [clients, search]);

  const owed = useMemo(
    () => clients.reduce((sum, c) => sum + (c.total_receivables || 0), 0),
    [clients]
  );

  const remove = async () => {
    if (!deleting) return;
    await api.delete(`/clients/${deleting.id}`);
    setClients((prev) => prev.filter((c) => c.id !== deleting.id));
    setDeleting(null);
  };

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clients"
        title="The people you bill."
        subtitle={
          owed > 0
            ? `${formatCurrency(owed)} owed across ${clients.length} ${
                clients.length === 1 ? "client" : "clients"
              }.`
            : "Saved once, reused on every invoice you ever send."
        }
        actions={
          <Button variant="primary" onClick={openNew}>
            <Plus className="h-4 w-4" />
            New client
          </Button>
        }
      />

      {clients.length > 0 ? (
        <SearchInput
          placeholder="Search by company, contact or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      ) : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[168px] animate-pulse rounded-[16px] bg-elevated" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Users}
          title={clients.length === 0 ? "No clients yet" : "Nothing matches that"}
          description={
            clients.length === 0
              ? "Add a client once and their details, terms and bank info follow onto every invoice."
              : "Try a different company, contact or email address."
          }
          action={
            clients.length === 0 ? (
              <Button variant="primary" onClick={openNew}>
                <Plus className="h-4 w-4" />
                Add your first client
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setSearch("")}>
                Clear search
              </Button>
            )
          }
        />
      ) : (
        <motion.div layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((c, i) => (
              <motion.div
                key={c.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
                transition={{ duration: 0.45, delay: Math.min(i, 8) * 0.04, ease: EASE_OUT }}
                whileHover={{ y: -3 }}
                className="group flex flex-col rounded-[16px] bg-card p-5 ring-1 ring-line transition-shadow duration-300 hover:shadow-[var(--shadow-card-hover)]"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px] bg-brass text-[12px] font-bold text-white">
                    {initials(c.company_name) || <Building2 className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-bold tracking-[-0.01em] text-ink">
                      {c.company_name}
                    </span>
                    {c.contact_person ? (
                      <span className="block truncate text-[12.5px] text-ink-muted">
                        {c.contact_person}
                      </span>
                    ) : null}
                  </span>
                  <RowMenu
                    label={`Actions for ${c.company_name}`}
                    items={[
                      {
                        label: "Edit",
                        icon: Pencil,
                        onSelect: () => {
                          setEditing(c);
                          setFormOpen(true);
                        },
                      },
                      {
                        label: "Delete",
                        icon: Trash2,
                        tone: "danger",
                        onSelect: () => setDeleting(c),
                      },
                    ]}
                  />
                </div>

                <div className="mt-4 space-y-1.5 text-[12.5px] text-ink-muted">
                  <span className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 flex-none" />
                    <span className="truncate">{c.email}</span>
                  </span>
                  {c.phone ? (
                    <span className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 flex-none" />
                      <span className="truncate">{c.phone}</span>
                    </span>
                  ) : null}
                  {c.city ? (
                    <span className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 flex-none" />
                      <span className="truncate">
                        {c.city}
                        {c.postcode ? `, ${c.postcode}` : ""}
                      </span>
                    </span>
                  ) : null}
                </div>

                <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-3.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    Outstanding
                  </span>
                  <span
                    className={cn(
                      "text-[15px] font-bold tabular-nums",
                      c.total_receivables > 0 ? "text-ink" : "text-ink-muted"
                    )}
                  >
                    {formatCurrency(c.total_receivables || 0)}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <ClientForm
        open={formOpen}
        client={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          fetchClients();
        }}
      />

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.company_name ?? "client"}?`}
        description="Their invoices stay, but they'll no longer be linked to a client record."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={remove}>
              <Trash2 className="h-4 w-4" />
              Delete client
            </Button>
          </>
        }
      />
    </div>
  );
}
