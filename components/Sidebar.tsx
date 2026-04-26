"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogIn, Zap, Library, Wand2, Radio, Headphones, Filter, Crown, LayoutGrid, PenLine } from "lucide-react";
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

const TOOLS = [
  { href: "/analyze",        label: "Guitar → Piano",   icon: PenLine,   activeOn: ["/analyze", "/results"], flagKey: "guitar_piano_enabled"  },
  { href: "/visualizer",     label: "Piano Visualizer", icon: LayoutGrid, activeOn: ["/visualizer", "/visualizer/play"], flagKey: "visualizer_enabled" },
  { href: "/producer",       label: "Producer",         icon: Wand2,     activeOn: ["/producer"],             flagKey: "producer_enabled"      },
  { href: "/live",           label: "Live Detector",    icon: Radio,     activeOn: ["/live"],                 flagKey: "live_detector_enabled" },
  { href: "/ear-training",   label: "Ear Training",     icon: Headphones, activeOn: ["/ear-training"],       flagKey: "ear_training_enabled"  },
  { href: "/noise-removal",  label: "Noise Removal",    icon: Filter,    activeOn: ["/noise-removal"],        flagKey: "noise_removal_enabled" },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const platform = usePlatform();
  const { free_mode } = platform;
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

  const isLibraryActive = pathname === "/library";

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
          <div>
            <p className="font-bold text-white text-sm tracking-tight leading-none">NextNote</p>
            <p className="text-[10px] text-gray-500 leading-none mt-0.5">Music AI</p>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {/* My Library */}
          <Link
            href="/library"
            className={clsx(
              "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-medium transition-all",
              isLibraryActive
                ? "bg-brand-600/20 text-white"
                : "text-gray-400 hover:text-white hover:bg-surface-3"
            )}
          >
            <Library size={15} />
            My Library
          </Link>

          {/* TOOLS section */}
          <div className="pt-4 pb-1.5 px-3">
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Tools</p>
          </div>

          {TOOLS.map(({ href, label, icon: Icon, activeOn, flagKey }) => {
            if (!platform[flagKey]) return null;
            const isActive = (activeOn as readonly string[]).includes(pathname);
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-brand-600/20 text-white"
                    : "text-gray-400 hover:text-white hover:bg-surface-3"
                )}
              >
                <Icon size={14} />
                {label}
              </Link>
            );
          })}

          {/* ACCOUNT section */}
          {!free_mode && (
            <>
              <div className="pt-4 pb-1.5 px-3">
                <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Account</p>
              </div>
              <Link
                href="/pricing"
                className={clsx(
                  "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-medium transition-all",
                  pathname === "/pricing"
                    ? "bg-brand-600/20 text-white"
                    : "text-gray-400 hover:text-white hover:bg-surface-3"
                )}
              >
                <Crown size={14} />
                Upgrade
              </Link>
            </>
          )}
        </nav>

        {/* Bottom: user menu or sign-in */}
        {user ? (
          <UserMenu />
        ) : (
          <div className="px-2 py-3 border-t border-surface-border shrink-0 space-y-1">
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
