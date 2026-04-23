"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RequireAuth from "@/components/RequireAuth";
import {
  User,
  Shield,
  Crown,
  CreditCard,
  Bell,
  Settings,
  LogOut,
  Check,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Eye,
  EyeOff,
  Trash2,
  Zap,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";
import { usePlatform } from "@/context/PlatformContext";
import { getToken, authHeaders, AUTOPLAY_KEY } from "@/lib/auth";
import { API_URL } from "@/lib/config";

const PLAN_INFO = {
  free: {
    label: "Free",
    color: "text-gray-400",
    bg: "bg-surface-3",
    border: "border-surface-border",
    description: "3 free analyses, basic features",
  },
  pro: {
    label: "Pro",
    color: "text-brand-400",
    bg: "bg-brand-600/10",
    border: "border-brand-500/30",
    description: "Unlimited analyses, all features",
  },
  studio: {
    label: "Studio",
    color: "text-amber-400",
    bg: "bg-amber-600/10",
    border: "border-amber-500/30",
    description: "Everything in Pro + API + teams",
  },
};

type SectionKey = "profile" | "subscription" | "billing" | "security" | "notifications" | "preferences" | "danger";

const NAV_ITEMS: { key: SectionKey; label: string; icon: React.ElementType; danger?: boolean }[] = [
  { key: "profile", label: "Profile", icon: User },
  { key: "subscription", label: "Subscription", icon: Crown },
  { key: "billing", label: "Billing", icon: CreditCard },
  { key: "security", label: "Security", icon: Shield },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "preferences", label: "Preferences", icon: Settings },
  { key: "danger", label: "Danger Zone", icon: AlertTriangle, danger: true },
];

