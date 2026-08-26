"use client";

/* =========================================================================
   Topbar.

   Deliberately slim. It carries orientation (where am I?) and the theme
   switch — nothing else. The page's real title, subtitle and actions belong
   to the page, in `PageHeader`, where they can say something specific.
   ========================================================================= */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { EASE_OUT } from "@/components/motion";

const SECTIONS: Record<string, string> = {
  dashboard: "Dashboard",
  invoices: "Invoices",
  clients: "Clients",
  items: "Items & Services",
  payments: "Payments",
  transactions: "Transactions",
  closing: "Closing",
  expenses: "Expenses",
  reports: "Reports",
  settings: "Settings",
  admin: "Admin",
  support: "Support",
};

type Crumb = { label: string; href?: string };

function buildCrumbs(pathname: string): Crumb[] {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return [{ label: "Dashboard" }];

  // The admin panel is two segments deep but is a single destination —
  // "sys › Details" tells nobody anything.
  if (pathname.startsWith("/sys/ctrl")) return [{ label: "Control panel" }];

  const [section, ...rest] = parts;
  const label = SECTIONS[section] ?? section;
  const crumbs: Crumb[] = [{ label, href: rest.length ? `/${section}` : undefined }];

  if (rest.length) {
    const last = rest[rest.length - 1];
    if (last === "new") crumbs.push({ label: "New" });
    else if (last === "edit") crumbs.push({ label: "Edit" });
    else crumbs.push({ label: "Details" });
  }

  return crumbs;
}

export default function Topbar() {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between gap-4 pl-16 pr-4 sm:pr-6 lg:pl-8 lg:pr-8">
        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="flex items-center gap-1.5 text-[13px]">
            {crumbs.map((c, i) => (
              <li key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
                {i > 0 ? (
                  <ChevronRight className="h-3.5 w-3.5 flex-none text-ink-muted/60" />
                ) : null}
                {c.href ? (
                  <Link
                    href={c.href}
                    className="truncate text-ink-muted transition-colors hover:text-ink"
                  >
                    {c.label}
                  </Link>
                ) : (
                  <span className="truncate font-semibold text-ink">{c.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <button
          onClick={toggleTheme}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          className="relative flex h-9 w-9 flex-none items-center justify-center overflow-hidden rounded-[10px] text-ink-muted ring-1 ring-line transition-colors hover:bg-elevated hover:text-ink"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={theme}
              initial={{ y: 14, opacity: 0, rotate: -40 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              exit={{ y: -14, opacity: 0, rotate: 40 }}
              transition={{ duration: 0.28, ease: EASE_OUT }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {dark ? <Sun className="h-[17px] w-[17px]" /> : <Moon className="h-[17px] w-[17px]" />}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>
    </header>
  );
}
