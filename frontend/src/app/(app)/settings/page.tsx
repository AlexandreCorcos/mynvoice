"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import type { Company } from "@/types";

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "company">("profile");
  const [company, setCompany] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  // Profile form
  const [profile, setProfile] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    phone: user?.phone || "",
    language: user?.language || "en-GB",
    currency: user?.currency || "GBP",
  });

  // Company form
  const [companyForm, setCompanyForm] = useState({
    name: "",
    legal_name: "",
    vat_number: "",
    tax_id: "",
    email: "",
    phone: "",
    website: "",
    address_line1: "",
    city: "",
    postcode: "",
    country: "United Kingdom",
    invoice_prefix: "INV",
    default_payment_terms_days: "30",
    default_notes: "",
    bank_name: "",
    bank_account_name: "",
    bank_account_number: "",
    bank_sort_code: "",
  });

  useEffect(() => {
    api
      .get<Company | null>("/profile/company")
      .then((c) => {
        if (c) {
          setCompany(c);
          setCompanyForm({
            name: c.name || "",
            legal_name: c.legal_name || "",
            vat_number: c.vat_number || "",
            tax_id: c.tax_id || "",
            email: c.email || "",
            phone: c.phone || "",
            website: c.website || "",
            address_line1: c.address_line1 || "",
            city: c.city || "",
            postcode: c.postcode || "",
            country: c.country || "United Kingdom",
            invoice_prefix: c.invoice_prefix || "INV",
            default_payment_terms_days: String(
              c.default_payment_terms_days || 30
            ),
            default_notes: c.default_notes || "",
            bank_name: c.bank_name || "",
            bank_account_name: c.bank_account_name || "",
            bank_account_number: c.bank_account_number || "",
            bank_sort_code: c.bank_sort_code || "",
          });
        }
      })
      .catch(() => {});
  }, []);

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/profile/me", profile);
      flash("Profile updated");
    } catch {
      // handle
    } finally {
      setSaving(false);
    }
  };

  const saveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...companyForm,
        default_payment_terms_days:
          parseInt(companyForm.default_payment_terms_days) || 30,
      };
      if (company) {
        await api.put("/profile/company", data);
      } else {
        await api.post("/profile/company", data);
      }
      flash("Company profile saved");
    } catch {
      // handle
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { key: "profile" as const, label: "Profile" },
    { key: "company" as const, label: "Company" },
  ];

  const inputClass =
    "w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2.5 text-sm focus:border-petrol-mid focus:outline-none";

  return (
    <div className="mx-auto max-w-3xl">
      {success && (
        <div className="mb-6 rounded-[var(--radius-input)] bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-white p-1 shadow-[var(--shadow-card)] w-fit mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-petrol-dark text-white"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-light"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <form
          onSubmit={saveProfile}
          className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)] space-y-5"
        >
          <h2 className="text-base font-semibold text-text-primary">
            Personal Details
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                First name
              </label>
              <input
                type="text"
                value={profile.first_name}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, first_name: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Last name
              </label>
              <input
                type="text"
                value={profile.last_name}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, last_name: e.target.value }))
                }
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Phone
            </label>
            <input
              type="text"
              value={profile.phone}
              onChange={(e) =>
                setProfile((p) => ({ ...p, phone: e.target.value }))
              }
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Language
              </label>
              <select
                value={profile.language}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, language: e.target.value }))
                }
                className={`${inputClass} bg-white`}
              >
                <option value="en-GB">English (UK)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Currency
              </label>
              <select
                value={profile.currency}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, currency: e.target.value }))
                }
                className={`${inputClass} bg-white`}
              >
                <option value="GBP">GBP (£)</option>
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-[var(--radius-button)] bg-petrol-dark px-5 py-2.5 text-sm font-semibold text-white hover:bg-petrol-mid disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      )}

      {/* Company Tab */}
      {activeTab === "company" && (
        <form
          onSubmit={saveCompany}
          className="space-y-6"
        >
          <div className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)] space-y-5">
            <h2 className="text-base font-semibold text-text-primary">
              Business Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Company name *
                </label>
                <input
                  type="text"
                  value={companyForm.name}
                  onChange={(e) =>
                    setCompanyForm((f) => ({ ...f, name: e.target.value }))
                  }
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Legal name
                </label>
                <input
                  type="text"
                  value={companyForm.legal_name}
                  onChange={(e) =>
                    setCompanyForm((f) => ({ ...f, legal_name: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  VAT number
                </label>
                <input
                  type="text"
                  value={companyForm.vat_number}
                  onChange={(e) =>
                    setCompanyForm((f) => ({ ...f, vat_number: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={companyForm.email}
                  onChange={(e) =>
                    setCompanyForm((f) => ({ ...f, email: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={companyForm.phone}
                  onChange={(e) =>
                    setCompanyForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Address
              </label>
              <input
                type="text"
                value={companyForm.address_line1}
                onChange={(e) =>
                  setCompanyForm((f) => ({
                    ...f,
                    address_line1: e.target.value,
                  }))
                }
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="City"
                value={companyForm.city}
                onChange={(e) =>
                  setCompanyForm((f) => ({ ...f, city: e.target.value }))
                }
                className={inputClass}
              />
              <input
                type="text"
                placeholder="Postcode"
                value={companyForm.postcode}
                onChange={(e) =>
                  setCompanyForm((f) => ({ ...f, postcode: e.target.value }))
                }
                className={inputClass}
              />
              <input
                type="text"
                placeholder="Country"
                value={companyForm.country}
                onChange={(e) =>
                  setCompanyForm((f) => ({ ...f, country: e.target.value }))
                }
                className={inputClass}
              />
            </div>
          </div>

          <div className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)] space-y-5">
            <h2 className="text-base font-semibold text-text-primary">
              Invoice Settings
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Invoice prefix
                </label>
                <input
                  type="text"
                  value={companyForm.invoice_prefix}
                  onChange={(e) =>
                    setCompanyForm((f) => ({
                      ...f,
                      invoice_prefix: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Payment terms (days)
                </label>
                <input
                  type="number"
                  value={companyForm.default_payment_terms_days}
                  onChange={(e) =>
                    setCompanyForm((f) => ({
                      ...f,
                      default_payment_terms_days: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Default invoice notes
              </label>
              <textarea
                value={companyForm.default_notes}
                onChange={(e) =>
                  setCompanyForm((f) => ({
                    ...f,
                    default_notes: e.target.value,
                  }))
                }
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>

          <div className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)] space-y-5">
            <h2 className="text-base font-semibold text-text-primary">
              Bank Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Bank name</label>
                <input type="text" value={companyForm.bank_name} onChange={(e) => setCompanyForm((f) => ({ ...f, bank_name: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Account name</label>
                <input type="text" value={companyForm.bank_account_name} onChange={(e) => setCompanyForm((f) => ({ ...f, bank_account_name: e.target.value }))} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Account number</label>
                <input type="text" value={companyForm.bank_account_number} onChange={(e) => setCompanyForm((f) => ({ ...f, bank_account_number: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Sort code</label>
                <input type="text" value={companyForm.bank_sort_code} onChange={(e) => setCompanyForm((f) => ({ ...f, bank_sort_code: e.target.value }))} className={inputClass} />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-[var(--radius-button)] bg-petrol-dark px-5 py-2.5 text-sm font-semibold text-white hover:bg-petrol-mid disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save Company Profile"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
