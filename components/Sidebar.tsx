"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Clock, Crown, LogIn, Zap, Library, Wand2, PlusCircle, Music, Radio, Headphones, Filter } from "lucide-react";
import { useState, useEffect } from "react";
import clsx from "clsx";
import HistorySidebar from "@/components/HistorySidebar";
import { useSessionHistory, Session } from "@/hooks/useSessionHistory";
import { resultStore } from "@/lib/resultStore";
import { useAuth } from "@/context/AuthContext";
import { usePlatform } from "@/context/PlatformContext";
import { authHeaders, MAX_FREE_ATTEMPTS } from "@/lib/auth";
import { API_URL } from "@/lib/config";
import UserMenu from "@/components/UserMenu";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { free_mode, producer_enabled } = usePlatform();
  const [showHistory, setShowHistory] = useState(false);
  const [freeUsed, setFreeUsed] = useState(0);
  const { sessions, deleteSession, clearAll } = useSessionHistory();

  useEffect(() => {
    if (user) return;
    fetch(`${API_URL}/auth/anonymous-status`, { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setFreeUsed(data.monthly_uses); })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    const handler = () => setShowHistory(true);
    window.addEventListener("open-history", handler);
    return () => window.removeEventListener("open-history", handler);
  }, []);

  const handleRestore = (session: Session) => {
    resultStore.set({
      analysis: session.analysis,
      feedback: session.feedback,
      audioBlob: null,
      label: session.label,
    });
    setShowHistory(false);
    router.push("/results");
  };

  return (
    <>
      <aside className="hidden md:flex fixed top-0 left-0 h-full w-44 bg-surface-1 border-r border-surface-border flex-col z-40">

        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 px-4 h-14 border-b border-surface-border shrink-0 hover:bg-surface-3/50 transition-colors"
        >
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center shrink-0">
            <Zap size={13} className="text-white" />
          </div>
          <span className="font-bold text-white text-sm tracking-tight">NextNote</span>
        </Link>

        {/* Nav items */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {user ? (
            <>
              {/* Logged-in order: Library + sub-links, then tools */}
              <Link
                href="/library"
                className={clsx(
                  "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-medium transition-all",
                  pathname === "/library"
                    ? "bg-brand-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-surface-3"
                )}
              >
                <Library size={15} />
                Library
              </Link>

              {/* Sub-links under Library */}
              <div className="pl-3 space-y-0.5">
                <Link
                  href="/analyze"
                  className={clsx(
                    "flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs font-medium transition-all border-l border-surface-border ml-1",
                    pathname === "/analyze" || pathname === "/results"
                      ? "text-brand-400 border-brand-500/50"
                      : "text-gray-500 hover:text-gray-300 hover:bg-surface-3"
                  )}
                >
                  <PlusCircle size={12} />
                  Guitar → Piano
                </Link>
                <Link
                  href="/visualizer"
                  className={clsx(
                    "flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs font-medium transition-all border-l border-surface-border ml-1",
                    pathname === "/visualizer" || pathname === "/visualizer/play"
                      ? "text-brand-400 border-brand-500/50"
                      : "text-gray-500 hover:text-gray-300 hover:bg-surface-3"
                  )}
                >
                  <Music size={12} />
                  Piano visualizer
                </Link>
                {producer_enabled ? (
                  <Link
                    href="/producer"
                    className={clsx(
                      "flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs font-medium transition-all border-l border-surface-border ml-1",
                      pathname === "/producer"
                        ? "text-brand-400 border-brand-500/50"
                        : "text-gray-500 hover:text-gray-300 hover:bg-surface-3"
                    )}
                  >
                    <Wand2 size={12} />
                    Producer
                  </Link>
                ) : (
                  <span className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs font-medium border-l border-surface-border ml-1 text-gray-700 cursor-not-allowed">
                    <Wand2 size={12} />
                    Producer
                  </span>
                )}
                <Link
                  href="/live"
                  className={clsx(
                    "flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs font-medium transition-all border-l border-surface-border ml-1",
                    pathname === "/live"
                      ? "text-brand-400 border-brand-500/50"
                      : "text-gray-500 hover:text-gray-300 hover:bg-surface-3"
                  )}
                >
                  <Radio size={12} />
                  Live Detector
                </Link>
                <Link
                  href="/ear-training"
                  className={clsx(
                    "flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs font-medium transition-all border-l border-surface-border ml-1",
                    pathname === "/ear-training"
                      ? "text-brand-400 border-brand-500/50"
                      : "text-gray-500 hover:text-gray-300 hover:bg-surface-3"
                  )}
                >
                  <Headphones size={12} />
                  Ear Training
                </Link>
                <Link
                  href="/noise-removal"
                  className={clsx(
                    "flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs font-medium transition-all border-l border-surface-border ml-1",
                    pathname === "/noise-removal"
                      ? "text-brand-400 border-brand-500/50"
                      : "text-gray-500 hover:text-gray-300 hover:bg-surface-3"
                  )}
                >
                  <Filter size={12} />
                  Noise Removal
                </Link>
              </div>

              {!free_mode && (
                <Link
                  href="/pricing"
                  className={clsx(
                    "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-medium transition-all",
                    pathname === "/pricing"
                      ? "bg-brand-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-surface-3"
                  )}
                >
                  <Crown size={15} />
                  Pricing
                </Link>
              )}
            </>
          ) : (
            <>
              {/* Anonymous: same nav as logged-in — all features available */}
              <Link
                href="/library"
                className={clsx(
                  "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-medium transition-all",
                  pathname === "/library"
                    ? "bg-brand-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-surface-3"
                )}
              >
                <Library size={15} />
                Library
              </Link>

              <div className="pl-3 space-y-0.5">
                <Link
                  href="/analyze"
                  className={clsx(
                    "flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs font-medium transition-all border-l border-surface-border ml-1",
                    pathname === "/analyze" || pathname === "/results"
                      ? "text-brand-400 border-brand-500/50"
                      : "text-gray-500 hover:text-gray-300 hover:bg-surface-3"
                  )}
                >
                  <PlusCircle size={12} />
                  Guitar → Piano
                </Link>
                <Link
                  href="/visualizer"
                  className={clsx(
                    "flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs font-medium transition-all border-l border-surface-border ml-1",
                    pathname === "/visualizer" || pathname === "/visualizer/play"
                      ? "text-brand-400 border-brand-500/50"
                      : "text-gray-500 hover:text-gray-300 hover:bg-surface-3"
                  )}
                >
                  <Music size={12} />
                  Piano visualizer
                </Link>
                {producer_enabled ? (
                  <Link
                    href="/producer"
                    className={clsx(
                      "flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs font-medium transition-all border-l border-surface-border ml-1",
                      pathname === "/producer"
                        ? "text-brand-400 border-brand-500/50"
                        : "text-gray-500 hover:text-gray-300 hover:bg-surface-3"
                    )}
                  >
                    <Wand2 size={12} />
                    Producer
                  </Link>
                ) : (
                  <span className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs font-medium border-l border-surface-border ml-1 text-gray-700 cursor-not-allowed">
                    <Wand2 size={12} />
                    Producer
                  </span>
                )}
                <Link
                  href="/live"
                  className={clsx(
                    "flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs font-medium transition-all border-l border-surface-border ml-1",
                    pathname === "/live"
                      ? "text-brand-400 border-brand-500/50"
                      : "text-gray-500 hover:text-gray-300 hover:bg-surface-3"
                  )}
                >
                  <Radio size={12} />
                  Live Detector
                </Link>
                <Link
                  href="/ear-training"
                  className={clsx(
                    "flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs font-medium transition-all border-l border-surface-border ml-1",
                    pathname === "/ear-training"
                      ? "text-brand-400 border-brand-500/50"
                      : "text-gray-500 hover:text-gray-300 hover:bg-surface-3"
                  )}
                >
                  <Headphones size={12} />
                  Ear Training
                </Link>
                <Link
                  href="/noise-removal"
                  className={clsx(
                    "flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs font-medium transition-all border-l border-surface-border ml-1",
                    pathname === "/noise-removal"
                      ? "text-brand-400 border-brand-500/50"
                      : "text-gray-500 hover:text-gray-300 hover:bg-surface-3"
                  )}
                >
                  <Filter size={12} />
                  Noise Removal
                </Link>
              </div>

              {!free_mode && (
                <Link
                  href="/pricing"
                  className={clsx(
                    "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-medium transition-all",
                    pathname === "/pricing"
                      ? "bg-brand-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-surface-3"
                  )}
                >
                  <Crown size={15} />
                  Pricing
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Bottom: user menu or sign-in */}
        {user ? (
          <UserMenu />
        ) : (
          <div className="px-2 py-3 border-t border-surface-border shrink-0 space-y-1">
            {/* Free attempt progress */}
            {!free_mode && freeUsed < MAX_FREE_ATTEMPTS && (
              <div className="px-3 py-2">
                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                  <span>Free uses</span>
                  <span>{freeUsed}/{MAX_FREE_ATTEMPTS}</span>
                </div>
                <div className="h-1 bg-surface-3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-600 rounded-full transition-all"
                    style={{ width: `${(freeUsed / MAX_FREE_ATTEMPTS) * 100}%` }}
                  />
                </div>
              </div>
            )}
            <Link
              href="/login"
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-surface-3 transition-all"
            >
              <LogIn size={15} />
              Sign In
            </Link>
          </div>
        )}
      </aside>

      <HistorySidebar
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        sessions={sessions}
        onRestore={handleRestore}
        onDelete={deleteSession}
        onClearAll={clearAll}
      />
    </>
  );
}
