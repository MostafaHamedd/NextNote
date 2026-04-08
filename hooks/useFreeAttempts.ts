"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getFreeAttempts,
  incrementFreeAttempts,
  isAccessBlocked,
  getCurrentUser,
  MAX_FREE_ATTEMPTS,
} from "@/lib/auth";

export function useFreeAttempts() {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const count = getFreeAttempts();
    setAttempts(count);
    setBlocked(isAccessBlocked());
  }, []);

  /**
   * Call BEFORE making a feature API request.
   * Returns true if the user may proceed, false if they are blocked (and will be redirected).
   */
  const checkAccess = useCallback(
    (redirectPath?: string): boolean => {
      if (getCurrentUser()) return true; // logged-in users always proceed

      if (isAccessBlocked()) {
        const dest = redirectPath ? encodeURIComponent(redirectPath) : "";
        router.push(`/login?limit=true${dest ? `&next=${dest}` : ""}`);
        return false;
      }
      return true;
    },
    [router]
  );

  /**
   * Call AFTER a successful feature use to record the attempt.
   */
  const recordUsage = useCallback(() => {
    if (getCurrentUser()) return; // don't count for authenticated users
    incrementFreeAttempts();
    const newCount = getFreeAttempts();
    setAttempts(newCount);
    setBlocked(newCount >= MAX_FREE_ATTEMPTS);
  }, []);

  const remaining = Math.max(0, MAX_FREE_ATTEMPTS - attempts);

  return { attempts, blocked, remaining, checkAccess, recordUsage };
}