function Row({
  label,
  value,
  action,
  danger,
}: {
  label: string;
  value?: string;
  action?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4 gap-4">
      <div className="min-w-0">
        <p className={`text-sm font-medium ${danger ? "text-red-400" : "text-white"}`}>{label}</p>
        {value && <p className="text-xs text-gray-500 mt-0.5 truncate">{value}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={clsx(
        "relative shrink-0 h-6 w-11 rounded-full border-0 p-1 transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        checked ? "bg-brand-600" : "bg-surface-3",
      )}
    >
      <span
        className={clsx(
          "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-md shadow-black/20 transition-transform duration-200 ease-out",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div
      className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium border ${
        type === "success"
          ? "bg-green-900/80 border-green-700/50 text-green-300"
          : "bg-red-900/80 border-red-700/50 text-red-300"
      }`}
    >
      {type === "success" ? <Check size={15} /> : <AlertTriangle size={15} />}
      {message}
    </div>
  );
}

function AccountContent() {
  const { user, logout } = useAuth();
  const { free_mode } = usePlatform();
  const router = useRouter();

  const [activeSection, setActiveSection] = useState<SectionKey>("profile");

  useEffect(() => {
    if (free_mode && (activeSection === "subscription" || activeSection === "billing")) {
      setActiveSection("profile");
    }
  }, [free_mode, activeSection]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const [notifs, setNotifs] = useState({ product: true, billing: true, tips: false });
  const [autoPlay, setAutoPlay] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(AUTOPLAY_KEY) === "true";
  });
  const [exportLoading, setExportLoading] = useState(false);


  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const toggleAutoPlay = () => {
    setAutoPlay((v) => {
      const next = !v;
      localStorage.setItem(AUTOPLAY_KEY, String(next));
      return next;
    });
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/export`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Export failed.");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nextnote-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Export downloaded.", "success");
    } catch {
      showToast("Export failed. Please try again.", "error");
    } finally {
      setExportLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) {
      showToast("New passwords do not match.", "error");
      return;
    }
    if (pwForm.next.length < 6) {
      showToast("New password must be at least 6 characters.", "error");
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ current_password: pwForm.current, new_password: pwForm.next }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Failed to update password.");
      }
      setPwForm({ current: "", next: "", confirm: "" });
      showToast("Password updated successfully.", "success");
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setPwLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setPortalLoading(true);
      const res = await fetch(`${API_URL}/billing/create-portal-session`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Could not open billing portal.");
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (e: any) {
      showToast(e.message || "Could not open billing portal.", "error");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    const confirmed = window.confirm(
      "Are you sure? This will permanently delete your account and all data. This cannot be undone."
    );
    if (!confirmed) return;
    showToast("Account deletion is not yet available. Contact support.", "error");
  };

  if (!user) return null; // TypeScript narrowing — RequireAuth prevents this

  const plan = PLAN_INFO[user.plan] ?? PLAN_INFO.free;

  const sectionContent: Record<SectionKey, React.ReactNode> = {
    profile: (
      <div className="glass rounded-2xl overflow-hidden divide-y divide-surface-border">
        <Row label="Email address" value={user.email} />
        <Row
          label="Display name"
          value={user.email.split("@")[0]}
          action={
            <button className="text-xs text-brand-400 hover:text-brand-300 font-medium">Edit</button>
          }
        />
        <Row
          label="Member since"
          value={
            user.created_at
              ? new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long" })
              : "—"
          }
        />
      </div>
    ),

    subscription: (
      <div className="glass rounded-2xl overflow-hidden divide-y divide-surface-border">
        {user.subscription_status === "past_due" && (
          <div className="flex items-center gap-2.5 px-5 py-3 bg-amber-900/30 border-b border-amber-700/40">
            <AlertTriangle size={14} className="text-amber-400 shrink-0" />
            <p className="text-xs text-amber-300 font-medium">
              Your payment is past due. Please update your payment method to keep your subscription active.
            </p>
            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="ml-auto text-xs font-semibold text-amber-300 hover:text-white shrink-0 disabled:opacity-50"
            >
              Fix now
            </button>
          </div>
        )}
        <div className="px-5 py-4">
          <div className={`flex items-start justify-between p-4 rounded-xl border ${plan.bg} ${plan.border}`}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap size={14} className={plan.color} />
                <span className={`font-bold text-sm ${plan.color}`}>{plan.label} Plan</span>
              </div>
              <p className="text-xs text-gray-400">{plan.description}</p>
            </div>
            {user.plan === "free" && !free_mode ? (
              <Link
                href="/pricing"
                className="flex items-center gap-1 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 px-3 py-1.5 rounded-lg transition-colors shrink-0"
              >
                Upgrade <ChevronRight size={12} />
              </Link>
            ) : user.plan !== "free" ? (
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="flex items-center gap-1 text-xs font-semibold text-white bg-surface-3 hover:bg-surface-border disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors shrink-0"
              >
                {portalLoading ? "Opening…" : "Manage"} <ChevronRight size={12} />
              </button>
            ) : null}
          </div>
        </div>
        <Row
          label="Renewal date"
          value={
            user.plan === "free"
              ? "No renewal — free plan"
              : user.current_period_end
              ? new Date(user.current_period_end).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
              : "—"
          }
        />
        <Row
          label="Cancel or change plan"
          value={user.plan === "free" ? "Not applicable" : "Update payment, cancel, or switch plans via the billing portal"}
          action={
            user.plan !== "free" ? (
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="text-xs text-brand-400 hover:text-brand-300 font-medium disabled:opacity-50"
              >
                Open portal
              </button>
            ) : undefined
          }
        />
      </div>
    ),

    billing: (
      <div className="glass rounded-2xl overflow-hidden divide-y divide-surface-border">
        {user.plan === "free" ? (
          <div className="px-5 py-6 text-center">
            <p className="text-sm text-gray-400 mb-3">No billing on the free plan.</p>
            {!free_mode && (
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 px-4 py-2 rounded-xl transition-colors"
              >
                Upgrade to Pro <ArrowRight size={12} />
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="px-5 py-4">
              <p className="text-sm font-medium text-white mb-1">Payment & invoices</p>
              <p className="text-xs text-gray-500 mb-3">
                Update your payment method, download invoices, and manage your billing details through the Stripe portal.
              </p>
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-50 px-4 py-2 rounded-xl transition-colors"
              >
                {portalLoading ? "Opening…" : "Open Billing Portal"}
                <ChevronRight size={14} />
              </button>
            </div>
            <Row label="Billing email" value={user.email} />
          </>
        )}
      </div>
    ),

    security: (
      <div className="glass rounded-2xl overflow-hidden divide-y divide-surface-border">
        <div className="px-5 py-5">
          <p className="text-sm font-medium text-white mb-4">Change Password</p>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            {[
              { key: "current", label: "Current password", placeholder: "Enter current password" },
              { key: "next", label: "New password", placeholder: "Min. 6 characters" },
              { key: "confirm", label: "Confirm new password", placeholder: "Repeat new password" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={pwForm[key as keyof typeof pwForm]}
                    onChange={(e) => setPwForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2.5 bg-surface-3 border border-surface-border rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-brand-500 transition-colors pr-10"
                  />
                  {key === "current" && (
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              type="submit"
              disabled={pwLoading || !pwForm.current || !pwForm.next || !pwForm.confirm}
              className="mt-1 px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {pwLoading ? "Saving…" : "Update Password"}
            </button>
          </form>
        </div>
        <Row
          label="Two-factor authentication"
          value="Not enabled"
          action={
            <button className="text-xs text-brand-400 hover:text-brand-300 font-medium">Enable</button>
          }
        />
        <Row
          label="Active sessions"
          value="1 session active"
          action={
            <button className="text-xs text-red-400 hover:text-red-300 font-medium">Revoke all</button>
          }
        />
      </div>
    ),

    notifications: (
      <div className="glass rounded-2xl overflow-hidden divide-y divide-surface-border">
        {([
          { key: "product" as const, label: "Product updates", desc: "New features and improvements" },
          { key: "billing" as const, label: "Billing alerts", desc: "Receipts and payment reminders" },
          { key: "tips" as const, label: "Tips & tutorials", desc: "Guitar and music production tips" },
        ]).map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-medium text-white">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
            <ToggleSwitch checked={notifs[key]} onChange={() => setNotifs((n) => ({ ...n, [key]: !n[key] }))} />
          </div>
        ))}
      </div>
    ),

    preferences: (
      <div className="glass rounded-2xl overflow-hidden divide-y divide-surface-border">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-medium text-white">Auto-play piano visualizer</p>
            <p className="text-xs text-gray-500 mt-0.5">Start playback automatically when a song loads</p>
          </div>
          <ToggleSwitch checked={autoPlay} onChange={toggleAutoPlay} />
        </div>
        <Row
          label="Language"
          value="English (US)"
          action={
            <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-white">
              Change <ChevronRight size={12} />
            </button>
          }
        />
        <Row
          label="Data export"
          value="Download all your session history and data"
          action={
            <button
              onClick={handleExport}
              disabled={exportLoading}
              className="text-xs text-brand-400 hover:text-brand-300 font-medium disabled:opacity-50"
            >
              {exportLoading ? "Exporting…" : "Export"}
            </button>
          }
        />
      </div>
    ),

    danger: (
      <div className="border border-red-800/40 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 gap-4">
          <div>
            <p className="text-sm font-medium text-red-400">Delete account</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Permanently delete your account and all data. This cannot be undone.
            </p>
          </div>
          <button
            onClick={handleDeleteAccount}
            className="flex items-center gap-1.5 text-xs font-semibold text-red-400 border border-red-800/50 hover:bg-red-900/20 px-3 py-2 rounded-xl transition-colors shrink-0"
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>
      </div>
    ),
  };

  const activeNav = NAV_ITEMS.find((n) => n.key === activeSection)!;

  return (
    <div className="min-h-screen bg-surface relative overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-10 sm:py-14">
        {/* Page header */}
        <div className="flex items-center gap-4 mb-10">
          <div className="w-14 h-14 bg-brand-700 rounded-2xl flex items-center justify-center text-white text-lg font-bold shrink-0">
            {user.email.split("@")[0].slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white leading-tight">Settings</h1>
            <p className="text-gray-400 text-sm mt-0.5">{user.email}</p>
          </div>
        </div>

        {/* Two-panel layout */}
        <div className="flex gap-6 items-start">
          {/* Left nav */}
          <nav className="w-52 shrink-0 glass rounded-2xl overflow-hidden divide-y divide-surface-border">
            {NAV_ITEMS.filter(({ key }) => !free_mode || (key !== "subscription" && key !== "billing")).map(({ key, label, icon: Icon, danger }) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={clsx(
                  "flex items-center gap-3 w-full px-4 py-3.5 text-sm font-medium transition-colors text-left",
                  activeSection === key
                    ? danger
                      ? "bg-red-900/20 text-red-400"
                      : "bg-brand-600/15 text-brand-300"
                    : danger
                    ? "text-red-500/70 hover:bg-red-900/10 hover:text-red-400"
                    : "text-gray-400 hover:bg-surface-3 hover:text-white"
                )}
              >
                <Icon size={15} className="shrink-0" />
                {label}
                {activeSection === key && (
                  <ChevronRight size={13} className="ml-auto opacity-60" />
                )}
              </button>
            ))}

            {/* Sign out */}
            <button
              onClick={() => { logout(); router.push("/"); }}
              className="flex items-center gap-3 w-full px-4 py-3.5 text-sm font-medium text-gray-500 hover:text-white hover:bg-surface-3 transition-colors"
            >
              <LogOut size={15} className="shrink-0" />
              Sign out
            </button>
          </nav>

          {/* Right content */}
          <div className="flex-1 min-w-0">
            {/* Section heading */}
            <div className="flex items-center gap-2.5 mb-5">
              <div className={clsx(
                "w-7 h-7 rounded-lg flex items-center justify-center",
                activeSection === "danger" ? "bg-red-900/30" : "bg-surface-3"
              )}>
                <activeNav.icon
                  size={14}
                  className={activeSection === "danger" ? "text-red-400" : "text-gray-400"}
                />
              </div>
              <h2 className={clsx(
                "text-sm font-semibold uppercase tracking-wide",
                activeSection === "danger" ? "text-red-400" : "text-white"
              )}>
                {activeNav.label}
              </h2>
            </div>

            {sectionContent[activeSection]}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <RequireAuth>
      <AccountContent />
    </RequireAuth>
  );
}
