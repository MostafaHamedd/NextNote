"use client";

import { useState, useCallback } from "react";
import { Filter, Download, Zap } from "lucide-react";
import clsx from "clsx";
import FileUpload from "@/components/FileUpload";
import { authHeaders } from "@/lib/auth";
import { useFreeAttempts } from "@/hooks/useFreeAttempts";
import { usePlatform } from "@/context/PlatformContext";
import { API_URL } from "@/lib/config";

type PowerFreq = 50 | 60;

interface NoiseRemovalResult {
  cleaned_audio_b64: string;
  frequency: number;
  harmonics_removed: number[];
  noise_reduction_db: number;
  sample_rate: number;
}

export default function NoiseRemovalPage() {
  const { free_mode } = usePlatform();
  const { remaining, checkAccess, recordUsage } = useFreeAttempts();

  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<NoiseRemovalResult | null>(null);
  const [filename, setFilename] = useState("audio");
  const [error, setError] = useState<string | null>(null);

  // Options
  const [frequency, setFrequency] = useState<PowerFreq>(60);
  const [numHarmonics, setNumHarmonics] = useState(4);

  const handleFile = useCallback(async (file: File) => {
    if (!checkAccess("/noise-removal")) return;
    setIsProcessing(true);
    setResult(null);
    setError(null);
    setFilename(file.name.replace(/\.[^.]+$/, ""));

    try {
      const form = new FormData();
      form.append("file", file);

      const params = new URLSearchParams({
        frequency: String(frequency),
        num_harmonics: String(numHarmonics),
      });

      const res = await fetch(`${API_URL}/noise-removal/clean?${params}`, {
        method: "POST",
        headers: authHeaders(),
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error: ${res.status}`);
      }

      const data: NoiseRemovalResult = await res.json();
      setResult(data);
      recordUsage();
    } catch (e: any) {
      setError(e.message || "Processing failed. Is the backend running?");
    } finally {
      setIsProcessing(false);
    }
  }, [frequency, numHarmonics, checkAccess, recordUsage]);

  const downloadCleaned = () => {
    if (!result) return;
    const bytes = Uint8Array.from(atob(result.cleaned_audio_b64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_cleaned.mp3`;
    a.click();
    URL.revokeObjectURL(url);
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
      <div className="absolute top-24 right-1/4 w-64 h-64 bg-teal-600/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 sm:py-14">

        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-full px-4 py-1.5 mb-6">
            <Filter size={14} className="text-teal-400" />
            <span className="text-sm font-medium text-teal-300">Noise Removal</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 leading-tight">
            Remove power line hum
          </h1>
          <p className="text-gray-400 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
            Upload any audio recording. Precision notch filters silently strip 50 Hz or 60 Hz
            electrical hum and its harmonics, leaving your music intact.
          </p>

          {!free_mode && remaining !== null && remaining > 0 && (
            <div className="inline-flex items-center gap-2 mt-4 bg-surface-3/60 border border-surface-border rounded-full px-4 py-1.5">
              <span className="text-xs text-gray-400">
                {remaining} free {remaining === 1 ? "use" : "uses"} remaining —{" "}
                <a href="/login" className="text-brand-400 hover:underline">sign in</a> for unlimited
              </span>
            </div>
          )}
        </div>

        {/* Upload card */}
        <div className="max-w-xl mx-auto glass rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/40 mb-6">
          <FileUpload onFileSelected={handleFile} isAnalyzing={isProcessing} submitLabel="Remove Noise" />
        </div>

        {/* Options */}
        {!isProcessing && !result && (
          <div className="max-w-xl mx-auto glass rounded-2xl p-5 border border-surface-border mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Options</p>

            {/* Power line frequency */}
            <div className="mb-4">
              <p className="text-sm text-gray-300 font-medium mb-2">Power line frequency</p>
              <div className="flex gap-2">
                {([60, 50] as PowerFreq[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFrequency(f)}
                    className={clsx(
                      "flex-1 py-2 rounded-xl text-sm font-medium border transition-all",
                      frequency === f
                        ? "bg-teal-600 text-white border-teal-600"
                        : "bg-surface-3 text-gray-400 border-surface-border hover:text-white"
                    )}
                  >
                    {f === 60 ? "60 Hz — Americas / Japan" : "50 Hz — Europe / Asia / Africa"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-1.5">
                Match your region's mains frequency for best results.
              </p>
            </div>

            {/* Harmonics */}
            <div>
              <p className="text-sm text-gray-300 font-medium mb-1">Harmonics to remove</p>
              <p className="text-xs text-gray-600 mb-2">
                Removes the fundamental plus up to {numHarmonics} harmonic{numHarmonics > 1 ? "s" : ""} ({" "}
                {Array.from({ length: numHarmonics }, (_, i) => `${frequency * (i + 1)} Hz`).join(", ")}).
              </p>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => setNumHarmonics(n)}
                    className={clsx(
                      "flex-1 py-2 rounded-xl text-sm font-medium border transition-all",
                      numHarmonics === n
                        ? "bg-teal-600 text-white border-teal-600"
                        : "bg-surface-3 text-gray-400 border-surface-border hover:text-white"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {isProcessing && (
          <div className="max-w-xl mx-auto glass rounded-2xl p-8 border border-surface-border text-center mb-6">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-medium mb-1">Filtering audio…</p>
            <p className="text-gray-500 text-sm">Applying notch filters to remove power line hum.</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="max-w-xl mx-auto bg-red-900/20 border border-red-800/50 rounded-2xl p-5 mb-6 flex items-start gap-3">
            <Zap size={16} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-400 mb-1">Processing failed</p>
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

        {/* Result */}
        {result && !isProcessing && (
          <>
            <div className="flex items-center justify-between mb-5 max-w-xl mx-auto">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Result</h2>
              <button
                onClick={() => { setResult(null); setError(null); }}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                Process another file
              </button>
            </div>

            <div className="max-w-xl mx-auto glass rounded-2xl p-6 border border-teal-500/20 mb-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-teal-400">{result.frequency} Hz</p>
                  <p className="text-xs text-gray-500 mt-1">Fundamental</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{result.harmonics_removed.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Bands removed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-teal-400">{result.noise_reduction_db} dB</p>
                  <p className="text-xs text-gray-500 mt-1">Noise floor</p>
                </div>
              </div>

              {/* Frequencies */}
              <div className="mb-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notched frequencies</p>
                <div className="flex flex-wrap gap-2">
                  {result.harmonics_removed.map((hz) => (
                    <span
                      key={hz}
                      className="px-3 py-1 bg-teal-600/15 border border-teal-500/30 rounded-full text-xs text-teal-300 font-mono"
                    >
                      {hz} Hz
                    </span>
                  ))}
                </div>
              </div>

              {/* Sample rate */}
              <p className="text-xs text-gray-600 mb-5">
                Sample rate: {(result.sample_rate / 1000).toFixed(1)} kHz
              </p>

              {/* Download button */}
              <button
                onClick={downloadCleaned}
                className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                <Download size={16} />
                Download cleaned MP3
              </button>
            </div>
          </>
        )}

        <footer className="mt-16 text-center text-sm text-gray-600">
          <p>NextNote — Noise Removal</p>
        </footer>
      </div>
    </div>
  );
}
