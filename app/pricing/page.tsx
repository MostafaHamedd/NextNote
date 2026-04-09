"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Zap, Crown, Star, ArrowRight, Music, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { authHeaders } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Try NextNote with no commitment.",
    icon: Music,
    accent: "text-gray-300",
    border: "border-surface-border",
    badge: null,
    cta: "Get Started",
    ctaStyle: "bg-surface-3 hover:bg-surface-border text-white",
    features: [
      "3 free analyses to try",
      "Guitar → Piano analysis",
      "Chord & key detection",
      "BPM & tempo analysis",
      "Export guitar chords as MIDI (DAW-ready)",
      "Session history (20 saves)",
    ],
    missing: [
      "Piano Visualizer",
      "MIDI upload",
      "Sheet music recognition",
      "Unlimited analyses",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$9.99",
    period: "per month",
    description: "Unlimited access to all features.",
    icon: Zap,
    accent: "text-brand-400",
    border: "border-brand-500/60",
    badge: "Most Popular",
    cta: "Upgrade to Pro",
    ctaStyle:
      "bg-gradient-to-r from-brand-600 to-accent-purple hover:opacity-90 text-white shadow-lg shadow-brand-900/30",
    features: [
      "Everything in Free",
      "Unlimited monthly analyses",
      "Piano Visualizer",
      "MIDI file upload & playback",
      "Sheet music recognition (GPT-4o)",
      "Priority processing",
      "Advanced session history",
    ],
    missing: [],
  },
  {
    id: "studio",
    name: "Studio",
    price: "$29.99",
    period: "per month",
    description: "For producers and music educators.",
    icon: Crown,
    accent: "text-amber-400",
    border: "border-amber-500/40",
    badge: "Best Value",
    cta: "Go Studio",
    ctaStyle:
      "bg-gradient-to-r from-amber-600 to-orange-500 hover:opacity-90 text-white shadow-lg shadow-amber-900/30",
    features: [
      "Everything in Pro",
      "API access",
      "Team collaboration (up to 5)",
      "Early access to new features",
      "Dedicated support",
      "Custom branding (coming soon)",
    ],
    missing: [],
  },
] as const;

export default function PricingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCta = async (planId: string) => {
    setError(null);

    if (planId === "free") {
      router.push(user ? "/analyze" : "/login");
      return;
    }

    if (!user) {
      router.push(`/login?next=/pricing`);
      return;
    }

    try {
      setLoadingPlan(planId);
      const res = await fetch(`${API_URL}/billing/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ plan: planId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Failed to start checkout.");
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-24 right-1/4 w-64 h-64 bg-accent-purple/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-amber-600/6 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12 sm:py-20">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-4 py-1.5 mb-6">
            <Star size={14} className="text-brand-400" />
            <span className="text-sm font-medium text-brand-300">Simple, transparent pricing</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
            Choose your{" "}
            <span className="gradient-text">plan</span>
          </h1>
          <p className="text-gray-400 max-w-md mx-auto text-base leading-relaxed">
            Start free — no credit card required. Upgrade anytime to unlock unlimited analyses and all features.
          </p>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-8 bg-red-900/20 border border-red-800/50 rounded-xl px-4 py-3 text-sm text-red-300 text-center">
            {error}
          </div>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = user?.plan === plan.id;
            const isLoading = loadingPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={[
                  "relative rounded-3xl border p-7 flex flex-col transition-all",
                  plan.id === "pro"
                    ? "glass shadow-2xl shadow-brand-900/20 scale-[1.02]"
                    : "bg-surface-1",
                  plan.border,
                ].join(" ")}
              >
                {/* Badge */}
                {plan.badge && (
                  <div
                    className={[
                      "absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white",
                      plan.id === "pro" ? "bg-brand-600" : "bg-amber-600",
                    ].join(" ")}
                  >
                    {plan.badge}
                  </div>
                )}

                {/* Icon + name */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={[
                      "w-9 h-9 rounded-xl flex items-center justify-center",
                      plan.id === "pro"
                        ? "bg-brand-600/20"
                        : plan.id === "studio"
                        ? "bg-amber-600/20"
                        : "bg-surface-3",
                    ].join(" ")}
                  >
                    <Icon size={17} className={plan.accent} />
                  </div>
                  <div>
                    <p className="font-bold text-white text-base">{plan.name}</p>
                    {isCurrent && (
                      <span className="text-[10px] font-bold text-brand-400 uppercase tracking-wide">
                        Current plan
                      </span>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div className="mb-2">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-500 text-sm ml-1">/{plan.period}</span>
                </div>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">{plan.description}</p>

                {/* CTA */}
                <button
                  onClick={() => handleCta(plan.id)}
                  disabled={isCurrent || isLoading || loadingPlan !== null}
                  className={[
                    "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all mb-7",
                    isCurrent
                      ? "opacity-50 cursor-not-allowed bg-surface-3 text-gray-400"
                      : isLoading
                      ? "opacity-75 cursor-wait " + plan.ctaStyle
                      : plan.ctaStyle,
                  ].join(" ")}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Redirecting…
                    </>
                  ) : isCurrent ? (
                    "Current Plan"
                  ) : (
                    <>
                      {plan.cta}
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>

                {/* Features */}
                <ul className="space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
                      <Check size={14} className="text-brand-400 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                  {plan.missing.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600 line-through">
                      <Check size={14} className="text-gray-700 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-600 mt-12 leading-relaxed">
          All plans include chord detection, BPM and key analysis, and guitar-to-MIDI export from your chord progression.
          <br />
          Prices are in USD. Cancel anytime.{" "}
          <Link href="/login" className="text-brand-400/70 hover:text-brand-300">
            Sign in
          </Link>{" "}
          to manage your subscription.
        </p>
      </div>
    </div>
  );
}
