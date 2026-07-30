import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
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
