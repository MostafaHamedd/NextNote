"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlusCircle, Music, Clock } from "lucide-react";
import clsx from "clsx";

const LINKS = [
  {
    href: "/",
    label: "Guitar→Piano",
    icon: PlusCircle,
    active: (p: string) => p === "/" || p === "/results",
  },
  {
    href: "/visualizer",
    label: "Visualizer",
    icon: Music,
    active: (p: string) => p.startsWith("/visualizer"),
  },
] as const;

export default function MobileNav() {
  const pathname = usePathname();

  const openHistory = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("open-history"));
    }
  };

  return (
    <nav
      className={clsx(
        "fixed bottom-0 left-0 right-0 z-40 md:hidden",
        "flex items-stretch bg-surface-1 border-t border-surface-border",
        "pb-[env(safe-area-inset-bottom)]"
      )}
    >
      {LINKS.map(({ href, label, icon: Icon, active }) => (
        <Link
          key={href}
          href={href}
          className={clsx(
            "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
            active(pathname)
              ? "text-brand-400"
              : "text-gray-500 hover:text-gray-300"
          )}
        >
          <Icon size={22} strokeWidth={1.6} />
          {label}
        </Link>
      ))}

      {/* History — opens the sidebar via DOM event */}
      <button
        onClick={openHistory}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium text-gray-500 hover:text-gray-300 transition-colors"
      >
        <Clock size={22} strokeWidth={1.6} />
        History
      </button>
    </nav>
  );
}
