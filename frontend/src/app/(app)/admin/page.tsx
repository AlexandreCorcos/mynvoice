"use client";

/* =========================================================================
   Admin.

   Restricted. Two questions: is the product being used, and are the
   servers paid for. Non-admins are bounced before anything renders.
   ========================================================================= */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
  FileText,
  Loader2,
  PoundSterling,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { EASE_OUT } from "@/components/motion";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/app/button";
import { Panel, PanelHeader } from "@/components/app/panel";
import { MetricCard } from "@/components/app/metric";
import { Field, Input } from "@/components/app/form";
import Toast, { type ToastType } from "@/components/ui/toast";
import type { AdminMetrics, DonationProgress } from "@/types";

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [donations, setDonations] = useState<DonationProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    if (user && !user.is_admin) router.replace("/dashboard");
  }, [user, router]);

  const fetchData = useCallback(async () => {
    try {
      const [m, d] = await Promise.all([
        api.get<AdminMetrics>("/admin/metrics"),
        api.get<DonationProgress>("/admin/donations"),
      ]);
      setMetrics(m);
      setDonations(d);
      setTarget(String(d.monthly_target));
    } catch {
      /* empty panels rather than a broken page */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/admin/donations/config", {
        monthly_target: parseFloat(target) || 1000,
      });
      await fetchData();
      setToast({ message: "Monthly target updated.", type: "success" });
    } catch {
      setToast({ message: "Couldn't update the target.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (user && !user.is_admin) return null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-4 w-24 animate-pulse rounded-full bg-elevated" />
        <div className="h-9 w-72 animate-pulse rounded-lg bg-elevated" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[136px] animate-pulse rounded-[16px] bg-elevated" />
          ))}
        </div>
      </div>
    );
  }

  const currency = donations?.currency || "GBP";
  const money = (n: number) => formatCurrency(n, currency);
  const pct = donations ? Math.min(100, Math.round(donations.percentage)) : 0;
  const remaining = donations
    ? Math.max(0, donations.monthly_target - donations.current_month_total)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="How MYNVOICE is doing."
        subtitle="Usage across every account, and whether this month's hosting is covered."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          index={0}
          label="Total users"
          value={metrics?.total_users ?? 0}
          format={(n) => String(Math.round(n))}
          icon={Users}
          tone="brass"
          caption={`${metrics?.active_users ?? 0} active`}
        />
        <MetricCard
          index={1}
          label="New this month"
          value={metrics?.new_users_this_month ?? 0}
          format={(n) => String(Math.round(n))}
          icon={UserPlus}
          tone="positive"
          caption="sign-ups"
        />
        <MetricCard
          index={2}
          label="Invoices created"
          value={metrics?.total_invoices ?? 0}
          format={(n) => String(Math.round(n))}
          icon={FileText}
          caption={`${metrics?.total_invoices_paid ?? 0} marked paid`}
        />
        <MetricCard
          index={3}
          label="Revenue processed"
          value={metrics?.total_revenue_processed ?? 0}
          format={money}
          icon={PoundSterling}
          caption="across all accounts"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Panel>
          <PanelHeader
            title="Hosting cost coverage"
            caption="Donations against this month's target"
          />

          <div className="mt-5 flex items-baseline justify-between gap-4">
            <p className="text-[30px] font-extrabold leading-none tracking-[-0.025em] tabular-nums text-ink">
              {money(donations?.current_month_total ?? 0)}
            </p>
            <span className="text-[13px] font-bold tabular-nums text-brass-ink">{pct}%</span>
          </div>
          <p className="mt-1.5 text-[12.5px] text-ink-muted">
            of {money(donations?.monthly_target ?? 0)}
            {remaining > 0 ? ` · ${money(remaining)} still to find` : " · fully covered"}
          </p>

          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-elevated">
            <motion.span
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1.1, delay: 0.15, ease: EASE_OUT }}
              className="block h-full rounded-full bg-gradient-to-r from-brass to-brass-soft"
            />
          </div>

          <form onSubmit={saveTarget} className="mt-6 flex flex-wrap items-end gap-2">
            <Field label={`Monthly target (${currency})`} className="min-w-[160px] flex-1">
              <Input
                type="number"
                min="0"
                step="1"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="tabular-nums"
              />
            </Field>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Saving…" : "Update target"}
            </Button>
          </form>
        </Panel>

        <Panel>
          <PanelHeader title="Activity" caption="What's been recorded" />
          <ul className="mt-5 space-y-3">
            {[
              {
                icon: Activity,
                label: "Active users",
                value: String(metrics?.active_users ?? 0),
                caption: "signed in recently",
              },
              {
                icon: TrendingUp,
                label: "Invoices paid",
                value: String(metrics?.total_invoices_paid ?? 0),
                caption: `of ${metrics?.total_invoices ?? 0} created`,
              },
              {
                icon: Wallet,
                label: "Expenses recorded",
                value: String(metrics?.total_expenses_recorded ?? 0),
                caption: "across all accounts",
              },
            ].map((row, i) => (
              <motion.li
                key={row.label}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.06, ease: EASE_OUT }}
                className="flex items-center gap-3 rounded-[12px] bg-elevated/50 p-3.5"
              >
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[11px] bg-card text-ink-muted ring-1 ring-line">
                  <row.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-ink">
                    {row.label}
                  </span>
                  <span className="block text-[11.5px] text-ink-muted">{row.caption}</span>
                </span>
                <span className="flex-none text-[17px] font-extrabold tabular-nums text-ink">
                  {row.value}
                </span>
              </motion.li>
            ))}
          </ul>
        </Panel>
      </div>

      {toast ? (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      ) : null}
    </div>
  );
}
