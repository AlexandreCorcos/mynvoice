import enGB from "./locales/en-GB.json";

type Translations = typeof enGB;

const locales: Record<string, Translations> = {
  "en-GB": enGB,
};

let currentLocale = "en-GB";

export function setLocale(locale: string) {
  if (locales[locale]) {
    currentLocale = locale;
  }
}

export function getLocale(): string {
  return currentLocale;
}

/**
 * Get a translation by dot-separated key path.
 * Supports simple {variable} interpolation.
 *
 * Usage:
 *   t("auth.signIn")           => "Sign in"
 *   t("dashboard.invoicesPending", { count: 3 }) => "3 invoices pending"
 */
export function t(
  key: string,
  params?: Record<string, string | number>
): string {
  const keys = key.split(".");
  let value: unknown = locales[currentLocale];

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return key; // fallback to key if not found
    }
  }

  if (typeof value !== "string") return key;

  if (params) {
    return value.replace(/\{(\w+)\}/g, (_, k) =>
      params[k] !== undefined ? String(params[k]) : `{${k}}`
    );
  }

  return value;
}

export function getAvailableLocales(): string[] {
  return Object.keys(locales);
}
