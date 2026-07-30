"use client";

/* =========================================================================
   Sidebar.

   Graphite in both themes, so everything on it is styled against fixed
   white/brass-on-dark values rather than theme tokens.

   The active state is a single pill that slides between items via a shared
   `layoutId` — one object moving, rather than one box switching off and
   another switching on. That's the difference between "an app" and "a nice
   app", and it costs one prop.
   ========================================================================= */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  BarChart3,
  CreditCard,
  FileText,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Plus,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { EASE_OUT } from "@/components/motion";
import { Logo, LogoMark } from "@/components/brand/logo";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };

/* Grouped, because eight flat links is a list and three groups is a map. */
const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Money in",
    items: [
      { href: "/invoices", label: "Invoices", icon: FileText },
      { href: "/payments", label: "Payments", icon: CreditCard },
      { href: "/clients", label: "Clients", icon: Users },
      { href: "/items", label: "Items & Services", icon: Package },
    ],
  },
  {
    title: "Money out",
    items: [{ href: "/expenses", label: "Expenses", icon: Wallet }],
  },
  {
    title: "Insight",
    items: [
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  active,
  onNavigate,
  scope,
  tone = "default",
}: {
  item: NavItem;
  active: boolean;
  onNavigate: () => void;
  /** The rail and the mobile sheet are mounted at the same time, so the
      sliding pill needs a layoutId per instance or they fight over it. */
  scope: string;
  tone?: "default" | "brass";
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13.5px] font-medium transition-colors duration-200",
        active
          ? tone === "brass"
            ? "text-brass-on-dark"
            : "text-white"
          : "text-white/55 hover:text-white"
      )}
    >
      {active ? (
        <motion.span
          layoutId={`sidebar-active-${scope}`}
          transition={{ type: "spring", stiffness: 420, damping: 38 }}
          className="absolute inset-0 -z-10 rounded-[10px] bg-white/[0.09] ring-1 ring-white/[0.07]"
        />
      ) : (
        <span className="absolute inset-0 -z-10 rounded-[10px] opacity-0 transition-opacity duration-200 hover:opacity-100 hover:bg-white/[0.05]" />
      )}

      {/* brass tick on the active item — the one flash of colour in here */}
      <span
        className={cn(
          "absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-brass-on-dark transition-all duration-300",
          active ? "opacity-100" : "opacity-0"
        )}
      />

      <item.icon className="h-[17px] w-[17px] flex-none" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  /* Close the sheet on navigation — otherwise it hangs around over the page. */
  useEffect(() => setMobileOpen(false), [pathname]);

  const groups = user?.is_admin
    ? [
        ...GROUPS,
        {
          title: "Admin",
          items: [{ href: "/sys/ctrl", label: "Control panel", icon: ShieldCheck }],
        },
      ]
    : GROUPS;

  const close = () => setMobileOpen(false);

  const body = (scope: string) => (
    <div className="flex h-full flex-col">
      {/* brand */}
      <div className="flex items-center gap-2.5 px-5 pb-4 pt-5">
        <LogoMark size={32} />
        <span className="flex flex-col">
          <Logo variant="white" height={20} href={null} />
          <span className="mt-1 text-[10px] leading-none text-white/30">
            v{process.env.NEXT_PUBLIC_APP_VERSION}
          </span>
        </span>
      </div>

      {/* the one action that matters */}
      <div className="px-3 pb-3">
        <Link
          href="/invoices/new"
          onClick={close}
          className="group flex items-center justify-center gap-2 rounded-[10px] bg-white px-3 py-2.5 text-[13px] font-semibold text-graphite transition-colors duration-200 hover:bg-brass-on-dark"
        >
          <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
          New invoice
        </Link>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/25">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isActive(pathname, item.href)}
                  onNavigate={close}
                  scope={scope}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 pb-2">
        <NavLink
          item={{ href: "/support", label: "Support us", icon: Heart }}
          active={isActive(pathname, "/support")}
          onNavigate={close}
          scope={scope}
          tone="brass"
        />
      </div>

      {/* who you are */}
      <div className="border-t border-white/[0.07] p-3">
        <div className="flex items-center gap-3 rounded-[10px] px-2 py-1.5">
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-brass text-[11px] font-bold text-white">
            {user?.first_name?.[0]}
            {user?.last_name?.[0]}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-white">
              {user?.first_name} {user?.last_name}
            </span>
            <span className="block truncate text-[11px] text-white/40">
              {user?.email}
            </span>
          </span>
          <button
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
            className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-white/35 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* mobile trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        className="fixed left-4 top-3.5 z-50 flex h-9 w-9 items-center justify-center rounded-[10px] bg-graphite text-white shadow-[var(--shadow-dropdown)] lg:hidden"
      >
        <Menu className="h-4.5 w-4.5" />
      </button>

      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={close}
              className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
              className="fixed left-0 top-0 z-50 h-dvh w-[268px] bg-graphite lg:hidden"
            >
              <button
                onClick={close}
                aria-label="Close navigation"
                className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
              {body("sheet")}
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      {/* desktop rail */}
      <aside className="fixed left-0 top-0 z-40 hidden h-dvh w-64 border-r border-white/[0.06] bg-graphite lg:block">
        {body("rail")}
      </aside>
    </>
  );
}
