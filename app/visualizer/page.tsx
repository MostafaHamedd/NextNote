"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Music, BookOpen, Music2 } from "lucide-react";
import clsx from "clsx";
import { sheetStore } from "@/lib/sheetStore";
import LearnSongTab from "@/components/sheet/LearnSongTab";
import MidiUploadTab from "@/components/sheet/MidiUploadTab";
import LoadingCard from "@/components/ui/LoadingCard";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { useFreeAttempts } from "@/hooks/useFreeAttempts";
import { authHeaders } from "@/lib/auth";
import { API_URL } from "@/lib/config";

type Tab = "learn" | "midi";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "learn", label: "Piano visualizer", icon: BookOpen },
  { id: "midi", label: "Upload MIDI", icon: Music2 },
];

export default function VisualizerPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("learn");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingMidi, setPendingMidi] = useState<File | null>(null);
  const { checkAccess, recordUsage } = useFreeAttempts();

  const navigateToPlay = (data: object) => {
    sheetStore.set(data as any);
    router.push("/visualizer/play");
  };

  const handleLearnSong = async (title: string) => {
    if (!checkAccess("/visualizer")) return;

    setLoading(true);
    setError(null);
    setProgress(`Searching MIDI for "${title}"…`);
    try {
      const res = await fetch(`${API_URL}/learn-song`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error: ${res.status}`);
      }
      const data = await res.json();
      if (!data.notes?.length) throw new Error("No notes returned. Try a more specific title.");
      recordUsage();
      navigateToPlay(data);
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const handleMidiUpload = async () => {
    if (!pendingMidi) return;
    if (!checkAccess("/visualizer")) return;

    setLoading(true);
    setError(null);
    setProgress("Parsing MIDI file…");
    try {
      const form = new FormData();
      form.append("file", pendingMidi);
      const res = await fetch(`${API_URL}/upload-midi`, {
        method: "POST",
        headers: authHeaders(),
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error: ${res.status}`);
      }
      const data = await res.json();
      if (!data.notes?.length) throw new Error("No notes found in this MIDI file.");
      recordUsage();
      navigateToPlay(data);
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

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

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 sm:py-16">

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-4 py-1.5 mb-5">
            <Music size={14} className="text-brand-400" />
            <span className="text-sm font-medium text-brand-300">Piano visualizer</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Piano visualizer</h1>
          <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
            Search a song by name or upload a MIDI file — follow along on the piano keyboard.
          </p>
        </div>

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

        {tab === "learn" && (
          <LearnSongTab loading={loading} onLoad={handleLearnSong} />
        )}

        {tab === "midi" && (
          <MidiUploadTab onFileReady={f => { setPendingMidi(f); setError(null); }} />
        )}

        {error && <ErrorBanner message={error} className="mt-4" />}

        {tab === "midi" && pendingMidi && !loading && (
          <button
            onClick={handleMidiUpload}
            className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-white bg-gradient-to-r from-brand-600 to-accent-purple hover:opacity-90 transition-all shadow-lg shadow-brand-900/30"
          >
            <Music2 size={17} />
            Visualize MIDI
          </button>
        )}

        {loading && (
          <LoadingCard
            message={progress}
            hint={
              tab === "learn"
                ? "Searching MIDI databases — usually under 10s."
                : "Reading note timings, hand assignment, and sustain pedal…"
            }
          />
        )}

        <p className="text-center text-xs text-gray-600 mt-8 leading-relaxed">
          {tab === "learn"
            ? "Best for classical pieces and well-known songs."
            : "Supports standard MIDI files. Both hands, tempo changes, and sustain are detected automatically."}
        </p>
      </div>
    </div>
  );
}
