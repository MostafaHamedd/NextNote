"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Music, Loader2 } from "lucide-react";
import clsx from "clsx";

import { API_URL } from "@/lib/config";

const DEBOUNCE_MS = 300;

interface SongResult {
  title:  string;
  artist: string;
  mbid:   string;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (title: string) => void;
  disabled?: boolean;
}

export default function SongSearchInput({ value, onChange, onSubmit, disabled }: Props) {
  const [results, setResults]             = useState<SongResult[]>([]);
  const [highlightIdx, setHighlightIdx]   = useState(-1);
  const [showDropdown, setShowDropdown]   = useState(false);
  const [searching, setSearching]         = useState(false);

  const wrapRef    = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef   = useRef<AbortController | null>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    // Cancel previous in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setSearching(true);
    try {
      const res = await fetch(
        `${API_URL}/search-songs?q=${encodeURIComponent(query)}`,
        { signal: abortRef.current.signal },
      );
      if (!res.ok) throw new Error("search failed");
      const data: SongResult[] = await res.json();
      setResults(data);
      setShowDropdown(data.length > 0);
      setHighlightIdx(-1);
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setResults([]);
        setShowDropdown(false);
      }
    } finally {
      setSearching(false);
    }
  }, []);

  const handleChange = (v: string) => {
    onChange(v);
    // Debounce the API call
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(v), DEBOUNCE_MS);
  };

  const pick = (r: SongResult) => {
    const label = r.artist ? `${r.title} – ${r.artist}` : r.title;
    onChange(label);
    setResults([]);
    setShowDropdown(false);
    setHighlightIdx(-1);
    onSubmit(label);
  };

  return (
    <div className="flex gap-2" ref={wrapRef}>
      <div className="relative flex-1">

        {/* Left icon: spinner while searching, magnifier otherwise */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
          {searching
            ? <Loader2 size={14} className="animate-spin text-brand-400" />
            : <Search  size={14} className="text-gray-500" />}
        </div>

        <input
          type="text"
          value={value}
          autoComplete="off"
          disabled={disabled}
          placeholder="Search any song or piece…"
          className="w-full pl-9 pr-4 py-2.5 bg-surface-3 border border-surface-border rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/60 transition-colors disabled:opacity-50"
          onChange={e => handleChange(e.target.value)}
          onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
          onKeyDown={e => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlightIdx(i => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlightIdx(i => Math.max(i - 1, -1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (highlightIdx >= 0 && results[highlightIdx]) {
                pick(results[highlightIdx]);
              } else {
                setShowDropdown(false);
                onSubmit(value);
              }
            } else if (e.key === "Escape") {
              setShowDropdown(false);
            }
          }}
        />

        {/* Dropdown */}
        {showDropdown && results.length > 0 && (
          <ul className="absolute left-0 right-0 top-[calc(100%+4px)] bg-surface-2 border border-surface-border rounded-xl shadow-xl z-50 overflow-hidden">
            {results.map((r, i) => (
              <li
                key={r.mbid || `${r.title}-${i}`}
                onMouseDown={() => pick(r)}
                onMouseEnter={() => setHighlightIdx(i)}
                className={clsx(
                  "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors text-sm",
                  i === highlightIdx
                    ? "bg-brand-600/30 text-white"
                    : "text-gray-300 hover:bg-surface-3",
                )}
              >
                <Music size={13} className="text-brand-400 shrink-0" />
                <span className="flex-1 truncate">
                  <span className="font-medium">{r.title}</span>
                  {r.artist && (
                    <span className="text-gray-500 ml-1.5 text-xs">{r.artist}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={() => { setShowDropdown(false); onSubmit(value); }}
        disabled={!value.trim() || disabled}
        className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition-all shadow-lg shadow-brand-900/30"
      >
        Load
      </button>
    </div>
  );
}
