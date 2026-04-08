"use client";

import { useState, useCallback } from "react";
import { Upload, Wand2, Zap } from "lucide-react";
import clsx from "clsx";
import FileUpload from "@/components/FileUpload";
import ProducerResult, { type ProducerData } from "@/components/ProducerResult";
import { authHeaders } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Grid = "1/8" | "1/16";

export default function ProducerPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ProducerData | null>(null);
  const [filename, setFilename] = useState("audio");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");

  // Options
  const [snapToKey, setSnapToKey] = useState(false);
  const [grid, setGrid] = useState<Grid>("1/16");

  const handleFile = useCallback(async (file: File) => {
    setIsAnalyzing(true);
    setResult(null);
    setError(null);
    setFilename(file.name);
    setProgress("Extracting key, tempo & harmony…");

    try {
      const form = new FormData();
      form.append("file", file);

      const params = new URLSearchParams({
        snap_to_key: snapToKey ? "true" : "false",
        grid,
      });

      setProgress("Running pitch detection (this can take 10–30 s on longer clips)…");

      const res = await fetch(`${API_URL}/producer/analyze?${params}`, {
        method: "POST",
        headers: authHeaders(),
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error: ${res.status}`);
      }

      const data: ProducerData = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Analysis failed. Is the backend running?");
    } finally {
      setIsAnalyzing(false);
      setProgress("");
    }
  }, [snapToKey, grid]);

  return (
    <div className="min-h-screen bg-surface relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-24 right-1/4 w-64 h-64 bg-purple-600/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 sm:py-14">

        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-4 py-1.5 mb-6">
            <Wand2 size={14} className="text-brand-400" />
            <span className="text-sm font-medium text-brand-300">Producer Intelligence</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 leading-tight">
            From audio to Logic Pro
          </h1>
          <p className="text-gray-400 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
            Drop any audio — vocal, synth, bass, loop, or rough mix. Get key, BPM, chord progression,
            and a downloadable MIDI melody line ready to drag into Logic Pro.
          </p>
        </div>

        {/* Upload card */}
        <div className="max-w-xl mx-auto glass rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/40 mb-6">
          <FileUpload onFileSelected={handleFile} isAnalyzing={isAnalyzing} />
        </div>

        {/* Options */}
        {!isAnalyzing && !result && (
          <div className="max-w-xl mx-auto glass rounded-2xl p-5 border border-surface-border mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Options</p>

            {/* Grid */}
            <div className="mb-4">
              <p className="text-sm text-gray-300 font-medium mb-2">Note grid</p>
              <div className="flex gap-2">
                {(["1/16", "1/8"] as Grid[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGrid(g)}
                    className={clsx(
                      "flex-1 py-2 rounded-xl text-sm font-medium border transition-all",
                      grid === g
                        ? "bg-brand-600 text-white border-brand-600"
                        : "bg-surface-3 text-gray-400 border-surface-border hover:text-white"
                    )}
                  >
                    {g === "1/16" ? "1/16 — Sixteenth" : "1/8 — Eighth"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-1.5">
                Sixteenth is tighter; eighth smooths out rapid passages.
              </p>
            </div>

            {/* Snap to key */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-gray-300 font-medium">Snap notes to key</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Moves out-of-scale notes to the nearest scale degree. Off by default.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={snapToKey}
                onClick={() => setSnapToKey((v) => !v)}
                className={clsx(
                  "relative shrink-0 h-6 w-11 rounded-full border-0 p-1 transition-colors mt-0.5",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50",
                  snapToKey ? "bg-brand-600" : "bg-surface-3"
                )}
              >
                <span
                  className={clsx(
                    "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200",
                    snapToKey ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {isAnalyzing && (
          <div className="max-w-xl mx-auto glass rounded-2xl p-8 border border-surface-border text-center mb-6">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-medium mb-1">Analysing audio…</p>
            <p className="text-gray-500 text-sm">{progress}</p>
            <p className="text-gray-600 text-xs mt-3">
              Pitch detection on long clips can take up to 30 s. Hang tight.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="max-w-xl mx-auto bg-red-900/20 border border-red-800/50 rounded-2xl p-5 mb-6 flex items-start gap-3">
            <Zap size={16} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-400 mb-1">Analysis failed</p>
              <p className="text-red-300/80 text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-400 text-sm underline mt-2 hover:text-red-300"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Result */}
        {result && !isAnalyzing && (
          <>
            <div className="flex items-center justify-between mb-5 max-w-4xl">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Results</h2>
              <button
                onClick={() => { setResult(null); setError(null); }}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                Analyse another file
              </button>
            </div>
            <ProducerResult data={result} filename={filename} />
          </>
        )}

        <footer className="mt-16 text-center text-sm text-gray-600">
          <p>NextNote — Producer Intelligence</p>
        </footer>
      </div>
    </div>
  );
}
