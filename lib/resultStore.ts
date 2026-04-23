/**
 * Module-level singleton to carry analysis results + audio blob across
 * a client-side navigation from "/" to "/results".
 * We can't pass Blob objects through URL params or sessionStorage,
 * so a plain module variable works for same-tab navigation.
 */

export interface StoredResult {
  analysis: any;
  feedback: any;
  audioBlob: Blob | File | null;
  label: string;
  source?: "guitar" | "song";
  sheet_data?: any;
}

let _store: StoredResult | null = null;

export const resultStore = {
  set(data: StoredResult) {
    _store = data;
  },
  get(): StoredResult | null {
    return _store;
  },
  clear() {
    _store = null;
  },
};
