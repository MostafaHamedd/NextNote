export interface SheetNote {
  pitch: string;           // e.g. "C4", "G#3", "Bb5"
  duration: number;        // in beats (kept for reference)
  startBeat: number;       // cumulative beat from start (kept for reference)
  startSec: number;        // wall-clock seconds from start (used for playback)
  durationSec: number;     // duration in seconds with sustain pedal applied
  durationSecRaw: number;  // duration in seconds ignoring sustain pedal
  hand: "right" | "left";
  velocity: number;        // 0-127
}

export interface SheetData {
  title: string;
  tempo: number;           // BPM (representative / for display)
  timeSignature: string;
  totalSec: number;        // total wall-clock duration in seconds
  hasSustainEvents: boolean; // true if the MIDI has CC 64 sustain pedal data
  notes: SheetNote[];
}

let _store: SheetData | null = null;

export const sheetStore = {
  set(data: SheetData) { _store = data; },
  get(): SheetData | null { return _store; },
  clear() { _store = null; },
};
