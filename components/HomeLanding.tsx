"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, PenLine, LayoutGrid, Wand2, Radio, Headphones, Filter } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePlatform } from "@/context/PlatformContext";
import { useSessionHistory } from "@/hooks/useSessionHistory";
import { authHeaders } from "@/lib/auth";
import { API_URL } from "@/lib/config";

interface DisplaySession {
  id: string | number;
  label: string;
  key: string;
  mode: string;
  bpm: number;
  timestamp: number;
  isServer?: boolean;
}

function formatDate(timestamp: number) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const TOOLS = [
  {
    href: "/analyze",
    label: "Guitar → Piano",
    desc: "Detect chords, key & tempo from recordings. Export MIDI for Logic Pro.",
    icon: PenLine,
    topBorder: "border-t-brand-500",
    iconBg: "bg-brand-600/20",
    iconColor: "text-brand-400",
    linkColor: "text-brand-400",
    flagKey: "guitar_piano_enabled" as const,
  },
  {
    href: "/visualizer",
    label: "Piano Visualizer",
    desc: "Watch MIDI & songs play out on an animated piano keyboard.",
    icon: LayoutGrid,
    topBorder: "border-t-cyan-500",
    iconBg: "bg-cyan-600/20",
    iconColor: "text-cyan-400",
    linkColor: "text-cyan-400",
    flagKey: "visualizer_enabled" as const,
  },
  {
    href: "/producer",
    label: "Producer Intelligence",
    desc: "Extract melody MIDI from any audio. Full producer feedback on your music.",
    icon: Wand2,
    topBorder: "border-t-purple-500",
    iconBg: "bg-purple-600/20",
    iconColor: "text-purple-400",
    linkColor: "text-purple-400",
    flagKey: "producer_enabled" as const,
  },
  {
    href: "/live",
    label: "Live Detector",
    desc: "Real-time chord and note detection from your microphone.",
    icon: Radio,
    topBorder: "border-t-amber-500",
    iconBg: "bg-amber-600/20",
    iconColor: "text-amber-400",
    linkColor: "text-amber-400",
    flagKey: "live_detector_enabled" as const,
  },
  {
    href: "/ear-training",
    label: "Ear Training",
    desc: "Train your ear to identify chords, intervals and scales.",
    icon: Headphones,
    topBorder: "border-t-teal-500",
    iconBg: "bg-teal-600/20",
    iconColor: "text-teal-400",
    linkColor: "text-teal-400",
    flagKey: "ear_training_enabled" as const,
  },
  {
    href: "/noise-removal",
    label: "Noise Removal",
    desc: "Strip 50/60 Hz power line hum and noise from any recording.",
    icon: Filter,
    topBorder: "border-t-green-500",
    iconBg: "bg-green-600/20",
    iconColor: "text-green-400",
    linkColor: "text-green-400",
    flagKey: "noise_removal_enabled" as const,
  },
];

export default function HomeLanding() {
  const { user, token } = useAuth();
  const platform = usePlatform();
  const { sessions: localSessions } = useSessionHistory();
  const [serverSessions, setServerSessions] = useState<DisplaySession[]>([]);

  // Fetch recent sessions from server for logged-in users
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/sessions/guitar`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : [])
      .then((data: any[]) => {
        if (!Array.isArray(data)) return;
        setServerSessions(
          data.slice(0, 4).map((s) => ({
            id: s.id,
            label: s.label,
            key: s.key ?? "",
            mode: s.mode ?? "",
            bpm: s.bpm ?? 0,
            timestamp: new Date(s.created_at).getTime(),
            isServer: true,
          }))
        );
      })
      .catch(() => {});
  }, [token]);

  const displaySessions: DisplaySession[] = user
    ? serverSessions
    : localSessions.slice(0, 4).map((s) => ({
        id: s.id,
        label: s.label,
        key: s.key,
        mode: s.mode,
        bpm: s.bpm,
        timestamp: s.timestamp,
      }));

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 border border-teal-500/40 bg-teal-500/5 rounded-full px-3.5 py-1.5 mb-6">
          <Sparkles size={13} className="text-teal-400" />
          <span className="text-sm font-medium text-teal-300">AI-powered music tools</span>
        </div>

        {/* Hero */}
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
          Practice smarter.
        </h1>
        <h2 className="text-4xl sm:text-5xl font-extrabold text-brand-400 tracking-tight leading-tight mb-4">
          Create faster.
        </h2>
        <p className="text-gray-400 text-base max-w-lg mb-10 leading-relaxed">
          Turn guitar recordings into chords, keys, and playable piano views — then export MIDI straight to your DAW.
        </p>

        {/* Recent Sessions */}
        {displaySessions.length > 0 && (
          <section className="mb-10">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">
              Recent Sessions
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {displaySessions.map((session) => (
                <Link
                  key={session.id}
                  href={
                    session.isServer
                      ? `/results?session=${session.id}`
                      : `/results?session=${session.id}`
                  }
                  className="bg-surface-2 rounded-xl p-4 border border-surface-border hover:border-brand-500/40 transition-all"
                >
                  <p className="text-xs text-gray-500 mb-1.5">{formatDate(session.timestamp)}</p>
                  <p className="text-sm font-semibold text-white truncate mb-3">{session.label}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {session.key && (
                      <span className="text-[11px] font-mono bg-surface-3 border border-surface-border text-gray-300 rounded-md px-1.5 py-0.5">
                        {session.key} {session.mode}
                      </span>
                    )}
                    {session.bpm > 0 && (
                      <span className="text-[11px] font-mono bg-surface-3 border border-surface-border text-gray-300 rounded-md px-1.5 py-0.5">
                        {session.bpm} bpm
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* All Tools */}
        <section>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">
            All Tools
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TOOLS.map(({ href, label, desc, icon: Icon, topBorder, iconBg, iconColor, linkColor, flagKey }) => {
              if (!platform[flagKey]) return null;
              return (
                <div
                  key={href}
                  className={`bg-surface-2 rounded-2xl p-5 border border-surface-border border-t-2 ${topBorder} hover:bg-surface-3/30 transition-all flex flex-col`}
                >
                  <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center mb-4 shrink-0`}>
                    <Icon size={17} className={iconColor} />
                  </div>
                  <p className="font-semibold text-white text-sm mb-1.5">{label}</p>
                  <p className="text-xs text-gray-500 leading-relaxed mb-4 flex-1">{desc}</p>
                  <Link
                    href={href}
                    className={`text-sm font-medium ${linkColor} hover:opacity-80 transition-opacity`}
                  >
                    Open →
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

      </div>

      {/* Watermark */}
      <p className="text-center text-xs text-gray-400 py-6">
        Developed by <span className="text-white font-semibold">Mostafa Hamed</span>
      </p>
    </div>
  );
}
