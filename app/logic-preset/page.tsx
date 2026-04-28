"use client";

import { useState, useCallback } from "react";
import {
  Upload, FileAudio, X, Sparkles, Zap,
  Activity, Sliders, Waves, Music2, ChevronRight
} from "lucide-react";
import clsx from "clsx";
import LogicPresetCard from "@/components/LogicPresetCard";
import { API_URL } from "@/lib/config";
import { authHeaders } from "@/lib/auth";

interface ToneAnalysis {
  duration_seconds: number;
  bpm: number;
  brightness: number;
  warmth: number;
  distortion_proxy: number;
  dynamic_level: number;
  harmonic_sustain: number;
  playing_style: string;
  onset_density_per_sec: number;
}

interface PresetResult {
  tone_analysis: ToneAnalysis;
  presets: {
    presets: any[];
    tone_summary: {
      detected_style: string;
      brightness: number;
      warmth: number;
      distortion: number;
      presence: number;
      sustain: number;
    };
  };
}

function ToneBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-500">{label}</span>
        <span className="text-gray-400 tabular-nums font-mono">{Math.round(value * 100)}</span>
      </div>
      <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value * 100}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function LogicPresetPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<PresetResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setSelectedFile(file);
    setAudioUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  };

  const reset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setSelectedFile(null);
    setAudioUrl(null);
    setResult(null);
    setError(null);
  };

  const analyze = useCallback(async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("file", selectedFile);

      const res = await fetch(`${API_URL}/logic-preset`, {
        method: "POST",
        headers: authHeaders(),
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Analysis failed. Is the backend running?");
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedFile]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const summary = result?.presets?.tone_summary;
  const presets = result?.presets?.presets ?? [];
  const tone = result?.tone_analysis;

  return (
    <div className="min-h-screen bg-surface px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/25 rounded-full px-4 py-1.5">
            <Sparkles size={13} className="text-brand-400" />
            <span className="text-sm font-medium text-brand-300">Logic Pro Preset Builder</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Guitar → Logic Pro Preset</h1>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Upload a guitar recording and get AI-matched Logic Pro presets with exact plugin settings — ready to dial in.
          </p>
        </div>

        {/* Upload card */}
        <div className="bg-surface-2 rounded-2xl border border-surface-border p-6 shadow-xl shadow-black/30">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => !isAnalyzing && document.getElementById("lp-file-input")?.click()}
            className={clsx(
              "border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all",
              dragOver
                ? "border-brand-500 bg-brand-500/8"
                : selectedFile
                  ? "border-surface-border hover:border-brand-600/40"
                  : "border-surface-border hover:border-brand-600/50 hover:bg-brand-500/5"
            )}
          >
            <input
              id="lp-file-input"
              type="file"
              accept=".mp3,.wav,.m4a,.ogg,.flac,.aiff,.webm"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              className="hidden"
            />
            {!selectedFile ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className={clsx(
                  "p-4 rounded-2xl transition-all",
                  dragOver ? "bg-brand-500/20" : "bg-surface-3"
                )}>
                  <Upload size={24} className={dragOver ? "text-brand-400" : "text-gray-500"} />
                </div>
                <div>
                  <p className="text-gray-300 font-medium">
                    {dragOver ? "Drop it!" : "Drop your guitar recording"}
                  </p>
                  <p className="text-gray-600 text-sm mt-1">MP3, WAV, M4A, FLAC · any guitar style</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-500/15 rounded-xl shrink-0">
                  <FileAudio size={20} className="text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-200 font-medium text-sm truncate">{selectedFile.name}</p>
                  <p className="text-gray-500 text-xs">
                    {(selectedFile.size / 1024 / 1024).toFixed(1)} MB · click to swap
                  </p>
                </div>
                {!isAnalyzing && (
                  <button
                    onClick={(e) => { e.stopPropagation(); reset(); }}
                    className="p-1.5 rounded-lg hover:bg-surface-3 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            )}
          </div>

          {audioUrl && (
            <audio controls src={audioUrl} className="w-full h-10 rounded-xl opacity-70 mt-3" />
          )}

          {selectedFile && (
            <button
              onClick={analyze}
              disabled={isAnalyzing}
              className="flex items-center justify-center gap-2 w-full mt-4 py-3 bg-gradient-to-r from-brand-600 to-accent-purple rounded-full font-semibold text-white hover:opacity-90 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 shadow-lg shadow-brand-900/40"
            >
              <Sparkles size={16} />
              {isAnalyzing ? "Analyzing tone…" : "Generate Logic Pro Presets"}
            </button>
          )}
        </div>

        {/* Loading */}
        {isAnalyzing && (
          <div className="bg-surface-2 rounded-2xl border border-surface-border p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2 border-brand-600/20" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Music2 size={20} className="text-brand-400" />
                </div>
              </div>
            </div>
            <div>
              <p className="text-white font-semibold">Analyzing Guitar Tone</p>
              <p className="text-gray-500 text-sm mt-1">Extracting tonal characteristics and matching Logic Pro presets…</p>
            </div>
            <div className="flex justify-center gap-6 text-xs text-gray-600">
              {["Spectral analysis", "Tone matching", "Generating presets"].map((s, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-800/50 rounded-2xl p-5 flex items-start gap-3">
            <span className="text-red-400 text-lg">!</span>
            <div>
              <p className="font-semibold text-red-400">Analysis failed</p>
              <p className="text-red-300/80 text-sm mt-1">{error}</p>
              <button onClick={() => setError(null)} className="text-red-400 text-sm underline mt-2">Dismiss</button>
            </div>
          </div>
        )}

        {/* Results */}
        {result && !isAnalyzing && (
          <div className="space-y-6">

            {/* Tone analysis header */}
            <div className="bg-surface-2 rounded-2xl border border-surface-border p-6">
              <div className="flex items-center gap-2 mb-5">
                <Activity size={16} className="text-brand-400" />
                <h2 className="text-sm font-semibold text-white uppercase tracking-widest">Detected Tone Profile</h2>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Left: tone bars */}
                <div className="space-y-3">
                  {summary && (
                    <>
                      <ToneBar label="Brightness" value={summary.brightness} color="#f59e0b" />
                      <ToneBar label="Warmth"     value={summary.warmth}     color="#f97316" />
                      <ToneBar label="Distortion" value={summary.distortion} color="#ef4444" />
                      <ToneBar label="Presence"   value={summary.presence}   color="#3b82f6" />
                      <ToneBar label="Sustain"    value={summary.sustain}    color="#10b981" />
                    </>
                  )}
                </div>

                {/* Right: stats */}
                <div className="space-y-3">
                  {summary && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/10 border border-brand-500/20">
                      <Sparkles size={12} className="text-brand-400" />
                      <span className="text-sm text-brand-300 font-medium capitalize">{summary.detected_style}</span>
                    </div>
                  )}
                  {tone && (
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { icon: Activity, label: "BPM",    value: tone.bpm },
                        { icon: Waves,    label: "Style",  value: tone.playing_style },
                        { icon: Sliders,  label: "Duration", value: `${tone.duration_seconds}s` },
                        { icon: Zap,      label: "Onsets/s", value: tone.onset_density_per_sec },
                      ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="bg-surface-3 rounded-xl p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Icon size={11} className="text-gray-500" />
                            <span className="text-[10px] text-gray-600 uppercase tracking-wide">{label}</span>
                          </div>
                          <p className="text-sm font-semibold text-white truncate">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Presets */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={15} className="text-brand-400" />
                <h2 className="text-base font-bold text-white">Matched Presets</h2>
                <span className="text-xs text-gray-500 bg-surface-3 px-2 py-0.5 rounded-full">
                  {presets.length} options
                </span>
              </div>

              <div className="space-y-3">
                {presets.map((preset: any, i: number) => (
                  <LogicPresetCard key={preset.id ?? i} preset={preset} rank={i} />
                ))}
              </div>
            </div>

            {/* Reset CTA */}
            <div className="text-center pt-2">
              <button
                onClick={reset}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors underline underline-offset-4"
              >
                Upload another recording
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
