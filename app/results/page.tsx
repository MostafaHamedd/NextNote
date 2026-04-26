"use client";

import { useEffect, useState, Suspense, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Loader2, ChevronDown, Info } from "lucide-react";
import AnalysisResult from "@/components/AnalysisResult";
import { resultStore } from "@/lib/resultStore";
import { authHeaders } from "@/lib/auth";
import { API_URL } from "@/lib/config";
import clsx from "clsx";

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  const [data, setData] = useState<{ analysis: any; feedback: any } | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [source, setSource] = useState<string | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);

  const isAnon = searchParams.get("anon") === "1";

  // Export MIDI state (lifted here from AnalysisResult)
  const [midiDownloading, setMidiDownloading] = useState<"standard" | "full" | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e: MouseEvent) => {
      if (!exportRef.current?.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [exportOpen]);

  const handleDownloadMidi = useCallback(async (doubleOctave: boolean) => {
    if (!data?.analysis) return;
    const key = doubleOctave ? "full" : "standard";
    setMidiDownloading(key);
    try {
      const body: Record<string, unknown> = {
        chord_sequence: data.analysis.chord_sequence ?? data.analysis.chords,
        bpm: data.analysis.bpm,
        double_octave: doubleOctave,
        duration_seconds: data.analysis.duration_seconds,
      };
      const res = await fetch(`${API_URL}/piano-midi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const { midi_b64 } = await res.json();
      const binary = atob(midi_b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const suffix = doubleOctave ? "_full" : "";
      const url = URL.createObjectURL(new Blob([bytes], { type: "audio/midi" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.analysis.key}_${data.analysis.mode}_${data.analysis.bpm}bpm_piano${suffix}.mid`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silently ignore
    } finally {
      setMidiDownloading(null);
    }
  }, [data]);

  useEffect(() => {
    if (sessionId) {
      const endpoint = isAnon
        ? `${API_URL}/sessions/anonymous/guitar/${sessionId}`
        : `${API_URL}/sessions/guitar/${sessionId}`;
      fetch(endpoint, { headers: authHeaders() })
        .then((r) => {
          if (!r.ok) throw new Error();
          return r.json();
        })
        .then((s) => {
          setData({ analysis: s.analysis, feedback: s.feedback });
          setLabel(s.label);
        })
        .catch(() => {
          setLoadError(true);
          router.replace("/library");
        });
      return;
    }

    const stored = resultStore.get();
    if (!stored) {
      router.replace("/analyze");
      return;
    }

    setData({ analysis: stored.analysis, feedback: stored.feedback });
    setLabel(stored.label);
    setSource(stored.source);

    if (stored.audioBlob) {
      const url = URL.createObjectURL(stored.audioBlob);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [router, sessionId]);

  if (loadError || !data) return null;

  const fmt = (s: number) =>
    s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Top bar: back + export */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <Link
              href={sessionId ? "/library" : "/analyze"}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-2"
            >
              <ArrowLeft size={14} />
              {sessionId ? "Library" : source === "song" ? "Song Analysis" : "New analysis"}
            </Link>
            {label && (
              <h1 className="text-2xl font-bold text-white leading-tight">{label}</h1>
            )}
            {data.analysis && (
              <p className="text-sm text-gray-500 mt-1">
                Analyzed today
                {data.analysis.duration_seconds
                  ? ` · ${fmt(data.analysis.duration_seconds)} recording`
                  : ""}
              </p>
            )}
          </div>

          {/* Export MIDI button */}
          <div ref={exportRef} className="relative shrink-0 mt-1">
            <button
              onClick={() => setExportOpen((v) => !v)}
              disabled={midiDownloading !== null}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-colors disabled:opacity-60 shadow-lg shadow-brand-900/30"
            >
              {midiDownloading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              {midiDownloading ? "Generating…" : "Export MIDI"}
              {!midiDownloading && (
                <ChevronDown size={13} className={clsx("transition-transform", exportOpen && "rotate-180")} />
              )}
            </button>

            {exportOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-surface-2 border border-surface-border rounded-xl shadow-xl z-20 overflow-hidden">
                <button
                  onClick={() => { setExportOpen(false); handleDownloadMidi(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-surface-3 hover:text-white transition-colors"
                >
                  <Download size={13} className="text-brand-400 shrink-0" />
                  MIDI — Standard
                </button>
                <div className="mx-3 border-t border-surface-border" />
                <button
                  onClick={() => { setExportOpen(false); handleDownloadMidi(true); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-surface-3 hover:text-white transition-colors"
                >
                  <Download size={13} className="text-brand-400 shrink-0" />
                  MIDI — Full Octave
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Song source banner */}
        {source === "song" && (
          <div className="flex items-start gap-3 bg-brand-900/20 border border-brand-800/40 rounded-2xl px-4 py-3 mb-6 text-sm text-brand-300">
            <Info size={15} className="shrink-0 mt-0.5 text-brand-400" />
            <span>
              Harmony derived from a <strong>reference MIDI arrangement</strong> — chord accuracy depends on MIDI quality. Sonic Feel values are placeholder estimates.
            </span>
          </div>
        )}

        {/* Audio player (guitar path only) */}
        {source !== "song" && (
          <div className="bg-surface-2 rounded-2xl p-5 mb-6 border border-surface-border mt-4">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">
              Playback
            </p>
            {audioUrl ? (
              <audio controls src={audioUrl} className="w-full rounded-xl h-10" />
            ) : (
              <p className="text-xs text-gray-600 italic">
                Audio not available for restored sessions
              </p>
            )}
          </div>
        )}

        {/* Analysis */}
        <AnalysisResult analysis={data.analysis} feedback={data.feedback} />

        <footer className="mt-16 text-center text-sm text-gray-600">
          <p>NextNote — Chords, piano view &amp; MIDI for your DAW</p>
        </footer>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense>
      <ResultsContent />
    </Suspense>
  );
}
