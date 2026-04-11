"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getToken } from "@/lib/auth";
import { API_URL } from "@/lib/config";

const POLL_INTERVAL_MS = 1500;
const POLL_MAX_ATTEMPTS = 10; // fallback polling: 15 seconds total

export default function BillingSuccessPage() {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const plan = params.get("plan") ?? "pro";
  const sessionId = params.get("session_id");
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  const [confirmed, setConfirmed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const attemptsRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const didVerify = useRef(false);

  useEffect(() => {
    // If plan already matches (e.g. webhook was very fast), confirm immediately
    if (user?.plan === plan) {
      setConfirmed(true);
      return;
    }

    if (sessionId && !didVerify.current) {
      didVerify.current = true;
      // Directly verify the session — works without webhooks
      (async () => {
        try {
          const token = getToken();
          const res = await fetch(
            `${API_URL}/billing/verify-session?session_id=${encodeURIComponent(sessionId)}`,
            { method: "POST", headers: { Authorization: `Bearer ${token}` } }
          );
          if (res.ok) {
            await refreshProfile();
            setConfirmed(true);
            return;
          }
        } catch {}
        // verify failed — fall through to polling
        startPolling();
      })();
    } else {
      startPolling();
    }

    return () => clearInterval(intervalRef.current!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startPolling() {
    const poll = async () => {
      attemptsRef.current += 1;
      await refreshProfile();
      if (attemptsRef.current >= POLL_MAX_ATTEMPTS) {
        clearInterval(intervalRef.current!);
        setTimedOut(true);
      }
    };
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
  }

  // Watch for plan match after each refreshProfile call
  useEffect(() => {
    if (user?.plan === plan && !confirmed) {
      clearInterval(intervalRef.current!);
      setConfirmed(true);
    }
  }, [user?.plan, plan, confirmed]);

  const isPending = !confirmed && !timedOut;

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="glass rounded-3xl p-10 max-w-md w-full text-center shadow-2xl shadow-black/40">
        {isPending ? (
          <>
            <div className="w-16 h-16 bg-brand-600/20 border border-brand-600/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 size={28} className="text-brand-400 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Confirming your plan…</h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              Your payment was successful. Activating your{" "}
              <span className="text-white font-semibold">{planLabel}</span> plan now.
            </p>
          </>
        ) : timedOut ? (
          <>
            <div className="w-16 h-16 bg-amber-600/20 border border-amber-600/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={28} className="text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Payment received</h1>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
              Your payment was successful, but plan activation is taking a moment. It should reflect
              shortly — try refreshing the page or checking your account.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                Refresh
              </button>
              <button
                onClick={() => router.push("/account")}
                className="px-5 py-2.5 bg-surface-3 hover:bg-surface-border text-gray-300 font-semibold rounded-xl text-sm transition-colors"
              >
                View Account
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-green-600/20 border border-green-600/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={30} className="text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">You&apos;re all set!</h1>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
              Your <span className="text-white font-semibold">{planLabel}</span> plan is now active.
              Enjoy unlimited access to all features.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push("/analyze")}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                Start Analyzing
              </button>
              <button
                onClick={() => router.push("/account")}
                className="px-5 py-2.5 bg-surface-3 hover:bg-surface-border text-gray-300 font-semibold rounded-xl text-sm transition-colors"
              >
                View Account
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
