"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  Rocket,
  CheckCircle,
  Circle,
  ArrowRight,
  X,
} from "lucide-react";

const DISMISSED_KEY = "mynvoice_onboarding_dismissed";

interface ChecklistItem {
  key: string;
  title: string;
  description: string;
  href: string;
  complete: boolean;
}

export function OnboardingChecklist() {
  const [dismissed, setDismissed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ChecklistItem[]>([
    {
      key: "business",
      title: "Set up your business",
      description: "Add your business name, address, and logo",
      href: "/settings?tab=business",
      complete: false,
    },
    {
      key: "client",
      title: "Add your first client",
      description: "Create a client to start invoicing",
      href: "/clients",
      complete: false,
    },
    {
      key: "invoice",
      title: "Create your first invoice",
      description: "Send your first professional invoice",
      href: "/invoices/new",
      complete: false,
    },
  ]);

  useEffect(() => {
    const wasDismissed = localStorage.getItem(DISMISSED_KEY) === "true";
    if (wasDismissed) {
      setDismissed(true);
      setLoading(false);
      return;
    }

    setDismissed(false);

    async function fetchStatus() {
      try {
        const [profileRes, clientsRes, invoicesRes] = await Promise.allSettled([
          api.get<{ name?: string } | null>("/profile/company"),
          api.get<{ items?: unknown[]; results?: unknown[] }>("/clients/?limit=1"),
          api.get<{ items?: unknown[]; results?: unknown[] }>("/invoices/?limit=1"),
        ]);

        const hasBusiness =
          profileRes.status === "fulfilled" &&
          profileRes.value !== null &&
          typeof profileRes.value === "object" &&
          !!(profileRes.value as { name?: string }).name;

        const hasClient =
          clientsRes.status === "fulfilled" &&
          clientsRes.value !== null &&
          typeof clientsRes.value === "object" &&
          (Array.isArray(clientsRes.value)
            ? clientsRes.value.length > 0
            : Array.isArray((clientsRes.value as { items?: unknown[] }).items)
              ? ((clientsRes.value as { items: unknown[] }).items).length > 0
              : Array.isArray((clientsRes.value as { results?: unknown[] }).results)
                ? ((clientsRes.value as { results: unknown[] }).results).length > 0
                : false);

        const hasInvoice =
          invoicesRes.status === "fulfilled" &&
          invoicesRes.value !== null &&
          typeof invoicesRes.value === "object" &&
          (Array.isArray(invoicesRes.value)
            ? invoicesRes.value.length > 0
            : Array.isArray((invoicesRes.value as { items?: unknown[] }).items)
              ? ((invoicesRes.value as { items: unknown[] }).items).length > 0
              : Array.isArray((invoicesRes.value as { results?: unknown[] }).results)
                ? ((invoicesRes.value as { results: unknown[] }).results).length > 0
                : false);

        setItems((prev) =>
          prev.map((item) => {
            if (item.key === "business") return { ...item, complete: hasBusiness };
            if (item.key === "client") return { ...item, complete: hasClient };
            if (item.key === "invoice") return { ...item, complete: hasInvoice };
            return item;
          })
        );

        if (hasBusiness && hasClient && hasInvoice) {
          setDismissed(true);
        }
      } catch {
        // If fetching fails, still show the checklist with defaults
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, []);

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  }

  if (loading || dismissed) return null;

  const completedCount = items.filter((i) => i.complete).length;
  const progressPercent = (completedCount / items.length) * 100;

  return (
    <div className="relative rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
        aria-label="Dismiss getting started checklist"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-[#0F4C5C]/10 dark:bg-[#0F4C5C]/30">
          <Rocket className="h-5 w-5 text-[#0F4C5C] dark:text-teal-400" />
        </div>
        <h2 className="text-lg font-semibold text-[#1B263B] dark:text-white">Getting Started</h2>
      </div>
      <p className="text-sm text-[#5C677D] dark:text-gray-400 mb-4 ml-12">
        Complete these steps to set up your account
      </p>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-[#5C677D] dark:text-gray-400">
            {completedCount} of {items.length} complete
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#0F4C5C] transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Checklist items */}
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.key}
            className="flex items-start gap-3 group"
          >
            {/* Icon */}
            <div className="mt-0.5 flex-shrink-0">
              {item.complete ? (
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              ) : (
                <Circle className="h-5 w-5 text-gray-300 dark:text-gray-600" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p
                className={
                  item.complete
                    ? "text-sm font-medium text-gray-400 dark:text-gray-600 line-through"
                    : "text-sm font-medium text-[#1B263B] dark:text-white"
                }
              >
                {item.title}
              </p>
              <p
                className={
                  item.complete
                    ? "text-xs text-gray-300 dark:text-gray-700 line-through"
                    : "text-xs text-[#5C677D] dark:text-gray-400"
                }
              >
                {item.description}
              </p>
            </div>

            {/* CTA link */}
            {!item.complete && (
              <Link
                href={item.href}
                className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium text-[#2C7A7B] hover:text-[#0F4C5C] dark:text-teal-400 dark:hover:text-teal-300 transition-colors mt-0.5"
              >
                Start
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
