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
} from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import EmptyState from "@/components/ui/empty-state";
import type { Client } from "@/types";

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
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate">{client.email}</span>
                </div>
                {client.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.city && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>
                      {client.city}
                      {client.country !== "United Kingdom"
                        ? `, ${client.country}`
                        : ""}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 border-t border-gray-100 pt-3">
                <p className="text-xs text-text-secondary">
                  Added {formatDate(client.created_at)}
                </p>
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

function ClientModal({
  client,
  onClose,
  onSaved,
}: {
  client: Client | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
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
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (client) {
        await api.put(`/clients/${client.id}`, form);
      } else {
        await api.post("/clients/", form);
      }
      onSaved();
    } catch {
      setError("Failed to save client. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-dropdown)]">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-[var(--radius-input)] bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Company name *
            </label>
            <input
              type="text"
              value={form.company_name}
              onChange={(e) => updateField("company_name", e.target.value)}
              required
              className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Contact person
              </label>
              <input
                type="text"
                value={form.contact_person}
                onChange={(e) => updateField("contact_person", e.target.value)}
                className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Email *
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                required
                className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Phone
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                VAT number
              </label>
              <input
                type="text"
                value={form.vat_number}
                onChange={(e) => updateField("vat_number", e.target.value)}
                className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Address
            </label>
            <input
              type="text"
              value={form.address_line1}
              onChange={(e) => updateField("address_line1", e.target.value)}
              className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                City
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
                className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Postcode
              </label>
              <input
                type="text"
                value={form.postcode}
                onChange={(e) => updateField("postcode", e.target.value)}
                className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Country
              </label>
              <input
                type="text"
                value={form.country}
                onChange={(e) => updateField("country", e.target.value)}
                className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              rows={2}
              className="w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2 text-sm focus:border-petrol-mid focus:outline-none resize-none"
            />
          </div>

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
