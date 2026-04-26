"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Mic, Upload, PenLine } from "lucide-react";
import clsx from "clsx";
import AudioRecorder from "@/components/AudioRecorder";
import FileUpload from "@/components/FileUpload";
import LoadingState from "@/components/LoadingState";
import { useSessionHistory } from "@/hooks/useSessionHistory";
import { resultStore } from "@/lib/resultStore";
import { useFreeAttempts } from "@/hooks/useFreeAttempts";
import { usePlatform } from "@/context/PlatformContext";
import { authHeaders } from "@/lib/auth";
import { API_URL } from "@/lib/config";

type Tab = "record" | "upload";

export default function AnalyzePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("record");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { saveSession } = useSessionHistory();
  const { free_mode } = usePlatform();
  const { remaining, checkAccess, recordUsage } = useFreeAttempts();

  const analyzeAudio = useCallback(
    async (audioData: Blob | File, label?: string) => {
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

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 py-12">

      {/* Page header */}
      <div className="text-center mb-8 max-w-lg">
        <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/25 rounded-full px-3.5 py-1.5 mb-5">
          <PenLine size={13} className="text-brand-400" />
          <span className="text-sm font-medium text-brand-300">Guitar Analysis</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Guitar → Piano</h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          Record or upload your guitar playing. Get chords, key, tempo — and export MIDI for your DAW.
        </p>

        {!free_mode && remaining !== null && remaining > 0 && (
          <p className="text-xs text-gray-500 mt-3">
            {remaining} free {remaining === 1 ? "analysis" : "analyses"} remaining —{" "}
            <a href="/login" className="text-brand-400 hover:underline">sign in</a> for unlimited
          </p>
        )}
      </div>

      {/* Card */}
      <div className="w-full max-w-xl bg-surface-2 rounded-2xl border border-surface-border shadow-2xl shadow-black/40 overflow-hidden">

        {/* Tabs */}
        <div className="flex border-b border-surface-border">
          {([
            { id: "record" as Tab, label: "Record", icon: Mic },
            { id: "upload" as Tab, label: "Upload File", icon: Upload },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-3.5 px-4 text-sm font-medium transition-all",
                tab === id
                  ? "bg-brand-600 text-white"
                  : "text-gray-500 hover:text-gray-300 hover:bg-surface-3/50"
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-8">
          {tab === "record" && (
            <AudioRecorder onAudioReady={analyzeAudio} isAnalyzing={isAnalyzing} />
          )}
          {tab === "upload" && (
            <FileUpload onFileSelected={analyzeAudio} isAnalyzing={isAnalyzing} />
          )}
        </div>
      </div>

      {/* Loading */}
      {isAnalyzing && (
        <div className="w-full max-w-xl bg-surface-2 rounded-2xl border border-surface-border p-8 mt-4 shadow-xl">
          <LoadingState />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="w-full max-w-xl bg-red-900/20 border border-red-800/50 rounded-2xl p-5 mt-4 flex items-start gap-3">
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
    </div>
  );
}
