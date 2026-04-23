"use client";

import Link from "next/link";
import { Zap, Guitar, Piano, ArrowRight, Library, Wand2, Filter } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function HomeLanding() {
  const { user } = useAuth();

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
          Turn guitar recordings into chords, keys, and a playable piano view—then export MIDI for Logic Pro or any DAW. Piano visualizer for MIDI and songs, too.
        </p>

        <div className="w-full space-y-3 sm:space-y-4">
          {/* Library card — only for logged-in users */}
          {user && (
            <Link
              href="/library"
              className="group flex items-center gap-4 w-full glass rounded-2xl border border-brand-500/30 p-4 sm:p-5 text-left transition-all hover:border-brand-400/50 hover:bg-brand-500/5"
            >
              <div className="p-3 rounded-xl bg-brand-600/20 text-brand-400 shrink-0">
                <Library size={22} strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm sm:text-base">My Library</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Your saved sessions and account overview</p>
              </div>
              <ArrowRight size={18} className="text-gray-600 group-hover:text-brand-400 shrink-0 transition-colors" />
            </Link>
          )}

          <Link
            href="/analyze"
            className="group flex items-center gap-4 w-full glass rounded-2xl border border-surface-border p-4 sm:p-5 text-left transition-all hover:border-brand-500/40 hover:bg-brand-500/5"
          >
            <div className="p-3 rounded-xl bg-brand-600/20 text-brand-400 shrink-0">
              <Guitar size={22} strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm sm:text-base">Guitar → Piano</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Chords, tempo &amp; key—export chord MIDI for your DAW
              </p>
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

          <Link
            href="/producer"
            className="group flex items-center gap-4 w-full glass rounded-2xl border border-surface-border p-4 sm:p-5 text-left transition-all hover:border-brand-500/40 hover:bg-brand-500/5"
          >
            <div className="p-3 rounded-xl bg-purple-600/15 text-purple-400 shrink-0">
              <Wand2 size={22} strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm sm:text-base">Producer Intelligence</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Melody MIDI export for Logic Pro from any audio</p>
            </div>
            <ArrowRight size={18} className="text-gray-600 group-hover:text-brand-400 shrink-0 transition-colors" />
          </Link>

          <Link
            href="/noise-removal"
            className="group flex items-center gap-4 w-full glass rounded-2xl border border-surface-border p-4 sm:p-5 text-left transition-all hover:border-teal-500/40 hover:bg-teal-500/5"
          >
            <div className="p-3 rounded-xl bg-teal-600/15 text-teal-400 shrink-0">
              <Filter size={22} strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm sm:text-base">Noise Removal</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Strip 50/60 Hz power line hum from any recording</p>
            </div>
            <ArrowRight size={18} className="text-gray-600 group-hover:text-teal-400 shrink-0 transition-colors" />
          </Link>

          {!user && (
            <Link
              href="/login?next=/library"
              className="text-sm text-gray-600 hover:text-brand-400 transition-colors pt-2 block"
            >
              Sign in to save your sessions →
            </Link>
          )}
        </div>
      </main>

      <footer className="relative z-10 pb-8 pt-4 text-center text-xs text-gray-600">
        NextNote
      </footer>
    </div>
  );
}
