"use client";

import { useState, useCallback } from "react";
import { Mic, Upload, Zap, History } from "lucide-react";
import clsx from "clsx";
import AudioRecorder from "@/components/AudioRecorder";
import FileUpload from "@/components/FileUpload";
import AnalysisResult from "@/components/AnalysisResult";
import LoadingState from "@/components/LoadingState";
import HistorySidebar from "@/components/HistorySidebar";
import { useSessionHistory, Session } from "@/hooks/useSessionHistory";

type Tab = "record" | "upload";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const [tab, setTab] = useState<Tab>("record");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{ analysis: any; feedback: any } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);

  const { sessions, saveSession, deleteSession, clearAll } = useSessionHistory();

  const analyzeAudio = useCallback(
    async (audioData: Blob | File, label?: string) => {
      setIsAnalyzing(true);
      setResult(null);
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
        setResult(data);

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

        setTimeout(() => {
          document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } catch (e: any) {
        setError(e.message || "Something went wrong. Is the backend running?");
      } finally {
        setIsAnalyzing(false);
      }
    },
    [saveSession]
  );

  const handleRestore = useCallback((session: Session) => {
    setResult({ analysis: session.analysis, feedback: session.feedback });
    setError(null);
    setShowSidebar(false);
    setTimeout(() => {
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  }, []);

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-surface relative overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-100 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* Gradient orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-24 right-1/4 w-64 h-64 bg-accent-purple/8 rounded-full blur-3xl pointer-events-none" />

      {/* History toggle — fixed top-left, always visible */}
      <button
        onClick={() => setShowSidebar(true)}
        className={clsx(
          "fixed top-5 left-5 z-30 flex items-center gap-2 px-3.5 py-2 rounded-xl",
          "glass border border-surface-border text-gray-400 hover:text-white",
          "hover:border-brand-600/50 transition-all text-sm font-medium shadow-lg"
        )}
      >
        <History size={16} />
        <span className="hidden sm:inline">History</span>
        {sessions.length > 0 && (
          <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center">
            {sessions.length > 9 ? "9+" : sessions.length}
          </span>
        )}
      </button>

      {/* Outer container */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12">

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
              <button onClick={handleReset} className="text-red-400 text-sm underline mt-2 hover:text-red-300">
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {result && !isAnalyzing && (
          <div id="results">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Your Analysis</h2>
              <button
                onClick={handleReset}
                className="text-sm text-gray-500 hover:text-gray-300 underline transition-colors"
              >
                Analyze another
              </button>
            </div>
            <AnalysisResult analysis={result.analysis} feedback={result.feedback} />
          </div>
        )}

        <footer className="mt-16 text-center text-sm text-gray-600">
          <p>AI Music Assistant — Guitar Analysis &amp; Producer Feedback</p>
        </footer>
      </div>

      {/* History sidebar */}
      <HistorySidebar
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        sessions={sessions}
        onRestore={handleRestore}
        onDelete={deleteSession}
        onClearAll={clearAll}
      />
    </div>
  );
}
