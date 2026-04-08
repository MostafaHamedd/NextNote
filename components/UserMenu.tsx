"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Crown,
  CreditCard,
  Settings,
  HelpCircle,
  LogOut,
  ChevronUp,
  Shield,
  Bell,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";

const PLAN_BADGE: Record<string, { label: string; className: string }> = {
  free: { label: "Free", className: "bg-surface-border text-gray-400" },
  pro: { label: "Pro", className: "bg-brand-600/25 text-brand-400" },
  studio: { label: "Studio", className: "bg-amber-600/25 text-amber-400" },
};

const AVATAR_BG: Record<string, string> = {
  free: "bg-gray-700",
  pro: "bg-brand-700",
  studio: "bg-amber-700",
};

function getInitials(email: string) {
  return email.split("@")[0].slice(0, 2).toUpperCase();
}

export default function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  const badge = PLAN_BADGE[user.plan] ?? PLAN_BADGE.free;
  const avatarBg = AVATAR_BG[user.plan] ?? AVATAR_BG.free;

  const handleLogout = () => {
    setOpen(false);
    logout();
    router.push("/");
  };

  const Item = ({
    href,
    icon: Icon,
    label,
    danger,
    onClick,
  }: {
    href?: string;
    icon: React.ElementType;
    label: string;
    danger?: boolean;
    onClick?: () => void;
  }) => {
    const cls = clsx(
      "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-medium transition-all",
      danger
        ? "text-red-400 hover:bg-red-900/20"
        : "text-gray-300 hover:text-white hover:bg-surface-3"
    );
    if (href) {
      return (
        <Link href={href} onClick={() => setOpen(false)} className={cls}>
          <Icon size={15} />
          {label}
        </Link>
      );
    }
    return (
      <button onClick={onClick} className={cls}>
        <Icon size={15} />
        {label}
      </button>
    );
  };

  return (
    <div ref={ref} className="relative px-2 py-2 border-t border-surface-border shrink-0">
      {/* Dropdown panel — pops upward */}
      {open && (
        <div className="absolute bottom-full left-2 right-2 mb-2 bg-surface-1 border border-surface-border rounded-2xl shadow-2xl shadow-black/60 overflow-hidden z-50">
          {/* User header */}
          <div className="px-4 py-3 border-b border-surface-border">
            <div className="flex items-center gap-3">
              <div
                className={clsx(
                  "w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0",
                  avatarBg
                )}
              >
                {getInitials(user.email)}
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold truncate">{user.email}</p>
                <span
                  className={clsx(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 inline-block",
                    badge.className
                  )}
                >
                  {badge.label} Plan
                </span>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="p-1.5 space-y-0.5">
            <Item href="/account" icon={User} label="Account" />
            <Item href="/account#security" icon={Shield} label="Security" />
            <Item href="/account#notifications" icon={Bell} label="Notifications" />
            <Item href="/pricing" icon={Crown} label="Subscription" />
            <Item href="/account#billing" icon={CreditCard} label="Billing" />
            <Item href="/account#settings" icon={Settings} label="Preferences" />
          </div>

          <div className="px-1.5 pb-1.5 border-t border-surface-border mt-0.5 pt-1.5 space-y-0.5">
            <Item href="/help" icon={HelpCircle} label="Help & Support" />
            <Item icon={LogOut} label="Sign Out" danger onClick={handleLogout} />
          </div>
        </div>
      )}

      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl transition-all",
          open ? "bg-surface-3" : "hover:bg-surface-3/60"
        )}
      >
        {/* Avatar */}
        <div
          className={clsx(
            "w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0",
            avatarBg
          )}
        >
          {getInitials(user.email)}
        </div>

        {/* Email + plan */}
        <div className="flex-1 text-left min-w-0">
          <p className="text-xs text-white font-medium truncate leading-none">
            {user.email.split("@")[0]}
          </p>
          <p className="text-[10px] text-gray-500 leading-none mt-0.5">{badge.label}</p>
        </div>

        <ChevronUp
          size={13}
          className={clsx(
            "text-gray-500 shrink-0 transition-transform",
            open ? "rotate-0" : "rotate-180"
          )}
        />
      </button>
    </div>
  );
}
