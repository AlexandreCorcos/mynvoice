"use client";

/* =========================================================================
   Admin control panel.

   Lives under the app layout, so it looks like the product rather than a
   terminal emulator, and inherits the same auth guard.

   Access is `is_admin` on the account, granted on the server with
   `python -m app.cli grant-admin <email>`. There is no password to know:
   the previous panel authenticated with an integer derived from the current
   date and hour, which meant anyone could reach it without an account at
   all. Nothing in this repository grants access now.
   ========================================================================= */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  CircleSlash,
  FileText,
  KeyRound,
  Loader2,
  MailCheck,
  Radio,
  ShieldCheck,
  ShieldOff,
  UserPlus,
  Users,
} from "lucide-react";
import { api, apiDetail } from "@/lib/api";
import {
  cn,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  num,
} from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { EASE_OUT } from "@/components/motion";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/app/button";
import { Panel, PanelHeader, Overline } from "@/components/app/panel";
import { MetricCard } from "@/components/app/metric";
import { SearchInput, Field, Input } from "@/components/app/form";
import { SegmentedControl } from "@/components/app/segmented-control";
import { Modal } from "@/components/app/modal";
import { RowMenu, type MenuItem } from "@/components/app/menu";
import {
  StepUpChip,
  StepUpModals,
  useStepUp,
  type StepUpHeaders,
} from "@/components/app/step-up";
import EmptyState from "@/components/ui/empty-state";
import Toast, { type ToastType } from "@/components/ui/toast";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type SysMetrics = {
  total_users: number;
  active_users: number;
  online_now: number;
  new_users_this_month: number;
  total_companies: number;
  total_invoices: number;
  total_invoices_paid: number;
  total_revenue_processed: number;
  total_expenses: number;
  donation_monthly_target: number;
  donation_current_month: number;
  donation_percentage: number;
};

type SysUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  company_name: string | null;
  is_verified: boolean;
  is_active: boolean;
  is_admin: boolean;
  auth_provider: string;
  created_at: string;
  last_login_at: string | null;
  last_seen_at: string | null;
  is_online: boolean;
  invoice_count: number;
  client_count: number;
  expense_count: number;
  revenue: number;
};

type AuditEntry = {
  id: string;
  actor_email: string;
  action: string;
  target_email: string | null;
  detail: string | null;
  created_at: string;
};

type Tab = "people" | "activity" | "donations";
type PeopleFilter = "all" | "online" | "admins" | "attention";

/* `self` marks actions that are always taken on your own account, where
   naming the target again just repeats the actor. */
const ACTION_LABEL: Record<string, { verb: string; self?: boolean }> = {
  verify_user: { verb: "verified" },
  activate_user: { verb: "reactivated" },
  deactivate_user: { verb: "deactivated" },
  grant_admin: { verb: "granted admin to" },
  revoke_admin: { verb: "revoked admin from" },
  send_password_reset: { verb: "sent a password reset to" },
  enable_totp: { verb: "turned on two-factor", self: true },
  disable_totp: { verb: "removed two-factor", self: true },
};

/* ------------------------------------------------------------------ */
/* Bits                                                                */
/* ------------------------------------------------------------------ */

