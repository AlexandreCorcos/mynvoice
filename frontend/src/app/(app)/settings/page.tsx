"use client";

/* =========================================================================
   Settings.

   Split three ways rather than two, because "Business" was carrying the
   company's identity, its address, its invoice numbering and its bank
   details in one scroll:

     You        — the person signed in
     Business   — identity, contact, address, logo
     Invoicing  — numbering, terms, default notes, bank details

   Business and Invoicing both save the same company record, so either
   save button commits the whole form. Splitting the *view* doesn't need
   to mean splitting the request.
   ========================================================================= */

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { EASE_OUT } from "@/components/motion";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/app/button";
import { Panel, PanelHeader } from "@/components/app/panel";
import { Field, Input, Select, Textarea, Toggle } from "@/components/app/form";
import { SegmentedControl } from "@/components/app/segmented-control";
import Toast, { type ToastType } from "@/components/ui/toast";
import { useCompanyLogo } from "@/hooks/useCompanyLogo";
import { previewInvoiceNumber } from "@/lib/utils";
import type { Company } from "@/types";

type Tab = "you" | "business" | "invoicing";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Shrink before upload — a 12MP phone photo as a logo helps nobody. */
function compressImage(file: File, maxPx = 800, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("No canvas context"));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
        "image/jpeg",
        quality
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function SettingsPage() {
  const { user, refreshUser, refreshCompany } = useAuth();
  const [tab, setTab] = useState<Tab>("you");
  const [company, setCompany] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  /* The stored URL is not fetchable by the browser - the bucket is
     private - so the preview comes through the API. */
  const logoSrc = useCompanyLogo(logoUrl);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    language: "en-GB",
    currency: "GBP",
  });

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
    number_separator: "-",
    number_padding: "5",
    default_payment_terms_days: "30",
    default_notes: "",
    bank_name: "",
    bank_account_name: "",
    bank_account_number: "",
    bank_sort_code: "",
  });

  useEffect(() => {
    if (!user) return;
    setProfile({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      phone: user.phone || "",
      language: user.language || "en-GB",
      currency: user.currency || "GBP",
    });
  }, [user]);

  useEffect(() => {
    api
      .get<Company | null>("/profile/company")
      .then((c) => {
        if (!c) return;
        setCompany(c);
        setLogoUrl(c.logo_url ?? null);
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
          number_separator: c.number_separator ?? "-",
          number_padding: String(c.number_padding ?? 5),
          default_payment_terms_days: String(c.default_payment_terms_days || 30),
          default_notes: c.default_notes || "",
          bank_name: c.bank_name || "",
          bank_account_name: c.bank_account_name || "",
          bank_account_number: c.bank_account_number || "",
          bank_sort_code: c.bank_sort_code || "",
        });
      })
      .catch(() => {
        /* no company yet — the form creates one on first save */
      });
  }, []);

  const flash = (message: string, type: ToastType = "success") =>
    setToast({ message, type });

  const setC = (patch: Partial<typeof companyForm>) =>
    setCompanyForm((f) => ({ ...f, ...patch }));

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/profile/me", profile);
      await refreshUser();
      flash("Your details are saved.");
    } catch {
      flash("Couldn't save your details.", "error");
    } finally {
      setSaving(false);
    }
  };

  const saveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...companyForm,
        default_payment_terms_days:
          parseInt(companyForm.default_payment_terms_days, 10) || 30,
        number_padding: parseInt(companyForm.number_padding, 10) || 5,
      };
      const saved = company
        ? await api.put<Company>("/profile/company", payload)
        : await api.post<Company>("/profile/company", payload);
      setCompany(saved);
      refreshCompany(); // the sidebar reads the name and logo from the context
      flash("Business details are saved.");
    } catch {
      flash("Couldn't save your business details.", "error");
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      flash("That needs to be an image file.", "error");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      flash("Images need to be under 10MB.", "error");
      return;
    }

    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const body = new FormData();
      body.append("file", new File([compressed], "logo.jpg", { type: "image/jpeg" }));
      const result = await api.upload<{ logo_url: string }>(
        "/profile/company/logo",
        body
      );
      setLogoUrl(result.logo_url);
      if (company) setCompany({ ...company, logo_url: result.logo_url });
      refreshCompany(); // the sidebar shows this logo
      flash("Logo uploaded.");
    } catch {
      flash("Couldn't upload that logo.", "error");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const removeLogo = async () => {
    try {
      await api.delete("/profile/company/logo");
      setLogoUrl(null);
      if (company) setCompany({ ...company, logo_url: null });
      refreshCompany();
      flash("Logo removed.");
    } catch {
      flash("Couldn't remove the logo.", "error");
    }
  };

  const saveButton = (
    <Button type="submit" variant="primary" disabled={saving}>
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {saving ? "Saving…" : "Save changes"}
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="How MYNVOICE knows you."
        subtitle="Your details, your business, and the defaults every invoice inherits."
      />

      <SegmentedControl<Tab>
        layoutId="settings-tab"
        value={tab}
        onChange={setTab}
        options={[
          { value: "you", label: "You" },
          { value: "business", label: "Business" },
          { value: "invoicing", label: "Invoicing" },
        ]}
      />

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
      >
        {/* ── You ────────────────────────────────────────────────── */}
        {tab === "you" ? (
          <form onSubmit={saveProfile} className="max-w-2xl space-y-4">
            <Panel>
              <PanelHeader
                title="Your details"
                caption="Shown on invoices you send and used to sign you in"
              />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="First name">
                  <Input
                    value={profile.first_name}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, first_name: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Last name">
                  <Input
                    value={profile.last_name}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, last_name: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Email" hint="Contact support to change your sign-in email.">
                  <Input value={user?.email ?? ""} disabled />
                </Field>
                <Field label="Phone">
                  <Input
                    value={profile.phone}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, phone: e.target.value }))
                    }
                  />
                </Field>
              </div>
            </Panel>

            <Panel>
              <PanelHeader title="Preferences" caption="Applied across the app" />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Language">
                  <Select
                    value={profile.language}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, language: e.target.value }))
                    }
                  >
                    <option value="en-GB">English (UK)</option>
                  </Select>
                </Field>
                <Field label="Default currency" hint="New invoices start here.">
                  <Select
                    value={profile.currency}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, currency: e.target.value }))
                    }
                  >
                    <option value="GBP">GBP (£)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                  </Select>
                </Field>
              </div>
            </Panel>

            <div className="flex justify-end">{saveButton}</div>
          </form>
        ) : null}

        {/* ── Business ───────────────────────────────────────────── */}
        {tab === "business" ? (
          <form onSubmit={saveCompany} className="max-w-3xl space-y-4">
            <Panel>
              <PanelHeader
                title="Logo"
                caption="Appears at the top of every PDF you send"
              />
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <span className="flex h-20 w-20 flex-none items-center justify-center overflow-hidden rounded-[14px] bg-elevated ring-1 ring-line">
                  {logoSrc ? (
                    /* A plain <img>: the source is an object URL built from
                       bytes the API streamed back, so there is no host for
                       next/image to optimise or allow-list. */
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoSrc}
                      alt="Company logo"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-ink-muted" />
                  )}
                </span>

                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/*"
                    onChange={uploadLogo}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={uploading}
                    onClick={() => fileInput.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {uploading ? "Uploading…" : logoUrl ? "Replace" : "Upload logo"}
                  </Button>
                  {logoUrl ? (
                    <Button type="button" variant="ghost" onClick={removeLogo}>
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  ) : null}
                  <p className="w-full text-[11.5px] text-ink-muted">
                    PNG or JPG, up to 10MB. Resized to 800px before upload.
                  </p>
                </div>
              </div>
            </Panel>

            <Panel>
              <PanelHeader title="Identity" caption="How your business is named on paper" />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Trading name" required>
                  <Input
                    required
                    value={companyForm.name}
                    onChange={(e) => setC({ name: e.target.value })}
                    placeholder="Corcos Studio"
                  />
                </Field>
                <Field label="Legal name" hint="If it differs from your trading name.">
                  <Input
                    value={companyForm.legal_name}
                    onChange={(e) => setC({ legal_name: e.target.value })}
                  />
                </Field>
                <Field label="VAT number">
                  <Input
                    value={companyForm.vat_number}
                    onChange={(e) => setC({ vat_number: e.target.value })}
                  />
                </Field>
                <Field label="Tax / company number">
                  <Input
                    value={companyForm.tax_id}
                    onChange={(e) => setC({ tax_id: e.target.value })}
                  />
                </Field>
              </div>
            </Panel>

            <Panel>
              <PanelHeader title="Contact & address" caption="Printed on every invoice" />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Email">
                  <Input
                    type="email"
                    value={companyForm.email}
                    onChange={(e) => setC({ email: e.target.value })}
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    value={companyForm.phone}
                    onChange={(e) => setC({ phone: e.target.value })}
                  />
                </Field>
                <Field label="Website" className="sm:col-span-2">
                  <Input
                    value={companyForm.website}
                    onChange={(e) => setC({ website: e.target.value })}
                    placeholder="https://"
                  />
                </Field>
                <Field label="Address" className="sm:col-span-2">
                  <Input
                    value={companyForm.address_line1}
                    onChange={(e) => setC({ address_line1: e.target.value })}
                  />
                </Field>
                <Field label="City">
                  <Input
                    value={companyForm.city}
                    onChange={(e) => setC({ city: e.target.value })}
                  />
                </Field>
                <Field label="Postcode">
                  <Input
                    value={companyForm.postcode}
                    onChange={(e) => setC({ postcode: e.target.value })}
                  />
                </Field>
                <Field label="Country" className="sm:col-span-2">
                  <Input
                    value={companyForm.country}
                    onChange={(e) => setC({ country: e.target.value })}
                  />
                </Field>
              </div>
            </Panel>

            <div className="flex justify-end">{saveButton}</div>
          </form>
        ) : null}

        {/* ── Invoicing ──────────────────────────────────────────── */}
        {tab === "invoicing" ? (
          <form onSubmit={saveCompany} className="max-w-3xl space-y-4">
            <Panel>
              <PanelHeader
                title="Numbering & terms"
                caption="What every new invoice starts with"
              />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Invoice prefix">
                  <Input
                    value={companyForm.invoice_prefix}
                    onChange={(e) => setC({ invoice_prefix: e.target.value })}
                    placeholder="INV"
                  />
                </Field>
                <Field
                  label="Separator"
                  hint="Leave empty to run the prefix straight into the digits."
                >
                  <Input
                    value={companyForm.number_separator}
                    onChange={(e) => setC({ number_separator: e.target.value })}
                    placeholder="-"
                    maxLength={5}
                  />
                </Field>
                <Field label="Digits">
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={companyForm.number_padding}
                    onChange={(e) => setC({ number_padding: e.target.value })}
                    className="tabular-nums"
                  />
                </Field>
                <Field label="Payment terms (days)">
                  <Input
                    type="number"
                    min="0"
                    value={companyForm.default_payment_terms_days}
                    onChange={(e) => setC({ default_payment_terms_days: e.target.value })}
                    className="tabular-nums"
                  />
                </Field>
              </div>

              <div className="mt-4 rounded-[12px] bg-elevated/50 p-3">
                <Toggle
                  checked={companyForm.use_year_in_number}
                  onChange={(v) => setC({ use_year_in_number: v })}
                  label="Include the year in invoice numbers"
                  hint={`Numbers look like ${previewInvoiceNumber(
                    companyForm.invoice_prefix || "INV",
                    companyForm.number_separator,
                    parseInt(companyForm.number_padding, 10),
                    companyForm.use_year_in_number
                  )}`}
                />
              </div>

              <div className="mt-4">
                <Field
                  label="Default invoice notes"
                  hint="Pre-filled on every new invoice — you can still change it per invoice."
                >
                  <Textarea
                    rows={3}
                    value={companyForm.default_notes}
                    onChange={(e) => setC({ default_notes: e.target.value })}
                    placeholder="Thanks for your business."
                  />
                </Field>
              </div>
            </Panel>

            <Panel>
              <PanelHeader
                title="Bank details"
                caption="Printed on invoices so clients know where to pay"
              />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Bank name">
                  <Input
                    value={companyForm.bank_name}
                    onChange={(e) => setC({ bank_name: e.target.value })}
                  />
                </Field>
                <Field label="Account name">
                  <Input
                    value={companyForm.bank_account_name}
                    onChange={(e) => setC({ bank_account_name: e.target.value })}
                  />
                </Field>
                <Field label="Account number">
                  <Input
                    value={companyForm.bank_account_number}
                    onChange={(e) => setC({ bank_account_number: e.target.value })}
                    className="tabular-nums"
                  />
                </Field>
                <Field label="Sort code">
                  <Input
                    value={companyForm.bank_sort_code}
                    onChange={(e) => setC({ bank_sort_code: e.target.value })}
                    className="tabular-nums"
                  />
                </Field>
              </div>
            </Panel>

            <div className="flex justify-end">{saveButton}</div>
          </form>
        ) : null}
      </motion.div>

      {toast ? (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      ) : null}
    </div>
  );
}
