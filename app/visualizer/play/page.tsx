"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SynthesiaView from "@/components/SynthesiaView";
import { sheetStore, SheetData } from "@/lib/sheetStore";
import { authHeaders } from "@/lib/auth";
import { API_URL } from "@/lib/config";

export default function VisualizerPlayPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [data, setData]       = useState<SheetData | null>(null);
  const [error, setError]     = useState(false);
  const [loading, setLoading] = useState(true);

  const sessionId = searchParams.get("session");
  const isAnon    = searchParams.get("anon") === "1";

  useEffect(() => {
    // If navigated directly from visualizer page, data is in memory
    const stored = sheetStore.get();
    if (stored && !sessionId) {
      setData(stored);
      setLoading(false);
      return;
    }

    // Otherwise load from saved session
    if (!sessionId) {
      router.replace("/visualizer");
      return;
    }

    const endpoint = isAnon
      ? `${API_URL}/sessions/anonymous/visualizer/${sessionId}`
      : `${API_URL}/sessions/visualizer/${sessionId}`;

    fetch(endpoint, { headers: authHeaders() })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((json) => {
        // Backend returns { title, source, created_at, sheet: SheetData }
        setData(json.sheet as SheetData);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [router, sessionId, isAnon]);

  if (loading) {
    return (
      <div className="h-screen w-full bg-surface flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-screen w-full bg-surface flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">Could not load this session.</p>
        <Link href="/library" className="text-brand-400 hover:underline text-sm">Back to library</Link>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-surface flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-surface-border shrink-0 min-w-0">
        <Link
          href={sessionId ? "/library" : "/visualizer"}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors shrink-0"
        >
          <ArrowLeft size={14} />
          {sessionId ? "Library" : "Back"}
        </Link>
        <span className="text-gray-700 shrink-0">·</span>
        <span className="text-sm font-medium text-gray-300 truncate min-w-0">{data.title}</span>
        <span className="ml-auto text-xs text-gray-600 shrink-0 whitespace-nowrap pl-4">
          {data.notes.length} notes · {data.tempo} BPM · {data.timeSignature}
        </span>
      </div>

      <div className="flex-1 overflow-auto p-4 min-h-0">
        <SynthesiaView data={data} />
      </div>
    </div>
  );
}