function initials(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

function Chip({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "brass" | "positive" | "negative";
}) {
  const tones = {
    neutral: "bg-elevated text-ink-muted ring-line",
    brass: "bg-brass/[0.09] text-brass-ink ring-brass/15",
    positive: "bg-positive/10 text-positive ring-positive/20",
    negative: "bg-negative/10 text-negative ring-negative/20",
  };
  return (
    <span
      className={cn(
        "inline-flex flex-none items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function SysCtrlPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [metrics, setMetrics] = useState<SysMetrics | null>(null);
  const [users, setUsers] = useState<SysUser[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("people");
  const [filter, setFilter] = useState<PeopleFilter>("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resetting, setResetting] = useState<SysUser | null>(null);
  const [target, setTarget] = useState("");
  const [savingTarget, setSavingTarget] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const stepUp = useStepUp();

  useEffect(() => {
    if (user && !user.is_admin) router.replace("/dashboard");
  }, [user, router]);

  const load = useCallback(async () => {
    if (!user?.is_admin) return;
    try {
      const [m, u, a] = await Promise.all([
        api.get<SysMetrics>("/sys/metrics"),
        api.get<SysUser[]>("/sys/users"),
        api.get<AuditEntry[]>("/sys/audit?limit=60"),
      ]);
      setMetrics(m);
      setUsers(u);
      setAudit(a);
      setTarget(String(num(m.donation_monthly_target)));
    } catch {
      /* the empty states cover it */
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  /* Presence goes stale while you sit here, so refresh it quietly. */
  useEffect(() => {
    if (!user?.is_admin) return;
    const timer = setInterval(() => {
      api
        .get<SysUser[]>("/sys/users")
        .then(setUsers)
        .catch(() => {});
      api
        .get<SysMetrics>("/sys/metrics")
        .then(setMetrics)
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(timer);
  }, [user]);

  const counts = useMemo(
    () => ({
      all: users.length,
      online: users.filter((u) => u.is_online).length,
      admins: users.filter((u) => u.is_admin).length,
      attention: users.filter((u) => !u.is_verified || !u.is_active).length,
    }),
    [users]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === "online" && !u.is_online) return false;
      if (filter === "admins" && !u.is_admin) return false;
      if (filter === "attention" && u.is_verified && u.is_active) return false;
      if (!q) return true;
      return (
        u.email.toLowerCase().includes(q) ||
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
        (u.company_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [users, filter, search]);

  /* Destructive actions go through stepUp.guard: if the server wants a code
     it opens the prompt and replays this same closure once it has one, so
     nothing here has to know that step-up exists. */
  const act = async (target: SysUser, action: string, message: string) => {
    setBusyId(target.id);
    try {
      await stepUp.guard(async (headers: StepUpHeaders) => {
        await api.post(`/sys/users/${target.id}/${action}`, undefined, headers);
        await load();
        setToast({ message, type: "success" });
      });
    } catch (err) {
      setToast({ message: apiDetail(err, "That didn't work."), type: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const sendReset = async () => {
    if (!resetting) return;
    const target = resetting;
    setBusyId(target.id);
    try {
      await stepUp.guard(async (headers: StepUpHeaders) => {
        const res = await api.post<{ ok: boolean; email_sent: boolean }>(
          `/sys/users/${target.id}/send-reset`,
          undefined,
          headers
        );
        setToast({
          message: res.email_sent
            ? `Reset link emailed to ${target.email}.`
            : `Reset link created, but no email went out — SMTP isn't configured.`,
          type: res.email_sent ? "success" : "warning",
        });
        setResetting(null);
        load();
      });
    } catch (err) {
      setToast({
        message: apiDetail(err, "Couldn't create the reset link."),
        type: "error",
      });
    } finally {
      setBusyId(null);
    }
  };

  const saveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTarget(true);
    try {
      await api.put("/admin/donations/config", {
        monthly_target: parseFloat(target) || 0,
      });
      await load();
      setToast({ message: "Monthly target updated.", type: "success" });
    } catch {
      setToast({ message: "Couldn't update the target.", type: "error" });
    } finally {
      setSavingTarget(false);
    }
  };

  if (user && !user.is_admin) return null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-4 w-24 animate-pulse rounded-full bg-elevated" />
        <div className="h-9 w-80 animate-pulse rounded-lg bg-elevated" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[136px] animate-pulse rounded-[16px] bg-elevated" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-[16px] bg-elevated" />
      </div>
    );
  }

  const pct = Math.min(100, Math.round(num(metrics?.donation_percentage)));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Control panel"
        title="Who's using MYNVOICE."
        subtitle="Every account, what they've built with it, and who's here right now."
        actions={<StepUpChip ctl={stepUp} />}
      />

      {/* ── the figures ──────────────────────────────────────────── */}
      {/* Two-up on a phone: four stacked cards would fill the screen before
          you reached a single account. */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MetricCard
          index={0}
          label="Accounts"
          value={num(metrics?.total_users)}
          format={(n) => String(Math.round(n))}
          icon={Users}
          tone="brass"
          caption={`${num(metrics?.active_users)} active in 30 days`}
        />
        <MetricCard
          index={1}
          label="Here right now"
          value={num(metrics?.online_now)}
          format={(n) => String(Math.round(n))}
          icon={Radio}
          tone={num(metrics?.online_now) > 0 ? "positive" : "default"}
          caption="seen in the last 5 minutes"
        />
        <MetricCard
          index={2}
          label="New this month"
          value={num(metrics?.new_users_this_month)}
          format={(n) => String(Math.round(n))}
          icon={UserPlus}
          caption={`${num(metrics?.total_companies)} set up a business`}
        />
        <MetricCard
          index={3}
          label="Invoices created"
          value={num(metrics?.total_invoices)}
          format={(n) => String(Math.round(n))}
          icon={FileText}
          caption={`${num(metrics?.total_invoices_paid)} marked paid`}
        />
      </div>

      <SegmentedControl<Tab>
        layoutId="sys-tab"
        value={tab}
        onChange={setTab}
        options={[
          { value: "people", label: "People", count: counts.all },
          { value: "activity", label: "Admin activity", count: audit.length },
          { value: "donations", label: "Donations" },
        ]}
      />

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: EASE_OUT }}
        className="space-y-4"
      >
        {/* ── People ─────────────────────────────────────────────── */}
        {tab === "people" ? (
          <>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <SegmentedControl<PeopleFilter>
                layoutId="sys-people-filter"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "all", label: "All", count: counts.all },
                  { value: "online", label: "Online", count: counts.online },
                  { value: "admins", label: "Admins", count: counts.admins },
                  { value: "attention", label: "Needs attention", count: counts.attention },
                ]}
              />
              <SearchInput
                placeholder="Search name, email or business…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="lg:w-72"
              />
            </div>

            {visible.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Nobody here"
                description="No account matches that filter."
              />
            ) : (
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {visible.map((u, i) => {
                    const menu: MenuItem[] = [
                      {
                        label: "Send password reset",
                        icon: KeyRound,
                        onSelect: () => setResetting(u),
                      },
                      {
                        label: "Mark verified",
                        icon: MailCheck,
                        onSelect: () => act(u, "verify", `${u.email} is verified.`),
                        show: !u.is_verified,
                      },
                      {
                        label: u.is_admin ? "Revoke admin" : "Make admin",
                        icon: u.is_admin ? ShieldOff : ShieldCheck,
                        onSelect: () =>
                          act(
                            u,
                            "toggle-admin",
                            u.is_admin
                              ? `${u.email} is no longer an admin.`
                              : `${u.email} is now an admin.`
                          ),
                        show: u.id !== user?.id,
                      },
                      {
                        label: u.is_active ? "Deactivate" : "Reactivate",
                        icon: CircleSlash,
                        tone: u.is_active ? "danger" : "default",
                        onSelect: () =>
                          act(
                            u,
                            "toggle-active",
                            u.is_active
                              ? `${u.email} is deactivated.`
                              : `${u.email} is active again.`
                          ),
                        show: u.id !== user?.id,
                      },
                    ];

                    return (
                      <motion.div
                        key={u.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, transition: { duration: 0.15 } }}
                        transition={{
                          duration: 0.4,
                          delay: Math.min(i, 8) * 0.03,
                          ease: EASE_OUT,
                        }}
                        className={cn(
                          "rounded-[14px] bg-card p-4 ring-1 ring-line transition-shadow duration-200 hover:shadow-[var(--shadow-card)]",
                          !u.is_active && "opacity-60"
                        )}
                      >
                        <div className="flex flex-wrap items-start gap-4">
                          {/* identity */}
                          <span className="relative flex-none">
                            <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-brass text-[12px] font-bold text-white">
                              {initials(u.first_name, u.last_name)}
                            </span>
                            {u.is_online ? (
                              <span
                                title="Online now"
                                className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-card"
                              >
                                <span className="h-2.5 w-2.5 rounded-full bg-positive" />
                              </span>
                            ) : null}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="text-[14px] font-bold tracking-[-0.01em] text-ink">
                                {u.first_name} {u.last_name}
                              </span>
                              {u.is_admin ? <Chip tone="brass">Admin</Chip> : null}
                              {!u.is_verified ? <Chip tone="negative">Unverified</Chip> : null}
                              {!u.is_active ? <Chip>Deactivated</Chip> : null}
                              {u.auth_provider !== "email" ? (
                                <Chip>{u.auth_provider}</Chip>
                              ) : null}
                            </span>
                            <span className="mt-0.5 block truncate text-[12.5px] text-ink-muted">
                              {u.email}
                              {u.company_name ? ` · ${u.company_name}` : ""}
                            </span>
                            {/* The count columns are desktop-only, so carry the
                                same figures inline on a phone. */}
                            <span className="mt-1.5 block text-[11.5px] text-ink-muted sm:hidden">
                              {u.invoice_count} invoices · {u.client_count} clients ·{" "}
                              {formatCurrency(num(u.revenue))}
                              {" · "}
                              <span className={u.is_online ? "text-positive" : undefined}>
                                {u.is_online ? "online now" : formatRelativeTime(u.last_seen_at)}
                              </span>
                            </span>
                          </span>

                          {/* what they've built */}
                          <span className="flex flex-none items-center gap-5 text-right">
                            {[
                              { label: "Invoices", value: u.invoice_count },
                              { label: "Clients", value: u.client_count },
                              { label: "Expenses", value: u.expense_count },
                            ].map((s) => (
                              <span key={s.label} className="hidden sm:block">
                                <span className="block text-[15px] font-bold tabular-nums text-ink">
                                  {s.value}
                                </span>
                                <Overline>{s.label}</Overline>
                              </span>
                            ))}
                            <span className="hidden md:block">
                              <span className="block text-[15px] font-bold tabular-nums text-ink">
                                {formatCurrency(num(u.revenue))}
                              </span>
                              <Overline>Collected</Overline>
                            </span>
                          </span>

                          <span className="flex flex-none items-center gap-3">
                            <span className="hidden w-28 text-right sm:block">
                              <span
                                className={cn(
                                  "block text-[12.5px] font-medium",
                                  u.is_online ? "text-positive" : "text-ink-muted"
                                )}
                              >
                                {u.is_online ? "Online now" : formatRelativeTime(u.last_seen_at)}
                              </span>
                              <span className="block text-[11px] text-ink-muted">
                                joined {formatDate(u.created_at)}
                              </span>
                            </span>
                            {busyId === u.id ? (
                              <span className="flex h-8 w-8 items-center justify-center">
                                <Loader2 className="h-4 w-4 animate-spin text-ink-muted" />
                              </span>
                            ) : (
                              <RowMenu items={menu} label={`Actions for ${u.email}`} />
                            )}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </>
        ) : null}

        {/* ── Admin activity ─────────────────────────────────────── */}
        {tab === "activity" ? (
          <Panel>
            <PanelHeader
              title="Admin activity"
              caption="Every privileged action, and who took it"
            />
            {audit.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-ink-muted">
                Nothing recorded yet.
              </p>
            ) : (
              <ul className="mt-5 space-y-1">
                {audit.map((entry, i) => {
                  const label = ACTION_LABEL[entry.action];
                  const target = label?.self
                    ? null
                    : entry.target_email === entry.actor_email
                      ? "themselves"
                      : entry.target_email;
                  return (
                  <motion.li
                    key={entry.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.35,
                      delay: Math.min(i, 12) * 0.03,
                      ease: EASE_OUT,
                    }}
                    className="flex items-center gap-3 border-b border-line/70 py-2.5 last:border-0"
                  >
                    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-elevated text-ink-muted">
                      <Activity className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 text-[13px] text-ink">
                      <span className="font-semibold">{entry.actor_email}</span>{" "}
                      <span className="text-ink-muted">
                        {label?.verb ?? entry.action}
                      </span>{" "}
                      {target ? <span className="font-semibold">{target}</span> : null}
                    </span>
                    <span className="flex-none text-[11.5px] text-ink-muted">
                      {formatRelativeTime(entry.created_at)}
                    </span>
                  </motion.li>
                  );
                })}
              </ul>
            )}
          </Panel>
        ) : null}

        {/* ── Donations ──────────────────────────────────────────── */}
        {tab === "donations" ? (
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <Panel>
              <PanelHeader
                title="Hosting cost coverage"
                caption="Donations against this month's target"
              />
              <div className="mt-5 flex items-baseline justify-between gap-4">
                <p className="text-[30px] font-extrabold leading-none tracking-[-0.025em] tabular-nums text-ink">
                  {formatCurrency(num(metrics?.donation_current_month))}
                </p>
                <span className="text-[13px] font-bold tabular-nums text-brass-ink">
                  {pct}%
                </span>
              </div>
              <p className="mt-1.5 text-[12.5px] text-ink-muted">
                of {formatCurrency(num(metrics?.donation_monthly_target))}
              </p>
              <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-elevated">
                <motion.span
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1, delay: 0.15, ease: EASE_OUT }}
                  className="block h-full rounded-full bg-gradient-to-r from-brass to-brass-soft"
                />
              </div>

              <form onSubmit={saveTarget} className="mt-6 flex flex-wrap items-end gap-2">
                <Field label="Monthly target" className="min-w-[160px] flex-1">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="tabular-nums"
                  />
                </Field>
                <Button type="submit" variant="primary" disabled={savingTarget}>
                  {savingTarget ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {savingTarget ? "Saving…" : "Update target"}
                </Button>
              </form>
            </Panel>

            <Panel>
              <PanelHeader title="Across all accounts" caption="What the product has processed" />
              <ul className="mt-5 space-y-3">
                {[
                  {
                    label: "Revenue collected",
                    value: formatCurrency(num(metrics?.total_revenue_processed)),
                  },
                  { label: "Invoices paid", value: String(num(metrics?.total_invoices_paid)) },
                  { label: "Expenses recorded", value: String(num(metrics?.total_expenses)) },
                  { label: "Businesses set up", value: String(num(metrics?.total_companies)) },
                ].map((row) => (
                  <li
                    key={row.label}
                    className="flex items-center justify-between rounded-[12px] bg-elevated/50 p-3.5"
                  >
                    <span className="text-[13px] font-semibold text-ink">{row.label}</span>
                    <span className="text-[16px] font-extrabold tabular-nums text-ink">
                      {row.value}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        ) : null}
      </motion.div>

      {/* ── password reset confirmation ──────────────────────────── */}
      <Modal
        open={Boolean(resetting)}
        onClose={() => setResetting(null)}
        title="Send a password reset?"
        description={
          resetting
            ? `${resetting.email} gets a link valid for 24 hours. Their current password keeps working until they use it.`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetting(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={sendReset} disabled={Boolean(busyId)}>
              {busyId ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Send reset link
            </Button>
          </>
        }
      />

      <StepUpModals ctl={stepUp} />

      {toast ? (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      ) : null}
    </div>
  );
}
