"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/**
 * Wraps any page that requires authentication.
 * - While auth state is loading: renders nothing (avoids a flash-redirect).
 * - If not authenticated: redirects to /login?next=<current path>.
 * - If authenticated: renders children.
 */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading || !user) return null;

  return <>{children}</>;
}
