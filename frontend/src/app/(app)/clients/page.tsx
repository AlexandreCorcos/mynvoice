"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
  Download,
  ChevronDown,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import EmptyState from "@/components/ui/empty-state";
import type { Client, Company } from "@/types";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await api.get<Client[]>(`/clients/${params}`);
      setClients(res);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this client? This cannot be undone.")) return;
    await api.delete(`/clients/${id}`);
    setClients((prev) => prev.filter((c) => c.id !== id));
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
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[var(--radius-input)] border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-petrol-mid focus:outline-none"
          />
        </div>
        <button
          onClick={() => {
            setEditingClient(null);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-petrol-dark px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-petrol-mid"
        >
          <Plus className="h-4 w-4" />
          Add Client
        </button>
      </div>

      {/* Client Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]"
            />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No clients yet"
          description="Add your first client to start creating invoices"
          action={
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-coral px-4 py-2.5 text-sm font-semibold text-white hover:bg-coral-dark transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add your first client
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {clients.map((client) => (
            <div
              key={client.id}
              className="group relative rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]"
            >
              {/* Menu */}
              <div className="absolute right-4 top-4">
                <button
                  onClick={() =>
                    setMenuOpen(menuOpen === client.id ? null : client.id)
                  }
                  className="rounded-lg p-1.5 text-text-secondary opacity-0 transition-opacity hover:bg-surface-light group-hover:opacity-100"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {menuOpen === client.id && (
                  <div className="absolute right-0 top-8 z-10 w-36 rounded-xl bg-white py-1 shadow-[var(--shadow-dropdown)]">
                    <button
                      onClick={() => {
                        setEditingClient(client);
                        setShowModal(true);
                        setMenuOpen(null);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-light"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(client.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-petrol-dark text-sm font-semibold text-white">
                  {client.company_name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary">
                    {client.company_name}
                  </h3>
                  {client.contact_person && (
                    <p className="text-xs text-text-secondary">
                      {client.contact_person}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm text-text-secondary">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{client.email}</span>
                </div>
                {client.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.city && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {client.city}
                      {client.country !== "United Kingdom"
                        ? `, ${client.country}`
                        : ""}
                    </span>
                  </div>
                )}
              </div>

              {/* Receivables + date footer */}
              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                <p className="text-xs text-text-secondary">
                  Added {formatDate(client.created_at)}
                </p>
                {client.total_receivables > 0 && (
                  <span className="text-sm font-semibold text-coral">
                    {formatCurrency(client.total_receivables)} outstanding
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ClientModal
          client={editingClient}
          onClose={() => {
            setShowModal(false);
            setEditingClient(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setEditingClient(null);
            fetchClients();
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Collapsible section component                                      */
/* ------------------------------------------------------------------ */

function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-[var(--radius-input)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-text-primary bg-surface-light hover:bg-gray-100 transition-colors"
      >
        {title}
        <ChevronDown
          className={`h-4 w-4 text-text-secondary transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && <div className="px-4 pb-4 pt-3 space-y-4">{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Client modal (create / edit)                                       */
/* ------------------------------------------------------------------ */

interface ClientFormData {
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
}

function ClientModal({
  client,
  onClose,
  onSaved,
}: {
  client: Client | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ClientFormData>({
    company_name: client?.company_name || "",
    contact_person: client?.contact_person || "",
    email: client?.email || "",
    phone: client?.phone || "",
    address_line1: client?.address_line1 || "",
    city: client?.city || "",
    postcode: client?.postcode || "",
    country: client?.country || "United Kingdom",
    vat_number: client?.vat_number || "",
    notes: client?.notes || "",
    invoice_prefix: client?.invoice_prefix || "",
    use_year_in_number: client?.use_year_in_number ?? false,
    default_payment_terms_days:
      client?.default_payment_terms_days != null
        ? String(client.default_payment_terms_days)
        : "",
    default_notes: client?.default_notes || "",
    bank_name: client?.bank_name || "",
    bank_account_name: client?.bank_account_name || "",
    bank_account_number: client?.bank_account_number || "",
    bank_sort_code: client?.bank_sort_code || "",
  });
  const [saving, setSaving] = useState(false);
  const [importingBank, setImportingBank] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field: keyof ClientFormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleImportBank = async () => {
    setImportingBank(true);
    try {
      const company = await api.get<Company>("/profile/company");
      setForm((prev) => ({
        ...prev,
        bank_name: company.bank_name || "",
        bank_account_name: company.bank_account_name || "",
        bank_account_number: company.bank_account_number || "",
        bank_sort_code: company.bank_sort_code || "",
      }));
    } catch {
      setError("Could not load business bank details.");
    } finally {
      setImportingBank(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      ...form,
      invoice_prefix: form.invoice_prefix || null,
      default_payment_terms_days: form.default_payment_terms_days
        ? Number(form.default_payment_terms_days)
        : null,
      default_notes: form.default_notes || null,
      bank_name: form.bank_name || null,
      bank_account_name: form.bank_account_name || null,
      bank_account_number: form.bank_account_number || null,
      bank_sort_code: form.bank_sort_code || null,
      contact_person: form.contact_person || null,
      phone: form.phone || null,
      address_line1: form.address_line1 || null,
      city: form.city || null,
      postcode: form.postcode || null,
      vat_number: form.vat_number || null,
      notes: form.notes || null,
    };

    try {
      if (client) {
        await api.put(`/clients/${client.id}`, payload);
      } else {
        await api.post("/clients/", payload);
      }
      onSaved();
    } catch {
      setError("Failed to save client. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none";

  const labelClass = "block text-sm font-medium text-text-primary mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-dropdown)] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
          <h2 className="text-lg font-semibold text-text-primary">
            {client ? "Edit Client" : "New Client"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-light transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable form body */}
        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto flex-1 p-6 space-y-5"
        >
          {error && (
            <div className="rounded-[var(--radius-input)] bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* ---- Section 1: Client Details ---- */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide">
              Client Details
            </h3>

            <div>
              <label className={labelClass}>Company name *</label>
              <input
                type="text"
                value={form.company_name}
                onChange={(e) => updateField("company_name", e.target.value)}
                required
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Contact person</label>
                <input
                  type="text"
                  value={form.contact_person}
                  onChange={(e) =>
                    updateField("contact_person", e.target.value)
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Address</label>
              <input
                type="text"
                value={form.address_line1}
                onChange={(e) => updateField("address_line1", e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Postcode</label>
                <input
                  type="text"
                  value={form.postcode}
                  onChange={(e) => updateField("postcode", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Country</label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>VAT number</label>
                <input
                  type="text"
                  value={form.vat_number}
                  onChange={(e) => updateField("vat_number", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>

          {/* ---- Section 2: Invoice Settings (collapsible) ---- */}
          <Section title="Invoice Settings">
            <div>
              <label className={labelClass}>Invoice prefix</label>
              <input
                type="text"
                value={form.invoice_prefix}
                onChange={(e) => updateField("invoice_prefix", e.target.value)}
                placeholder="Leave blank to use default"
                className={inputClass}
              />
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.use_year_in_number}
                onChange={(e) =>
                  updateField("use_year_in_number", e.target.checked)
                }
                className="h-4 w-4 rounded border-gray-300 text-petrol-dark focus:ring-petrol-mid"
              />
              <span className="text-sm text-text-primary">
                Include year in invoice numbers
              </span>
            </label>

            <div>
              <label className={labelClass}>Default payment terms (days)</label>
              <input
                type="number"
                min={0}
                value={form.default_payment_terms_days}
                onChange={(e) =>
                  updateField("default_payment_terms_days", e.target.value)
                }
                placeholder="e.g. 30"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Default invoice notes</label>
              <textarea
                value={form.default_notes}
                onChange={(e) => updateField("default_notes", e.target.value)}
                rows={2}
                placeholder="Notes to include on every invoice for this client"
                className={`${inputClass} resize-none`}
              />
            </div>
          </Section>

          {/* ---- Section 3: Payment Details (collapsible) ---- */}
          <Section title="Payment Details">
            <button
              type="button"
              onClick={handleImportBank}
              disabled={importingBank}
              className="inline-flex items-center gap-2 rounded-[var(--radius-button)] border border-petrol-dark px-3 py-2 text-sm font-medium text-petrol-dark hover:bg-petrol-dark hover:text-white disabled:opacity-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              {importingBank ? "Importing..." : "Import from your business"}
            </button>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Bank name</label>
                <input
                  type="text"
                  value={form.bank_name}
                  onChange={(e) => updateField("bank_name", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Account name</label>
                <input
                  type="text"
                  value={form.bank_account_name}
                  onChange={(e) =>
                    updateField("bank_account_name", e.target.value)
                  }
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Account number</label>
                <input
                  type="text"
                  value={form.bank_account_number}
                  onChange={(e) =>
                    updateField("bank_account_number", e.target.value)
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Sort code</label>
                <input
                  type="text"
                  value={form.bank_sort_code}
                  onChange={(e) =>
                    updateField("bank_sort_code", e.target.value)
                  }
                  className={inputClass}
                />
              </div>
            </div>

            <p className="text-xs text-text-secondary">
              Bank details shown on invoices for this client
            </p>
          </Section>

          {/* ---- Actions ---- */}
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
              {saving ? "Saving..." : client ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
