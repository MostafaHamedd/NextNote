const TOKEN_KEY = "nn_auth_token";
const ATTEMPTS_KEY = "nn_free_attempts";
const FINGERPRINT_KEY = "nxn_fp";
export const AUTOPLAY_KEY = "nn_autoplay_visualizer";
export const ANON_SESSIONS_KEY = "music-assistant-sessions";
export const MAX_FREE_ATTEMPTS = 3;

export interface AuthUser {
  id: number;
  email: string;
  plan: "free" | "pro" | "studio";
  subscription_status?: string | null;  // active | past_due | canceled | null
  current_period_end?: string | null;   // ISO string, only present for paid plans
  created_at?: string | null;           // ISO string, from /auth/me
}

// ── Token storage ─────────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ── JWT decode (no verification — verification happens server-side) ────────────

export function decodeToken(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // Check expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return { id: parseInt(payload.sub), email: payload.email, plan: payload.plan };
  } catch {
    return null;
  }
}

export function getCurrentUser(): AuthUser | null {
  const token = getToken();
  if (!token) return null;
  const user = decodeToken(token);
  if (!user) {
    // Token is expired or malformed — clear it
    removeToken();
    return null;
  }
  return user;
}

// ── Free attempt tracking ─────────────────────────────────────────────────────

export function getFreeAttempts(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(ATTEMPTS_KEY) || "0", 10);
}

export function incrementFreeAttempts(): void {
  const current = getFreeAttempts();
  localStorage.setItem(ATTEMPTS_KEY, String(current + 1));
}

export function resetFreeAttempts(): void {
  localStorage.setItem(ATTEMPTS_KEY, "0");
}

/** True if anonymous user has exhausted their free attempts */
export function isAccessBlocked(): boolean {
  if (getCurrentUser()) return false; // logged-in users are never blocked
  return getFreeAttempts() >= MAX_FREE_ATTEMPTS;
}

// ── Anonymous session migration helpers ──────────────────────────────────────

/** Read anonymous localStorage sessions for migration on login. */
export function readAnonSessions(): Array<{ label: string; analysis: any; feedback: any }> {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ANON_SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s: any) => s?.analysis && s?.feedback)
      .map((s: any) => ({ label: s.label || "Recording", analysis: s.analysis, feedback: s.feedback }));
  } catch {
    return [];
  }
}

/** Remove the anonymous session key after migration. */
export function clearAnonSessions(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ANON_SESSIONS_KEY);
  } catch {}
}

// ── Fingerprint — persistent anonymous browser ID ────────────────────────────

export function getFingerprint(): string {
  if (typeof window === "undefined") return "";
  let fp = localStorage.getItem(FINGERPRINT_KEY);
  if (!fp) {
    fp = crypto.randomUUID();
    localStorage.setItem(FINGERPRINT_KEY, fp);
  }
  return fp;
}

// ── Auth fetch helper — injects Bearer token + fingerprint automatically ─────

export function authHeaders(): HeadersInit {
  const token = getToken();
  const fp = getFingerprint();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (fp) headers["X-Fingerprint-ID"] = fp;
  return headers;
}
