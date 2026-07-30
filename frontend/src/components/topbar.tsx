"use client";

import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/invoices": "Invoices",
  "/clients": "Clients",
  "/items": "Items & Services",
  "/payments": "Payments Received",
  "/expenses": "Expenses",
  "/settings": "Settings",
  "/reports": "Reports",
  "/admin": "Admin Panel",
  "/support": "Support MYNVOICE",
};

function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/invoices/new")) return "New Invoice";
  if (pathname.endsWith("/edit")) return "Edit Invoice";
  if (pathname.startsWith("/invoices/")) return "Invoice Details";
  return pageTitles[pathname] || "MYNVOICE";
}

export default function Topbar() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 dark:border-white/10 bg-white dark:bg-graphite px-6 lg:px-8">
      <h1 className="text-xl font-semibold text-ink lg:ml-0 ml-12">
        {title}
      </h1>
      <button
        onClick={toggleTheme}
        className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-button)] text-ink-muted transition-colors hover:bg-surface hover:text-ink"
        title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      >
        {theme === "light" ? (
          <Moon className="h-[18px] w-[18px]" />
        ) : (
          <Sun className="h-[18px] w-[18px]" />
        )}
      </button>
    </header>
  );
}
