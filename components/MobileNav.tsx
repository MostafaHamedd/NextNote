"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LogIn, Library } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";

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

  const isAccountActive = pathname === "/account" || pathname === "/login" || pathname === "/pricing";

  return (
    <nav
      className={clsx(
        "fixed bottom-0 left-0 right-0 z-40 md:hidden",
        "flex items-stretch bg-surface-1 border-t border-surface-border",
        "pb-[env(safe-area-inset-bottom)]"
      )}
    >
      {/* Home — always first */}
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

      {user ? (
        <>
          {/* Logged-in: Home · Library · Account (tools live under Library) */}
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
        </>
      ) : (
        <>
          {/* Anonymous: Home · Library · Sign In */}
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
        </>
      )}
    </nav>
  );
}
