"use client";

import { useState, useEffect, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function computePassword(): number {
  const now = new Date();
  return (now.getDate() + now.getMonth() + 1) * now.getFullYear() + now.getHours();
}

interface SysMetrics {
  total_users: number;
  active_users: number;
  new_users_this_month: number;
  total_companies: number;
  total_invoices: number;
  total_invoices_paid: number;
  total_revenue_processed: number;
  total_expenses: number;
  donation_monthly_target: number;
  donation_current_month: number;
  donation_percentage: number;
}

interface SysUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_verified: boolean;
  is_active: boolean;
  is_admin: boolean;
  auth_provider: string;
  created_at: string;
  last_login_at: string | null;
}

type Tab = "metrics" | "users";

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-green-800 p-4 rounded">
      <div className="text-xs text-green-600 mb-1 uppercase tracking-widest">{label}</div>
      <div className="text-2xl font-bold text-green-400">{value}</div>
      {sub && <div className="text-xs text-green-700 mt-1">{sub}</div>}
    </div>
  );
}

function Badge({ on, labelOn, labelOff }: { on: boolean; labelOn: string; labelOff: string }) {
  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded border ${
        on
          ? "border-green-700 text-green-500"
          : "border-red-900 text-red-700"
      }`}
    >
      {on ? labelOn : labelOff}
    </span>
  );
}

export default function SysCtrl() {
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState<SysMetrics | null>(null);
  const [users, setUsers] = useState<SysUser[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [tab, setTab] = useState<Tab>("metrics");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchMetrics = useCallback(async (pwd: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/sys/metrics`, {
        headers: { Authorization: `Bearer ${pwd}` },
      });
      if (!res.ok) {
        setAuthed(false);
        sessionStorage.removeItem("sys_pwd");
        return;
      }
      setMetrics(await res.json());
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async (pwd: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/sys/users`, {
        headers: { Authorization: `Bearer ${pwd}` },
      });
      if (!res.ok) return;
      setUsers(await res.json());
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem("sys_pwd");
    if (stored) {
      setAuthed(true);
      fetchMetrics(Number(stored));
    }
  }, [fetchMetrics]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (username !== "admin") { setError("Invalid credentials"); return; }
    const expected = computePassword();
    if (Number(password) !== expected) { setError("Invalid credentials"); return; }
    sessionStorage.setItem("sys_pwd", String(expected));
    setAuthed(true);
    fetchMetrics(expected);
  };

  const handleRefresh = () => {
    const stored = sessionStorage.getItem("sys_pwd");
    if (!stored) return;
    if (tab === "metrics") fetchMetrics(Number(stored));
    else fetchUsers(Number(stored));
  };

  const handleTabChange = (t: Tab) => {
    setTab(t);
    const stored = sessionStorage.getItem("sys_pwd");
    if (!stored) return;
    if (t === "metrics") fetchMetrics(Number(stored));
    else if (t === "users" && !users) fetchUsers(Number(stored));
  };

  const handleLogout = () => {
    sessionStorage.removeItem("sys_pwd");
    setAuthed(false);
    setMetrics(null);
    setUsers(null);
  };

  const sysAction = async (userId: string, action: string, label: string) => {
    const stored = sessionStorage.getItem("sys_pwd");
    if (!stored) return;
    setActionLoading(`${userId}:${action}`);
    try {
      const res = await fetch(`${API_BASE}/sys/users/${userId}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${stored}` },
      });
      if (!res.ok) { showToast("Error"); return; }
      showToast(label);
      fetchUsers(Number(stored));
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users?.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      u.first_name.toLowerCase().includes(q) ||
      u.last_name.toLowerCase().includes(q)
    );
  });

  if (!authed) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-mono">
        <div className="w-80">
          <div className="text-green-500 text-sm mb-6 text-center tracking-widest">
            MYNVOICE // SYS ACCESS
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="text"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
              className="w-full bg-black border border-green-800 text-green-400 px-3 py-2 text-sm rounded focus:outline-none focus:border-green-500 placeholder-green-900"
            />
            <input
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-green-800 text-green-400 px-3 py-2 text-sm rounded focus:outline-none focus:border-green-500 placeholder-green-900"
            />
            {error && <div className="text-red-600 text-xs">{error}</div>}
            <button
              type="submit"
              className="w-full border border-green-700 text-green-500 py-2 text-sm rounded hover:bg-green-950 transition-colors"
            >
              ACCESS
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black font-mono text-green-400 p-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-950 border border-green-700 text-green-400 text-xs px-4 py-2 rounded">
          {toast}
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 border-b border-green-900 pb-4">
          <div>
            <div className="text-green-500 text-lg tracking-widest">MYNVOICE // SYS CTRL</div>
            {lastRefresh && (
              <div className="text-green-800 text-xs mt-1">
                last refresh: {lastRefresh.toLocaleTimeString()}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="border border-green-800 text-green-600 px-3 py-1 text-xs rounded hover:bg-green-950 transition-colors disabled:opacity-40"
            >
              {loading ? "..." : "REFRESH"}
            </button>
            <button
              onClick={handleLogout}
              className="border border-red-900 text-red-700 px-3 py-1 text-xs rounded hover:bg-red-950 transition-colors"
            >
              EXIT
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6">
          {(["metrics", "users"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              className={`px-4 py-1.5 text-xs rounded border transition-colors ${
                tab === t
                  ? "border-green-600 text-green-400 bg-green-950"
                  : "border-green-900 text-green-700 hover:border-green-800 hover:text-green-600"
              }`}
            >
              // {t}
            </button>
          ))}
        </div>

        {/* Metrics Tab */}
        {tab === "metrics" && (
          <>
            {loading && !metrics && <div className="text-green-800 text-sm">loading...</div>}
            {metrics && (
              <div className="space-y-6">
                <div>
                  <div className="text-green-700 text-xs mb-3 uppercase tracking-widest">// users</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatBox label="Total Users" value={String(metrics.total_users)} />
                    <StatBox label="Active (30d)" value={String(metrics.active_users)} />
                    <StatBox label="New This Month" value={String(metrics.new_users_this_month)} />
                    <StatBox label="Companies" value={String(metrics.total_companies)} />
                  </div>
                </div>
                <div>
                  <div className="text-green-700 text-xs mb-3 uppercase tracking-widest">// invoices & finance</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatBox label="Total Invoices" value={String(metrics.total_invoices)} />
                    <StatBox
                      label="Paid Invoices"
                      value={String(metrics.total_invoices_paid)}
                      sub={
                        metrics.total_invoices > 0
                          ? `${((metrics.total_invoices_paid / metrics.total_invoices) * 100).toFixed(1)}% paid`
                          : undefined
                      }
                    />
                    <StatBox
                      label="Revenue Processed"
                      value={`£${metrics.total_revenue_processed.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    />
                    <StatBox label="Total Expenses" value={String(metrics.total_expenses)} />
                  </div>
                </div>
                <div>
                  <div className="text-green-700 text-xs mb-3 uppercase tracking-widest">// donations</div>
                  <div className="border border-green-800 p-4 rounded">
                    <div className="flex justify-between text-xs text-green-600 mb-2">
                      <span>monthly progress</span>
                      <span>
                        £{metrics.donation_current_month.toFixed(2)} / £{metrics.donation_monthly_target.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-2 bg-green-950 rounded overflow-hidden mb-2">
                      <div
                        className="h-full bg-green-600 rounded transition-all"
                        style={{ width: `${Math.min(metrics.donation_percentage, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-green-700">{metrics.donation_percentage.toFixed(1)}% of target</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Users Tab */}
        {tab === "users" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="text-green-700 text-xs uppercase tracking-widest">// user management</div>
              <input
                type="text"
                placeholder="search email or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-black border border-green-900 text-green-400 px-3 py-1.5 text-xs rounded focus:outline-none focus:border-green-600 placeholder-green-900 w-56"
              />
            </div>

            {loading && !users && <div className="text-green-800 text-sm">loading...</div>}

            {filteredUsers && (
              <div className="border border-green-900 rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-green-900 text-green-700 uppercase tracking-widest">
                      <th className="text-left px-4 py-2">Email</th>
                      <th className="text-left px-4 py-2">Name</th>
                      <th className="text-left px-4 py-2">Provider</th>
                      <th className="text-left px-4 py-2">Status</th>
                      <th className="text-left px-4 py-2">Last Login</th>
                      <th className="text-left px-4 py-2">Joined</th>
                      <th className="text-left px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const isLoading = (action: string) => actionLoading === `${u.id}:${action}`;
                      return (
                        <tr key={u.id} className="border-b border-green-950 hover:bg-green-950/30 transition-colors">
                          <td className="px-4 py-2.5 text-green-300">
                            {u.email}
                            {u.is_admin && (
                              <span className="ml-1.5 text-yellow-600 text-xs">[admin]</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-green-500">
                            {u.first_name} {u.last_name}
                          </td>
                          <td className="px-4 py-2.5 text-green-700">{u.auth_provider}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex gap-1.5 flex-wrap">
                              <Badge on={u.is_verified} labelOn="verified" labelOff="unverified" />
                              <Badge on={u.is_active} labelOn="active" labelOff="inactive" />
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-green-700">
                            {u.last_login_at
                              ? new Date(u.last_login_at).toLocaleDateString("en-GB")
                              : "never"}
                          </td>
                          <td className="px-4 py-2.5 text-green-700">
                            {new Date(u.created_at).toLocaleDateString("en-GB")}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex gap-1.5 flex-wrap">
                              {!u.is_verified && (
                                <button
                                  onClick={() => sysAction(u.id, "verify", `${u.email} verified`)}
                                  disabled={isLoading("verify")}
                                  className="border border-green-800 text-green-600 px-2 py-0.5 rounded hover:bg-green-950 transition-colors disabled:opacity-40"
                                >
                                  {isLoading("verify") ? "..." : "verify"}
                                </button>
                              )}
                              <button
                                onClick={() => sysAction(u.id, "toggle-active", u.is_active ? `${u.email} deactivated` : `${u.email} activated`)}
                                disabled={isLoading("toggle-active")}
                                className={`border px-2 py-0.5 rounded transition-colors disabled:opacity-40 ${
                                  u.is_active
                                    ? "border-red-900 text-red-700 hover:bg-red-950"
                                    : "border-green-800 text-green-600 hover:bg-green-950"
                                }`}
                              >
                                {isLoading("toggle-active") ? "..." : u.is_active ? "deactivate" : "activate"}
                              </button>
                              <button
                                onClick={() => sysAction(u.id, "toggle-admin", u.is_admin ? `${u.email} removed from admin` : `${u.email} is now admin`)}
                                disabled={isLoading("toggle-admin")}
                                className="border border-yellow-900 text-yellow-700 px-2 py-0.5 rounded hover:bg-yellow-950 transition-colors disabled:opacity-40"
                              >
                                {isLoading("toggle-admin") ? "..." : u.is_admin ? "rm admin" : "mk admin"}
                              </button>
                              <button
                                onClick={() => sysAction(u.id, "send-reset", `Reset email sent to ${u.email}`)}
                                disabled={isLoading("send-reset")}
                                className="border border-blue-900 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-950 transition-colors disabled:opacity-40"
                              >
                                {isLoading("send-reset") ? "..." : "send reset"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-green-800">
                          no users found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
