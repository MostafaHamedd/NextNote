"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  authHeaders,
  MAX_FREE_ATTEMPTS,
} from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/lib/config";

export function useFreeAttempts() {
  const router = useRouter();
  const { user } = useAuth();
  const [remaining, setRemaining] = useState<number | null>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (user) {
      setRemaining(null);
      setBlocked(false);
      return;
    }
    // Fetch server-side usage count for anonymous users
    fetch(`${API_URL}/auth/anonymous-status`, { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        setRemaining(data.uses_remaining);
        setBlocked(data.uses_remaining === 0);
      })
      .catch(() => {
        // Fallback: assume full limit available
        setRemaining(MAX_FREE_ATTEMPTS);
      });
  }, [user]);

  /**
   * Call BEFORE making a feature API request.
   * Returns true if the user may proceed, false if they are blocked.
   */
  const checkAccess = useCallback(
    (redirectPath?: string): boolean => {
      if (getCurrentUser()) return true;
      if (blocked) {
        const dest = redirectPath ? encodeURIComponent(redirectPath) : "";
        router.push(`/login?limit=true${dest ? `&next=${dest}` : ""}`);
        return false;
      }
      return true;
    },
    [router, blocked]
  );

  /**
   * Call AFTER a successful feature use to update the local count.
   */
  const recordUsage = useCallback(() => {
    if (getCurrentUser()) return;
    setRemaining((prev) => {
      const next = Math.max(0, (prev ?? MAX_FREE_ATTEMPTS) - 1);
      setBlocked(next === 0);
      return next;
    });
  }, []);

  return { blocked, remaining, checkAccess, recordUsage };
}
