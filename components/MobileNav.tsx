"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, LogIn, Library, Menu, X, Zap,
  Wand2, Radio, Headphones, Filter, Crown,
  LayoutGrid, PenLine, Sparkles,
} from "lucide-react";
import { useState, useEffect } from "react";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";
import { usePlatform } from "@/context/PlatformContext";
import { authHeaders, MAX_FREE_ATTEMPTS } from "@/lib/auth";
import { API_URL } from "@/lib/config";
import UserMenu from "@/components/UserMenu";

const TOOLS = [
  { href: "/analyze",       label: "Guitar → Piano",   icon: PenLine,    activeOn: ["/analyze", "/results"],          flagKey: "guitar_piano_enabled"  },
  { href: "/visualizer",    label: "Piano Visualizer", icon: LayoutGrid, activeOn: ["/visualizer", "/visualizer/play"], flagKey: "visualizer_enabled"    },
  { href: "/producer",      label: "Producer",         icon: Wand2,      activeOn: ["/producer"],                     flagKey: "producer_enabled"      },
  { href: "/live",          label: "Live Detector",    icon: Radio,      activeOn: ["/live"],                         flagKey: "live_detector_enabled" },
  { href: "/ear-training",  label: "Ear Training",     icon: Headphones, activeOn: ["/ear-training"],                 flagKey: "ear_training_enabled"  },
  { href: "/noise-removal", label: "Noise Removal",    icon: Filter,     activeOn: ["/noise-removal"],                flagKey: "noise_removal_enabled" },
  { href: "/logic-preset",  label: "Logic Presets",    icon: Sparkles,   activeOn: ["/logic-preset"],                 flagKey: "logic_preset_enabled"  },
] as const;

const PLAN_AVATAR_BG: Record<string, string> = {
  free: "bg-gray-700",
  pro: "bg-brand-700",
  studio: "bg-amber-700",
};

function getInitials(email: string) {
  return email.split("@")[0].slice(0, 2).toUpperCase();
}

export default function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const platform = usePlatform();
  const { free_mode } = platform;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [freeUsed, setFreeUsed] = useState(0);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (user) return;
    fetch(`${API_URL}/auth/anonymous-status`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setFreeUsed(data.monthly_uses); })
      .catch(() => {});
  }, [user]);

  const isAccountActive =
    pathname === "/account" || pathname === "/login" || pathname === "/pricing";

  return (
    <>
      {/* ── Bottom tab bar ── */}
      <nav
        className={clsx(
          "fixed bottom-0 left-0 right-0 z-40 md:hidden",
          "flex items-stretch bg-surface-1 border-t border-surface-border",
          "pb-[env(safe-area-inset-bottom)]"
        )}
      >
        {/* Home */}
        <Link
          href="/"
          className={clsx(
            "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
            pathname === "/" ? "text-brand-400" : "text-gray-500 hover:text-gray-300"
          )}
        >
          <Home size={22} strokeWidth={1.6} />
          Home
        </Link>

        {/* Library */}
        <Link
          href="/library"
          className={clsx(
            "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
            pathname === "/library" ? "text-brand-400" : "text-gray-500 hover:text-gray-300"
          )}
        >
          <Library size={22} strokeWidth={1.6} />
          Library
        </Link>

        {/* Menu (opens full sidebar drawer) */}
        <button
          onClick={() => setDrawerOpen(true)}
          className={clsx(
            "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
            drawerOpen ? "text-brand-400" : "text-gray-500 hover:text-gray-300"
          )}
        >
          <Menu size={22} strokeWidth={1.6} />
          Menu
        </button>

        {/* Account / Sign In */}
        {user ? (
          <Link
            href="/account"
            className={clsx(
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
              isAccountActive ? "text-brand-400" : "text-gray-500 hover:text-gray-300"
            )}
          >
            <div
              className={clsx(
                "w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold",
                isAccountActive ? "ring-2 ring-brand-400" : "",
                PLAN_AVATAR_BG[user.plan] ?? PLAN_AVATAR_BG.free
              )}
            >
              {getInitials(user.email)}
            </div>
            Account
          </Link>
        ) : (
          <Link
            href="/login"
            className={clsx(
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
              pathname === "/login" ? "text-brand-400" : "text-gray-500 hover:text-gray-300"
            )}
          >
            <LogIn size={22} strokeWidth={1.6} />
            Sign In
          </Link>
        )}
      </nav>

      {/* ── Backdrop ── */}
      <div
        className={clsx(
          "fixed inset-0 bg-black/60 z-50 md:hidden transition-opacity duration-300",
          drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setDrawerOpen(false)}
      />

      {/* ── Slide-in drawer (mirrors desktop Sidebar) ── */}
      <aside
        className={clsx(
          "fixed top-0 left-0 h-full w-64 bg-surface-1 border-r border-surface-border",
          "flex flex-col z-[60] md:hidden",
          "transition-transform duration-300 ease-out",
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo + close button */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-surface-border shrink-0">
          <Link
            href="/"
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
            onClick={() => setDrawerOpen(false)}
          >
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center shrink-0">
              <Zap size={13} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-sm tracking-tight leading-none">NextNote</p>
              <p className="text-[10px] text-gray-500 leading-none mt-0.5">Music AI</p>
            </div>
          </Link>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-1.5 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-surface-3"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {/* My Library */}
          <Link
            href="/library"
            onClick={() => setDrawerOpen(false)}
            className={clsx(
              "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-medium transition-all",
              pathname === "/library"
                ? "bg-brand-600/20 text-white"
                : "text-gray-400 hover:text-white hover:bg-surface-3"
            )}
          >
            <Library size={15} />
            My Library
          </Link>

          {/* Tools section */}
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
                onClick={() => setDrawerOpen(false)}
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

          {/* Account section */}
          {!free_mode && (
            <>
              <div className="pt-4 pb-1.5 px-3">
                <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Account</p>
              </div>
              <Link
                href="/pricing"
                onClick={() => setDrawerOpen(false)}
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

        {/* Bottom: user menu or sign-in + free uses */}
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
              onClick={() => setDrawerOpen(false)}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-surface-3 transition-all"
            >
              <LogIn size={15} />
              Sign In
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
