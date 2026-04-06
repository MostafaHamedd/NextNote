"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Mic, Upload, Zap } from "lucide-react";
import clsx from "clsx";
import AudioRecorder from "@/components/AudioRecorder";
import FileUpload from "@/components/FileUpload";
import LoadingState from "@/components/LoadingState";
import { useSessionHistory } from "@/hooks/useSessionHistory";
import { resultStore } from "@/lib/resultStore";

type Tab = "record" | "upload";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("record");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { saveSession } = useSessionHistory();

  const analyzeAudio = useCallback(
    async (audioData: Blob | File, label?: string) => {
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
          body: form,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Server error: ${res.status}`);
        }

        const data = await res.json();

        // Save to history
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

        // Stash result + audio for the results page
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
    [saveSession, router]
  );

  return (
    <div className="min-h-screen bg-surface relative overflow-hidden">
      {/* Background grid */}
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

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-16">

        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-4 py-1.5 mb-6">
            <Zap size={14} className="text-brand-400" />
            <span className="text-sm font-medium text-brand-300">Powered by GPT-4o</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
            <span className="gradient-text">NextNote</span>
          </h1>
          <p className="text-xl sm:text-2xl font-semibold text-white mb-4">
            Producer Brain<br />for Guitarists
          </p>
          <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
            Record or upload your guitar idea. Get instant analysis, chord detection, and actionable producer feedback.
          </p>
        </div>

        {/* Input card */}
        <div className="max-w-xl mx-auto glass rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/40 mb-8">
          {/* Tab switcher */}
          <div className="flex bg-surface-3 rounded-2xl p-1 mb-8">
            {([
              { id: "record" as Tab, label: "Record", icon: Mic },
              { id: "upload" as Tab, label: "Upload File", icon: Upload },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={clsx(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-sm transition-all",
                  tab === id
                    ? "bg-brand-600 text-white shadow-lg shadow-brand-900/30"
                    : "text-gray-500 hover:text-gray-300"
                )}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          {tab === "record" ? (
            <AudioRecorder onAudioReady={analyzeAudio} isAnalyzing={isAnalyzing} />
          ) : (
            <FileUpload onFileSelected={analyzeAudio} isAnalyzing={isAnalyzing} />
          )}
        </div>

        {/* Loading */}
        {isAnalyzing && (
          <div className="max-w-xl mx-auto glass rounded-3xl p-8 shadow-2xl shadow-black/40 mb-8">
            <LoadingState />
          </div>
        )}

        {/* Error */}
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
          <p>NextNote — Producer Brain for Guitarists</p>
        </footer>
      </div>
    </div>
  );
}
