import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * The API serialises every money column as a string ("840.00"), while the
 * TypeScript types call them numbers. Left alone that turns `a + b` into
 * string concatenation and `x > 0` into a NaN comparison, so totals come
 * out wrong or vanish entirely.
 *
 * Run anything numeric coming off the wire through here before doing
 * arithmetic or comparisons with it.
 */
export function num(value: number | string | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function formatCurrency(amount: number, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Short form for chart axes and tight cells: £4.2k, £1.3M.
 * Below 1,000 it falls back to the full format — "£840" is no longer than
 * "£0.8k" and reads better.
 */
export function formatCompactCurrency(amount: number, currency = "GBP"): string {
  const symbol = currencySymbol(currency);
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(1)}k`;
  return `${sign}${symbol}${Math.round(abs)}`;
}

/**
 * Quantities come back as decimals, so a plain "1" renders as "1.00".
 * Whole numbers lose the decimals; fractional ones keep only what they need.
 */
export function formatQuantity(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : String(parseFloat(value.toFixed(4)));
}

/**
 * Trend buckets arrive as "2026-07", which is not a chart axis label.
 * Anything that isn't a YYYY-MM is passed through untouched, so quarter
 * and year buckets keep whatever the API called them.
 */
export function formatPeriodLabel(period: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return period;
  const [, year, month] = match;
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-GB", { month: "short" });
}

export function currencySymbol(currency = "GBP"): string {
  switch (currency) {
    case "EUR":
      return "€";
    case "USD":
      return "$";
    default:
      return "£";
  }
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function getStatusColour(status: string): string {
  switch (status) {
    case "draft":
      return "bg-gray-100 text-gray-600";
    case "sent":
      return "bg-blue-50 text-blue-600";
    case "paid":
      return "bg-emerald-50 text-emerald-600";
    case "overdue":
      return "bg-red-50 text-negative";
    default:
      return "bg-gray-100 text-gray-600";
  }
}
