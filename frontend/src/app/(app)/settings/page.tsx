"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import Toast from "@/components/ui/toast";
import type { ToastType } from "@/components/ui/toast";
import { Upload, X as XIcon, Image as ImageIcon } from "lucide-react";
import type { Company } from "@/types";

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "business">("profile");
  const [company, setCompany] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Profile form
  const [profile, setProfile] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    phone: user?.phone || "",
    language: user?.language || "en-GB",
    currency: user?.currency || "GBP",
  });

  // Keep profile form in sync when user data loads/changes
  useEffect(() => {
    if (user) {
      setProfile({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        phone: user.phone || "",
        language: user.language || "en-GB",
        currency: user.currency || "GBP",
      });
    }
  }, [user]);

  // Company / Business form
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
    use_year_in_number: false,
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
            use_year_in_number: c.use_year_in_number ?? false,
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

  const flash = (msg: string, type: ToastType = "success") => {
    setToast({ message: msg, type });
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/profile/me", profile);
      await refreshUser();
      flash("Profile updated successfully.");
    } catch {
      flash("Failed to save profile.", "error");
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
        const updated = await api.put<Company>("/profile/company", data);
        setCompany(updated);
      } else {
        const created = await api.post<Company>("/profile/company", data);
        setCompany(created);
      }
      flash("Business profile saved successfully.");
    } catch {
      flash("Failed to save business profile.", "error");
    } finally {
      setSaving(false);
    }
  };

  const compressImage = (file: File, maxPx = 800, quality = 0.85): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Compression failed")), "image/jpeg", quality);
      };
      img.onerror = reject;
      img.src = url;
    });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      flash("Please select an image file.", "error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      flash("Image must be under 10MB.", "error");
      return;
    }

    setUploadingLogo(true);
    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append("file", compressed, "logo.jpg");
      const result = await api.upload<{ logo_url: string }>("/profile/company/logo", formData);
      setLogoPreview(result.logo_url);
      if (company) {
        setCompany({ ...company, logo_url: result.logo_url });
      }
      flash("Logo uploaded successfully.");
    } catch {
      flash("Failed to upload logo.", "error");
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleLogoRemove = async () => {
    try {
      await api.delete("/profile/company/logo");
      setLogoPreview(null);
      if (company) {
        setCompany({ ...company, logo_url: null });
      }
      flash("Logo removed.");
    } catch {
      flash("Failed to remove logo.", "error");
    }
  };

  const tabs = [
    { key: "profile" as const, label: "Profile" },
    { key: "business" as const, label: "Your Business" },
  ];

  const inputClass =
    "w-full rounded-[var(--radius-input)] border border-gray-300 px-3 py-2.5 text-sm focus:border-petrol-mid focus:outline-none";

  const currentLogo = logoPreview || company?.logo_url;

  return (
    <div className="mx-auto max-w-3xl">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
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
                <option value="GBP">GBP ({"\u00A3"})</option>
                <option value="EUR">EUR ({"\u20AC"})</option>
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

      {/* Your Business Tab */}
      {activeTab === "business" && (
        <form onSubmit={saveCompany} className="space-y-6">
          {/* Business Information */}
          <div className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)] space-y-5">
            <h2 className="text-base font-semibold text-text-primary">
              Business Information
            </h2>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Business Logo
              </label>
              <div className="flex items-center gap-4">
                {currentLogo ? (
                  <div className="relative group">
                    <img
                      src={currentLogo}
                      alt="Business logo"
                      className="h-20 w-20 rounded-xl object-contain border border-gray-200 bg-gray-50 p-1"
                    />
                    <button
                      type="button"
                      onClick={handleLogoRemove}
                      className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50">
                    <ImageIcon className="h-8 w-8 text-gray-300" />
                  </div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="inline-flex items-center gap-2 rounded-[var(--radius-button)] border border-gray-300 px-3 py-2 text-sm font-medium text-text-primary hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    {uploadingLogo ? "Uploading..." : currentLogo ? "Change Logo" : "Upload Logo"}
                  </button>
                  <p className="mt-1 text-xs text-text-secondary">
                    PNG, JPG up to 5MB. Will appear on invoices.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Business name *
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
                    setCompanyForm((f) => ({
                      ...f,
                      legal_name: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  VAT number
                </label>
                <input
                  type="text"
                  value={companyForm.vat_number}
                  onChange={(e) =>
                    setCompanyForm((f) => ({
                      ...f,
                      vat_number: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Tax ID
                </label>
                <input
                  type="text"
                  value={companyForm.tax_id}
                  onChange={(e) =>
                    setCompanyForm((f) => ({ ...f, tax_id: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
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
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Website
                </label>
                <input
                  type="text"
                  value={companyForm.website}
                  onChange={(e) =>
                    setCompanyForm((f) => ({ ...f, website: e.target.value }))
                  }
                  placeholder="https://"
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
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={companyForm.city}
                  onChange={(e) =>
                    setCompanyForm((f) => ({ ...f, city: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Postcode
                </label>
                <input
                  type="text"
                  value={companyForm.postcode}
                  onChange={(e) =>
                    setCompanyForm((f) => ({ ...f, postcode: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={companyForm.country}
                  onChange={(e) =>
                    setCompanyForm((f) => ({ ...f, country: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Default Invoice Settings */}
          <div className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)] space-y-5">
            <div>
              <h2 className="text-base font-semibold text-text-primary">
                Default Invoice Settings
              </h2>
              <p className="mt-1 text-xs text-text-secondary">
                These are defaults. You can override per client.
              </p>
            </div>
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

            {/* Year in invoice number toggle */}
            <div className="flex items-start gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={companyForm.use_year_in_number}
                onClick={() =>
                  setCompanyForm((f) => ({
                    ...f,
                    use_year_in_number: !f.use_year_in_number,
                  }))
                }
                className={`relative mt-0.5 inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  companyForm.use_year_in_number
                    ? "bg-petrol-dark"
                    : "bg-gray-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    companyForm.use_year_in_number
                      ? "translate-x-5"
                      : "translate-x-0"
                  }`}
                />
              </button>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Include year in invoice numbers
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  e.g. INV-26-00001 instead of INV-00001
                </p>
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
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>

          {/* Bank Details */}
          <div className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)] space-y-5">
            <h2 className="text-base font-semibold text-text-primary">
              Bank Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Bank name
                </label>
                <input
                  type="text"
                  value={companyForm.bank_name}
                  onChange={(e) =>
                    setCompanyForm((f) => ({
                      ...f,
                      bank_name: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Account name
                </label>
                <input
                  type="text"
                  value={companyForm.bank_account_name}
                  onChange={(e) =>
                    setCompanyForm((f) => ({
                      ...f,
                      bank_account_name: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Account number
                </label>
                <input
                  type="text"
                  value={companyForm.bank_account_number}
                  onChange={(e) =>
                    setCompanyForm((f) => ({
                      ...f,
                      bank_account_number: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Sort code
                </label>
                <input
                  type="text"
                  value={companyForm.bank_sort_code}
                  onChange={(e) =>
                    setCompanyForm((f) => ({
                      ...f,
                      bank_sort_code: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-[var(--radius-button)] bg-petrol-dark px-5 py-2.5 text-sm font-semibold text-white hover:bg-petrol-mid disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save Business Profile"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
