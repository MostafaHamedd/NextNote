"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PlusCircle, Music, Clock, Settings, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import clsx from "clsx";
import HistorySidebar from "@/components/HistorySidebar";
import { useSessionHistory, Session } from "@/hooks/useSessionHistory";
import { resultStore } from "@/lib/resultStore";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showHistory, setShowHistory] = useState(false);
  const { sessions, deleteSession, clearAll } = useSessionHistory();

  // Allow MobileNav to open the history panel via a DOM event
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
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-surface-border shrink-0">
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center shrink-0">
            <Zap size={13} className="text-white" />
          </div>
          <span className="font-bold text-white text-sm tracking-tight">NextNote</span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">

          <Link
            href="/"
            className={clsx(
              "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-medium transition-all",
              pathname === "/" || pathname === "/results"
                ? "bg-brand-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-surface-3"
            )}
          >
            <PlusCircle size={15} />
            <span className="leading-tight text-left">Guitar → Piano</span>
          </Link>

          <Link
            href="/visualizer"
            className={clsx(
              "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-medium transition-all",
              pathname === "/visualizer" || pathname === "/visualizer/play"
                ? "bg-brand-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-surface-3"
            )}
          >
            <Music size={15} />
            Visualizer
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
        </nav>

        {/* Bottom: Settings */}
        <div className="px-2 py-3 border-t border-surface-border shrink-0">
          <button
            disabled
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-medium text-gray-600 cursor-not-allowed"
          >
            <Settings size={15} />
            Settings
          </button>
        </div>
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
