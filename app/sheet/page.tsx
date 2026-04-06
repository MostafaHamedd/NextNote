"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Music, BookOpen, Upload } from "lucide-react";
import clsx from "clsx";
import { sheetStore } from "@/lib/sheetStore";
import LearnSongTab    from "@/components/sheet/LearnSongTab";
import SheetUploadTab  from "@/components/sheet/SheetUploadTab";
import LoadingCard     from "@/components/ui/LoadingCard";
import ErrorBanner     from "@/components/ui/ErrorBanner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Tab = "learn" | "upload";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "learn",  label: "Learn Song",    icon: BookOpen },
  { id: "upload", label: "Upload Sheet",  icon: Upload   },
];

export default function SheetPage() {
  const router = useRouter();
  const [tab, setTab]         = useState<Tab>("learn");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError]     = useState<string | null>(null);

  // Pending upload file (set by SheetUploadTab, consumed when user clicks Parse)
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const navigateToPlay = (data: object) => {
    sheetStore.set(data as any);
    router.push("/sheet/play");
  };

  // ── Learn Song ───────────────────────────────────────────────────────────
  const handleLearnSong = async (title: string) => {
    setLoading(true);
    setError(null);
    setProgress(`Asking GPT-4o to transcribe "${title}"…`);
    try {
      const res = await fetch(`${API_URL}/learn-song`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error: ${res.status}`);
      }
      const data = await res.json();
      if (!data.notes?.length) throw new Error("No notes returned. Try a more specific title.");
      navigateToPlay(data);
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  // ── Upload Sheet ─────────────────────────────────────────────────────────
  const handleUploadAnalyze = async () => {
    if (!pendingFile) return;
    setLoading(true);
    setError(null);
    setProgress("Parsing with GPT-4o Vision… this may take 30–60s");
    try {
      const form = new FormData();
      form.append("file", pendingFile);
      const res = await fetch(`${API_URL}/parse-sheet`, { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error: ${res.status}`);
      }
      const data = await res.json();
      if (!data.notes?.length) throw new Error("No notes detected. Try a clearer image.");
      navigateToPlay(data);
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const isPDF = pendingFile?.name.toLowerCase().endsWith(".pdf");

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

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-16">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-4 py-1.5 mb-5">
            <Music size={14} className="text-brand-400" />
            <span className="text-sm font-medium text-brand-300">Piano Visualizer</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Learn Piano</h1>
          <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
            Search a song by name or upload sheet music — watch the keys light up as it plays.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-surface-3 rounded-2xl p-1 mb-6 border border-surface-border">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setError(null); }}
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

        {/* Tab content */}
        {tab === "learn" && (
          <LearnSongTab loading={loading} onLoad={handleLearnSong} />
        )}

        {tab === "upload" && (
          <SheetUploadTab onFileReady={f => { setPendingFile(f); setError(null); }} />
        )}

        {/* Shared error */}
        {error && <ErrorBanner message={error} className="mt-4" />}

        {/* Upload CTA */}
        {tab === "upload" && pendingFile && !loading && (
          <button
            onClick={handleUploadAnalyze}
            className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-white bg-gradient-to-r from-brand-600 to-accent-purple hover:opacity-90 transition-all shadow-lg shadow-brand-900/30"
          >
            <Music size={17} />
            Parse &amp; Visualize
          </button>
        )}

        {/* Loading state */}
        {loading && (
          <LoadingCard
            message={progress}
            hint={
              tab === "learn"
                ? "GPT-4o is transcribing the full piece — usually 10–20s."
                : isPDF
                ? "Each page is analysed separately and merged."
                : "High-detail analysis enabled."
            }
          />
        )}

        <p className="text-center text-xs text-gray-600 mt-8 leading-relaxed">
          {tab === "learn"
            ? "Best for classical pieces and well-known songs. GPT-4o may approximate lesser-known works."
            : "Best results with printed/engraved scores. Handwritten scores may have errors."}
        </p>
      </div>
    </div>
  );
}
