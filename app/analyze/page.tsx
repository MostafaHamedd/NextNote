"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mic, Upload, Zap, Lock } from "lucide-react";
import clsx from "clsx";
import AudioRecorder from "@/components/AudioRecorder";
import FileUpload from "@/components/FileUpload";
import LoadingState from "@/components/LoadingState";
// import SongSearchInput from "@/components/sheet/SongSearchInput";  // song harmony feature (disabled)
import { useSessionHistory } from "@/hooks/useSessionHistory";
import { resultStore } from "@/lib/resultStore";
import { useFreeAttempts } from "@/hooks/useFreeAttempts";
import { usePlatform } from "@/context/PlatformContext";
import { authHeaders } from "@/lib/auth";
import { API_URL } from "@/lib/config";

type Tab = "record" | "upload"; // | "song"  — song harmony feature (disabled)

export default function AnalyzePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("record");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { saveSession } = useSessionHistory();
  const { free_mode } = usePlatform();
  const { remaining, checkAccess, recordUsage } = useFreeAttempts();
  const [songQuery, setSongQuery] = useState("");

  const analyzeAudio = useCallback(
    async (audioData: Blob | File, label?: string) => {
      // Gate: check free attempts before calling API
      if (!checkAccess("/analyze")) return;

      setIsAnalyzing(true);
      setError(null);

      try {
        const file =
          audioData instanceof File
            ? audioData
            : new File([audioData], "recording.webm", { type: "audio/webm" });

        const form = new FormData();
        form.append("file", file);

        const res = await fetch(`${API_URL}/analyze`, {
          method: "POST",
          headers: authHeaders(),
          body: form,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Server error: ${res.status}`);
        }

        const data = await res.json();

        // Record usage after a successful analysis
        recordUsage();

        const resolvedLabel =
          label ?? (audioData instanceof File ? audioData.name : "Recording");

        saveSession({
          label: resolvedLabel,
          key: data.analysis.key,
          mode: data.analysis.mode,
          bpm: data.analysis.bpm,
          chords: data.analysis.chords,
          analysis: data.analysis,
          feedback: data.feedback,
        });

        resultStore.set({
          analysis: data.analysis,
          feedback: data.feedback,
          audioBlob: audioData,
          label: resolvedLabel,
        });

        router.push("/results");
      } catch (e: any) {
        setError(e.message || "Something went wrong. Is the backend running?");
      } finally {
        setIsAnalyzing(false);
      }
    },
    [saveSession, router, checkAccess, recordUsage]
  );

  const analyzeSong = useCallback(
    async (title: string) => {
      if (!title.trim()) return;
      if (!checkAccess("/analyze")) return;

      setIsAnalyzing(true);
      setError(null);

      try {
        const res = await fetch(`${API_URL}/song-harmony-analysis`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ title: title.trim() }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Server error: ${res.status}`);
        }

        const data = await res.json();
        recordUsage();

        resultStore.set({
          analysis: data.analysis,
          feedback: data.feedback,
          audioBlob: null,
          label: data.sheet_data?.title || title.trim(),
          source: "song",
          sheet_data: data.sheet_data,
        });

        router.push("/results");
      } catch (e: any) {
        setError(e.message || "Something went wrong. Is the backend running?");
      } finally {
        setIsAnalyzing(false);
      }
    },
    [router, checkAccess, recordUsage]
  );

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
      <div className="absolute top-24 right-1/4 w-64 h-64 bg-accent-purple/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 sm:py-16">

        <div className="max-w-2xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-4 py-1.5 mb-6">
            <Zap size={14} className="text-brand-400" />
            <span className="text-sm font-medium text-brand-300">Chords, MIDI export &amp; tempo</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
            <span className="gradient-text">NextNote</span>
          </h1>
          <p className="text-xl sm:text-2xl font-semibold text-white mb-4">
            Producer Brain<br />for Guitarists
          </p>
          <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
            Record or upload your guitar idea. Get chords, key, tempo, and a piano view—then download MIDI of the chord progression for Logic Pro or any DAW.
          </p>

          {/* Free attempt indicator (anonymous only, hidden in free_mode) */}
          {!free_mode && remaining !== null && remaining > 0 && (
            <div className="inline-flex items-center gap-2 mt-4 bg-surface-3/60 border border-surface-border rounded-full px-4 py-1.5">
              <Lock size={12} className="text-gray-500" />
              <span className="text-xs text-gray-400">
                {remaining} free {remaining === 1 ? "analysis" : "analyses"} remaining —{" "}
                <a href="/login" className="text-brand-400 hover:underline">sign in</a> for unlimited
              </span>
            </div>
          )}
        </div>

        <div className="max-w-xl mx-auto glass rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/40 mb-8">
          <div className="flex bg-surface-3 rounded-2xl p-1 mb-8">
            {([
              { id: "record" as Tab, label: "Record", icon: Mic },
              { id: "upload" as Tab, label: "Upload File", icon: Upload },
              // { id: "song" as Tab, label: "Song", icon: Music },  // song harmony feature (disabled)
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={clsx(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-sm transition-all",
                  tab === id
                    ? "bg-brand-600 text-white shadow-lg shadow-brand-900/30"
                    : "text-gray-500 hover:text-gray-300",
                )}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          {tab === "record" && (
            <AudioRecorder onAudioReady={analyzeAudio} isAnalyzing={isAnalyzing} />
          )}
          {tab === "upload" && (
            <FileUpload onFileSelected={analyzeAudio} isAnalyzing={isAnalyzing} />
          )}
          {/* song harmony tab disabled
          {tab === "song" && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 text-center">
                Search a song title to get harmony analysis from MIDI
              </p>
              <SongSearchInput
                value={songQuery}
                onChange={setSongQuery}
                onSubmit={analyzeSong}
                disabled={isAnalyzing}
                searchEndpoint={`${API_URL}/search-songs`}
              />
            </div>
          )}
          */}
        </div>

        {isAnalyzing && (
          <div className="max-w-xl mx-auto glass rounded-3xl p-8 shadow-2xl shadow-black/40 mb-8">
            <LoadingState />
          </div>
        )}

        {error && (
          <div className="max-w-xl mx-auto bg-red-900/20 border border-red-800/50 rounded-2xl p-5 mb-8 flex items-start gap-3">
            <span className="text-red-400 text-lg mt-0.5">!</span>
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

        <footer className="mt-16 text-center text-sm text-gray-600">
          <p>NextNote — Chords, piano view &amp; MIDI for your DAW</p>
        </footer>
      </div>
    </div>
  );
}
