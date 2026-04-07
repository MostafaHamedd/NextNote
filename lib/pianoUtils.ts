// ─── Keyboard geometry ───────────────────────────────────────────────────────

export const WK  = 28;
export const WH  = 110;
export const BKW = 17;
export const BKH = 68;

export const ALL_NOTES   = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
export const WHITE_STEPS = [0, 2, 4, 5, 7, 9, 11];
export const FLAT_MAP: Record<string, string> = {
  Db:"C#", Eb:"D#", Fb:"E", Gb:"F#", Ab:"G#", Bb:"A#", Cb:"B",
};

export interface KeyDef { note: string; x: number; isBlack: boolean; }

export function buildKeys(octStart: number, octEnd: number): KeyDef[] {
  const keys: KeyDef[] = [];
  let whiteX = 0;
  for (let oct = octStart; oct <= octEnd; oct++) {
    for (let si = 0; si < 12; si++) {
      const note = ALL_NOTES[si] + oct;
      if (WHITE_STEPS.includes(si)) {
        keys.push({ note, x: whiteX, isBlack: false });
        whiteX += WK;
      } else {
        keys.push({ note, x: whiteX - BKW * 0.6, isBlack: true });
      }
    }
  }
  return keys;
}

// ─── Pitch helpers ────────────────────────────────────────────────────────────

export function normalisePitch(raw: string): string {
  const m = raw.match(/^([A-G]#?b?)(-?\d+)$/);
  if (!m) return raw;
  return (FLAT_MAP[m[1]] ?? m[1]) + m[2];
}

export function pitchToMidi(pitch: string): number {
  const m = pitch.match(/^([A-G]#?)(-?\d+)$/);
  if (!m) return -1;
  // Standard MIDI: C4 = 60, so (octave + 1) * 12 + semitone
  return (parseInt(m[2]) + 1) * 12 + ALL_NOTES.indexOf(m[1]);
}

// ─── Soundfont helpers ────────────────────────────────────────────────────────
// MusyngKite render of FluidR3 GM — per-note MP3s, no pitch-shifting needed.
// https://github.com/gleitz/midi-js-soundfonts (CC-licensed)

const SOUNDFONT_BASE =
  "https://gleitz.github.io/midi-js-soundfonts/MusyngKite/acoustic_grand_piano-mp3/";
const NOTE_NAMES_SF = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];

export function midiToSoundfontUrl(midi: number): string {
  const oct  = Math.floor(midi / 12) - 1;
  const name = NOTE_NAMES_SF[midi % 12];
  return SOUNDFONT_BASE + name + oct + ".mp3";
}

// ─── Audio playback ───────────────────────────────────────────────────────────

export function playSample(
  ctx: AudioContext,
  dest: AudioNode,
  buffer: AudioBuffer,
  startTime: number,
  durSec: number,
  velocity: number,
  out: AudioScheduledSourceNode[],
) {
  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const g = ctx.createGain();
  const sustainEnd = startTime + Math.max(durSec, 0.5);
  const releaseEnd = sustainEnd + 0.4;
  const peak = velocity * 1.05;
  g.gain.setValueAtTime(0.001, startTime);
  g.gain.linearRampToValueAtTime(peak, startTime + 0.008);
  g.gain.setValueAtTime(peak, sustainEnd);
  g.gain.exponentialRampToValueAtTime(0.001, releaseEnd);

  src.connect(g);
  g.connect(dest);
  src.start(startTime);
  src.stop(releaseEnd + 0.05);
  out.push(src);
}

export const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
