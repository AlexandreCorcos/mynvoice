"use client";

import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/invoices": "Invoices",
  "/clients": "Clients",
  "/expenses": "Expenses",
  "/settings": "Settings",
  "/admin": "Admin Panel",
  "/support": "Support MYNVOICE",
};

function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/invoices/new")) return "New Invoice";
  if (pathname.startsWith("/invoices/")) return "Invoice Details";
  return pageTitles[pathname] || "MYNVOICE";
}

export default function Topbar() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 lg:px-8">
      <h1 className="text-xl font-semibold text-text-primary lg:ml-0 ml-12">
        {title}
      </h1>
      <button
        onClick={toggleTheme}
        className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-button)] text-text-secondary transition-colors hover:bg-surface-light hover:text-text-primary"
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
