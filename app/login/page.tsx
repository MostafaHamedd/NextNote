"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Zap, Mail, Lock, Eye, EyeOff, AlertTriangle, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/lib/config";

type Tab = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user } = useAuth();

  const isLimit = searchParams.get("limit") === "true";
  const nextPath = searchParams.get("next") || "/library";

  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.replace(nextPath);
    }
  }, [user, router, nextPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (tab === "register" && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = tab === "login" ? "/auth/login" : "/auth/register";
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Something went wrong.");
      }

      login(data.access_token);
      router.replace(nextPath);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center relative overflow-hidden px-4">
      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent-purple/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-900/40">
              <Zap size={16} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">NextNote</span>
          </Link>
        </div>

        {/* Limit banner */}
        {isLimit && (
          <div className="mb-6 flex items-start gap-3 bg-amber-900/20 border border-amber-700/40 rounded-2xl px-4 py-3.5">
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-300 font-semibold text-sm">Free limit reached</p>
              <p className="text-amber-400/80 text-xs mt-0.5 leading-relaxed">
                You've used your 3 free analyses. Sign in or create a free account to keep going.
              </p>
            </div>
          </div>
        )}

        {/* Card */}
        <div className="glass rounded-3xl p-8 shadow-2xl shadow-black/40">
          {/* Tab switcher */}
          <div className="flex bg-surface-3 rounded-2xl p-1 mb-7">
            {(["login", "register"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null); }}
                className={[
                  "flex-1 py-2.5 rounded-xl font-medium text-sm transition-all",
                  tab === t
                    ? "bg-brand-600 text-white shadow-lg shadow-brand-900/30"
                    : "text-gray-500 hover:text-gray-300",
                ].join(" ")}
              >
                {t === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <h1 className="text-xl font-bold text-white mb-1">
            {tab === "login" ? "Welcome back" : "Get started free"}
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            {tab === "login"
              ? "Sign in to your NextNote account."
              : "Create your account — no credit card required."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-surface-3 border border-surface-border rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full pl-10 pr-10 py-3 bg-surface-3 border border-surface-border rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Confirm password (register only) */}
            {tab === "register" && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full pl-10 pr-4 py-3 bg-surface-3 border border-surface-border rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-900/20 border border-red-800/40 rounded-xl px-3 py-2.5">
                <AlertTriangle size={14} className="text-red-400 shrink-0" />
                <p className="text-red-300 text-xs">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-brand-600 to-accent-purple hover:opacity-90 transition-all shadow-lg shadow-brand-900/30 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  {tab === "login" ? "Signing in…" : "Creating account…"}
                </span>
              ) : (
                <>
                  {tab === "login" ? "Sign In" : "Create Account"}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Divider / plan link */}
          <p className="text-center text-xs text-gray-600 mt-6">
            {tab === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => { setTab(tab === "login" ? "register" : "login"); setError(null); }}
              className="text-brand-400 hover:text-brand-300 font-medium"
            >
              {tab === "login" ? "Sign up free" : "Sign in"}
            </button>
          </p>

          <p className="text-center text-xs text-gray-700 mt-3">
            View our{" "}
            <Link href="/pricing" className="text-brand-400/70 hover:text-brand-300">
              subscription plans
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
