"use client";

import { useState } from "react";
import SongSearchInput from "@/components/sheet/SongSearchInput";
import { EXAMPLE_SONGS } from "@/lib/songLibrary";

interface Props {
  loading: boolean;
  onLoad: (title: string) => void;
}

export default function LearnSongTab({ loading, onLoad }: Props) {
  const [songTitle, setSongTitle] = useState("");

  const handleSubmit = (title: string) => {
    if (title.trim()) onLoad(title.trim());
  };

  return (
    <div className="space-y-4">
      <div className="bg-surface-1 rounded-3xl border border-surface-border p-6">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 block">
          Song or Piece Title
        </label>
        <SongSearchInput
          value={songTitle}
          onChange={setSongTitle}
          onSubmit={handleSubmit}
          disabled={loading}
        />
      </div>

      <div className="bg-surface-1 rounded-2xl border border-surface-border p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
          Try these
        </p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_SONGS.map(song => (
            <button
              key={song}
              onClick={() => { setSongTitle(song); onLoad(song); }}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-xl bg-surface-3 border border-surface-border text-gray-400 hover:text-white hover:border-brand-500/40 hover:bg-brand-500/10 transition-all disabled:opacity-40"
            >
              {song}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
