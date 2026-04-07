"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Music2 } from "lucide-react";
import AnalysisResult from "@/components/AnalysisResult";
import { resultStore } from "@/lib/resultStore";

export default function ResultsPage() {
  const router = useRouter();
  const [data, setData] = useState<{ analysis: any; feedback: any } | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [label, setLabel] = useState("");

  useEffect(() => {
    const stored = resultStore.get();
    if (!stored) {
      router.replace("/analyze");
      return;
    }

    setData({ analysis: stored.analysis, feedback: stored.feedback });
    setLabel(stored.label);

    if (stored.audioBlob) {
      const url = URL.createObjectURL(stored.audioBlob);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [router]);

  if (!data) return null;

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

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">

        {/* Back + file label row */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/analyze"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            <ArrowLeft size={14} />
            Guitar → Piano
          </Link>
          {label && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Music2 size={13} />
              <span className="truncate max-w-[220px]">{label}</span>
            </div>
          )}
        </div>

        {/* Audio player */}
        <div className="glass rounded-2xl p-5 mb-6 border border-surface-border">
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

        {/* Analysis */}
        <AnalysisResult analysis={data.analysis} feedback={data.feedback} />

        <footer className="mt-16 text-center text-sm text-gray-600">
          <p>NextNote — Producer Brain for Guitarists</p>
        </footer>
      </div>
    </div>
  );
}
