"use client";

import { useEffect, useState } from "react";

const STEPS = [
  { label: "Loading audio file...", detail: "Reading waveform data" },
  { label: "Detecting key & tempo...", detail: "Running chromagram analysis" },
  { label: "Identifying chords...", detail: "CQT chroma matching" },
  { label: "Analyzing sonic feel...", detail: "Spectral & RMS analysis" },
  { label: "Consulting the producer brain...", detail: "GPT-4o generating feedback" },
];

export default function LoadingState() {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }, 1800);

    const progressInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 95) return p;
        return p + Math.random() * 3;
      });
    }, 200);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      {/* Waveform animation */}
      <div className="flex items-center gap-1 h-16">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="waveform-bar w-1.5 rounded-full bg-gradient-to-t from-brand-500 to-accent-purple"
            style={{
              animationDelay: `${(i / 24) * 1.2}s`,
              height: `${20 + Math.sin(i * 0.5) * 16}px`,
            }}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-sm space-y-3">
        <div className="flex justify-between text-xs text-gray-500">
          <span>{STEPS[step]?.label}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-accent-purple rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-600 text-center">{STEPS[step]?.detail}</p>
      </div>

      {/* Steps */}
      <div className="w-full max-w-sm space-y-2">
        {STEPS.map((s, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 text-sm transition-all duration-300 ${
              i < step
                ? "text-green-400"
                : i === step
                ? "text-white"
                : "text-gray-600"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                i < step
                  ? "bg-green-500 border-green-500"
                  : i === step
                  ? "border-brand-400 bg-brand-400/20"
                  : "border-surface-border"
              }`}
            >
              {i < step && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {i === step && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
              )}
            </div>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
