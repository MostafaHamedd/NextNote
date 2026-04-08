"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Clock, Crown, LogIn, Zap, Library, Wand2 } from "lucide-react";
import { useState, useEffect } from "react";
import clsx from "clsx";
import HistorySidebar from "@/components/HistorySidebar";
import { useSessionHistory, Session } from "@/hooks/useSessionHistory";
import { resultStore } from "@/lib/resultStore";
import { useAuth } from "@/context/AuthContext";
import { getFreeAttempts, MAX_FREE_ATTEMPTS } from "@/lib/auth";
import UserMenu from "@/components/UserMenu";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [showHistory, setShowHistory] = useState(false);
  const [freeUsed, setFreeUsed] = useState(0);
  const { sessions, deleteSession, clearAll } = useSessionHistory();

  useEffect(() => {
    if (!user) setFreeUsed(getFreeAttempts());
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
              {/* Logged-in order: Library first */}
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

              <Link
                href="/producer"
                className={clsx(
                  "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-medium transition-all",
                  pathname === "/producer"
                    ? "bg-brand-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-surface-3"
                )}
              >
                <Wand2 size={15} />
                Producer
              </Link>

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
            </>
          ) : (
            <>
              {/* Anonymous order: tools first, then History */}
              <Link
                href="/producer"
                className={clsx(
                  "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-medium transition-all",
                  pathname === "/producer"
                    ? "bg-brand-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-surface-3"
                )}
              >
                <Wand2 size={15} />
                Producer
              </Link>

              <button
                onClick={() => setShowHistory(true)}
                className={clsx(
                  "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-medium transition-all",
                  showHistory
                    ? "bg-brand-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-surface-3"
                )}
              >
                <Clock size={15} />
                History
                {sessions.length > 0 && (
                  <span className="ml-auto w-4 h-4 rounded-full bg-brand-500/40 text-white text-[9px] font-bold flex items-center justify-center">
                    {sessions.length > 9 ? "9+" : sessions.length}
                  </span>
                )}
              </button>

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
            </>
          )}
        </nav>

        {/* Bottom: user menu or sign-in */}
        {user ? (
          <UserMenu />
        ) : (
          <div className="px-2 py-3 border-t border-surface-border shrink-0 space-y-1">
            {/* Free attempt progress */}
            {freeUsed < MAX_FREE_ATTEMPTS && (
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
