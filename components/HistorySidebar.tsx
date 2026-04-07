"use client";

import { X, Trash2, Clock, Music2 } from "lucide-react";
import clsx from "clsx";
import { Session } from "@/hooks/useSessionHistory";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sessions: Session[];
  onRestore: (session: Session) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function HistorySidebar({
  isOpen,
  onClose,
  sessions,
  onRestore,
  onDelete,
  onClearAll,
}: Props) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx(
          "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sidebar panel */}
      <aside
        className={clsx(
          "fixed top-0 left-0 h-full w-full sm:w-[380px] z-50 flex flex-col",
          "bg-surface-1 border-r border-surface-border shadow-2xl shadow-black/60",
          "transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border shrink-0">
          <div className="flex items-center gap-2.5">
            <Clock size={16} className="text-brand-400" />
            <h2 className="font-semibold text-white">Session History</h2>
            {sessions.length > 0 && (
              <span className="text-xs bg-brand-500/20 text-brand-300 border border-brand-500/30 rounded-full px-2 py-0.5 font-medium">
                {sessions.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {sessions.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
              >
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-3 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-2">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
              <div className="p-5 bg-surface-3 rounded-2xl">
                <Music2 size={28} className="text-gray-600" />
              </div>
              <div>
                <p className="text-gray-400 font-medium">No sessions yet</p>
                <p className="text-gray-600 text-sm mt-1">
                  Record guitar — we’ll detect chords and key for piano view.
                </p>
              </div>
            </div>
          ) : (
            sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onRestore={onRestore}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      </aside>
    </>
  );
}

function SessionCard({
  session,
  onRestore,
  onDelete,
}: {
  session: Session;
  onRestore: (s: Session) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="group relative bg-surface-2 hover:bg-surface-3 rounded-xl border border-surface-border hover:border-brand-800/60 transition-all">
      {/* Clickable restore area */}
      <button
        onClick={() => onRestore(session)}
        className="w-full text-left p-4"
      >
        {/* Label + time */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <p className="text-sm font-semibold text-gray-200 truncate leading-tight">
            {session.label}
          </p>
          <span className="text-[10px] text-gray-600 shrink-0 mt-0.5">
            {relativeTime(session.timestamp)}
          </span>
        </div>

        {/* Key + BPM badges */}
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-xs font-mono font-bold bg-brand-500/15 text-brand-300 border border-brand-500/25 rounded-md px-2 py-0.5">
            {session.key} {session.mode}
          </span>
          <span className="text-xs text-gray-500">{session.bpm} BPM</span>
        </div>

        {/* Mini chord pills */}
        <div className="flex flex-wrap gap-1.5">
          {session.chords.slice(0, 5).map((chord, i) => (
            <span
              key={i}
              className="text-[11px] font-mono bg-surface-3 text-gray-400 border border-surface-border rounded px-1.5 py-0.5"
            >
              {chord}
            </span>
          ))}
          {session.chords.length > 5 && (
            <span className="text-[11px] text-gray-600">
              +{session.chords.length - 5}
            </span>
          )}
        </div>
      </button>

      {/* Delete button — appears on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(session.id);
        }}
        className="absolute top-3 right-3 p-1.5 rounded-lg bg-surface-3 text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
        title="Delete session"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
