"use client";

import Link from "next/link";
import { Zap, Guitar, Piano, ArrowRight } from "lucide-react";

export default function HomeLanding() {
  return (
    <div className="min-h-screen bg-surface relative overflow-hidden flex flex-col">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[min(90vw,36rem)] h-[min(90vw,36rem)] bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-accent-purple/10 rounded-full blur-3xl pointer-events-none" />

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-24 max-w-lg mx-auto w-full text-center">
        <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-4 py-1.5 mb-8">
          <Zap size={14} className="text-brand-400" />
          <span className="text-sm font-medium text-brand-300">NextNote</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
          Practice smarter.
        </h1>
        <p className="text-gray-400 text-base sm:text-lg leading-relaxed mb-12 max-w-sm">
          Turn guitar ideas into chords and keys, or learn pieces on the piano keyboard — in one place.
        </p>

        <div className="w-full space-y-3 sm:space-y-4">
          <Link
            href="/analyze"
            className="group flex items-center gap-4 w-full glass rounded-2xl border border-surface-border p-4 sm:p-5 text-left transition-all hover:border-brand-500/40 hover:bg-brand-500/5"
          >
            <div className="p-3 rounded-xl bg-brand-600/20 text-brand-400 shrink-0">
              <Guitar size={22} strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm sm:text-base">Guitar → Piano</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Chords, tempo &amp; key from a recording</p>
            </div>
            <ArrowRight size={18} className="text-gray-600 group-hover:text-brand-400 shrink-0 transition-colors" />
          </Link>

          <Link
            href="/visualizer"
            className="group flex items-center gap-4 w-full glass rounded-2xl border border-surface-border p-4 sm:p-5 text-left transition-all hover:border-brand-500/40 hover:bg-brand-500/5"
          >
            <div className="p-3 rounded-xl bg-cyan-600/15 text-cyan-400 shrink-0">
              <Piano size={22} strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm sm:text-base">Piano visualizer</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">MIDI &amp; songs with a lit keyboard</p>
            </div>
            <ArrowRight size={18} className="text-gray-600 group-hover:text-brand-400 shrink-0 transition-colors" />
          </Link>
        </div>
      </main>

      <footer className="relative z-10 pb-8 pt-4 text-center text-xs text-gray-600">
        NextNote
      </footer>
    </div>
  );
}
