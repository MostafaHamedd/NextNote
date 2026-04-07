"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SynthesiaView from "@/components/SynthesiaView";
import { sheetStore, SheetData } from "@/lib/sheetStore";

export default function VisualizerPlayPage() {
  const router = useRouter();
  const [data, setData] = useState<SheetData | null>(null);

  useEffect(() => {
    const stored = sheetStore.get();
    if (!stored) {
      router.replace("/visualizer");
      return;
    }
    setData(stored);
  }, [router]);

  if (!data) return null;

  return (
    <div className="h-screen w-full bg-surface flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-surface-border shrink-0 min-w-0">
        <Link
          href="/visualizer"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors shrink-0"
        >
          <ArrowLeft size={14} />
          Back
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
