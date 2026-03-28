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
      return "bg-red-50 text-coral";
    default:
      return "bg-gray-100 text-gray-600";
  }
}
