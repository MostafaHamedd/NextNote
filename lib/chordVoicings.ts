// positions: [low-E, A, D, G, B, high-e]
// -1 = muted (X), 0 = open, 1+ = absolute fret number
// baseFret: which fret sits at the top of the diagram (default 1)
// barre: thick arc across from/to string indices (0=low-E, 5=high-e)

export interface Voicing {
  positions: number[];
  baseFret?: number;
  barre?: { fret: number; from: number; to: number };
}

export const VOICINGS: Record<string, Voicing> = {
  // ── MAJOR ─────────────────────────────────────────────────────────────────
  "C":    { positions: [-1, 3, 2, 0, 1, 0] },
  "C#":   { positions: [-1, 4, 6, 6, 6, 4], baseFret: 4, barre: { fret: 4, from: 1, to: 5 } },
  "Db":   { positions: [-1, 4, 6, 6, 6, 4], baseFret: 4, barre: { fret: 4, from: 1, to: 5 } },
  "D":    { positions: [-1, -1, 0, 2, 3, 2] },
  "D#":   { positions: [-1, 6, 8, 8, 8, 6], baseFret: 6, barre: { fret: 6, from: 1, to: 5 } },
  "Eb":   { positions: [-1, 6, 8, 8, 8, 6], baseFret: 6, barre: { fret: 6, from: 1, to: 5 } },
  "E":    { positions: [0, 2, 2, 1, 0, 0] },
  "F":    { positions: [1, 3, 3, 2, 1, 1], barre: { fret: 1, from: 0, to: 5 } },
  "F#":   { positions: [2, 4, 4, 3, 2, 2], baseFret: 2, barre: { fret: 2, from: 0, to: 5 } },
  "Gb":   { positions: [2, 4, 4, 3, 2, 2], baseFret: 2, barre: { fret: 2, from: 0, to: 5 } },
  "G":    { positions: [3, 2, 0, 0, 0, 3] },
  "G#":   { positions: [4, 6, 6, 5, 4, 4], baseFret: 4, barre: { fret: 4, from: 0, to: 5 } },
  "Ab":   { positions: [4, 6, 6, 5, 4, 4], baseFret: 4, barre: { fret: 4, from: 0, to: 5 } },
  "A":    { positions: [-1, 0, 2, 2, 2, 0] },
  "A#":   { positions: [-1, 1, 3, 3, 3, 1], barre: { fret: 1, from: 1, to: 5 } },
  "Bb":   { positions: [-1, 1, 3, 3, 3, 1], barre: { fret: 1, from: 1, to: 5 } },
  "B":    { positions: [-1, 2, 4, 4, 4, 2], baseFret: 2, barre: { fret: 2, from: 1, to: 5 } },

  // ── MINOR ─────────────────────────────────────────────────────────────────
  "Cm":   { positions: [-1, 3, 5, 5, 4, 3], baseFret: 3, barre: { fret: 3, from: 1, to: 5 } },
  "C#m":  { positions: [-1, 4, 6, 6, 5, 4], baseFret: 4, barre: { fret: 4, from: 1, to: 5 } },
  "Dbm":  { positions: [-1, 4, 6, 6, 5, 4], baseFret: 4, barre: { fret: 4, from: 1, to: 5 } },
  "Dm":   { positions: [-1, -1, 0, 2, 3, 1] },
  "D#m":  { positions: [-1, 6, 8, 8, 7, 6], baseFret: 6, barre: { fret: 6, from: 1, to: 5 } },
  "Ebm":  { positions: [-1, 6, 8, 8, 7, 6], baseFret: 6, barre: { fret: 6, from: 1, to: 5 } },
  "Em":   { positions: [0, 2, 2, 0, 0, 0] },
  "Fm":   { positions: [1, 3, 3, 1, 1, 1], barre: { fret: 1, from: 0, to: 5 } },
  "F#m":  { positions: [2, 4, 4, 2, 2, 2], baseFret: 2, barre: { fret: 2, from: 0, to: 5 } },
  "Gbm":  { positions: [2, 4, 4, 2, 2, 2], baseFret: 2, barre: { fret: 2, from: 0, to: 5 } },
  "Gm":   { positions: [3, 5, 5, 3, 3, 3], baseFret: 3, barre: { fret: 3, from: 0, to: 5 } },
  "G#m":  { positions: [4, 6, 6, 4, 4, 4], baseFret: 4, barre: { fret: 4, from: 0, to: 5 } },
  "Abm":  { positions: [4, 6, 6, 4, 4, 4], baseFret: 4, barre: { fret: 4, from: 0, to: 5 } },
  "Am":   { positions: [-1, 0, 2, 2, 1, 0] },
  "A#m":  { positions: [-1, 1, 3, 3, 2, 1], baseFret: 1, barre: { fret: 1, from: 1, to: 5 } },
  "Bbm":  { positions: [-1, 1, 3, 3, 2, 1], baseFret: 1, barre: { fret: 1, from: 1, to: 5 } },
  "Bm":   { positions: [-1, 2, 4, 4, 3, 2], baseFret: 2, barre: { fret: 2, from: 1, to: 5 } },

  // ── DOMINANT 7 ────────────────────────────────────────────────────────────
  "C7":   { positions: [-1, 3, 2, 3, 1, 0] },
  "C#7":  { positions: [-1, 4, 6, 4, 6, 4], baseFret: 4 },
  "Db7":  { positions: [-1, 4, 6, 4, 6, 4], baseFret: 4 },
  "D7":   { positions: [-1, -1, 0, 2, 1, 2] },
  "D#7":  { positions: [-1, 6, 8, 6, 8, 6], baseFret: 6 },
  "Eb7":  { positions: [-1, 6, 8, 6, 8, 6], baseFret: 6 },
  "E7":   { positions: [0, 2, 0, 1, 0, 0] },
  "F7":   { positions: [1, 3, 1, 2, 1, 1], baseFret: 1, barre: { fret: 1, from: 0, to: 5 } },
  "F#7":  { positions: [2, 4, 2, 3, 2, 2], baseFret: 2, barre: { fret: 2, from: 0, to: 5 } },
  "Gb7":  { positions: [2, 4, 2, 3, 2, 2], baseFret: 2, barre: { fret: 2, from: 0, to: 5 } },
  "G7":   { positions: [3, 2, 0, 0, 0, 1] },
  "G#7":  { positions: [4, 6, 4, 5, 4, 4], baseFret: 4, barre: { fret: 4, from: 0, to: 5 } },
  "Ab7":  { positions: [4, 6, 4, 5, 4, 4], baseFret: 4, barre: { fret: 4, from: 0, to: 5 } },
  "A7":   { positions: [-1, 0, 2, 0, 2, 0] },
  "A#7":  { positions: [-1, 1, 3, 1, 3, 1], baseFret: 1 },
  "Bb7":  { positions: [-1, 1, 3, 1, 3, 1], baseFret: 1 },
  "B7":   { positions: [-1, 2, 1, 2, 0, 2] },

  // ── MAJOR 7 ───────────────────────────────────────────────────────────────
  "Cmaj7":  { positions: [-1, 3, 2, 0, 0, 0] },
  "C#maj7": { positions: [-1, 4, 6, 5, 6, 4], baseFret: 4 },
  "Dbmaj7": { positions: [-1, 4, 6, 5, 6, 4], baseFret: 4 },
  "Dmaj7":  { positions: [-1, -1, 0, 2, 2, 2] },
  "D#maj7": { positions: [-1, 6, 8, 7, 8, 6], baseFret: 6 },
  "Ebmaj7": { positions: [-1, 6, 8, 7, 8, 6], baseFret: 6 },
  "Emaj7":  { positions: [0, 2, 1, 1, 0, 0] },
  "Fmaj7":  { positions: [-1, -1, 3, 2, 1, 0] },
  "F#maj7": { positions: [2, 4, 3, 3, 2, 2], baseFret: 2, barre: { fret: 2, from: 0, to: 5 } },
  "Gbmaj7": { positions: [2, 4, 3, 3, 2, 2], baseFret: 2, barre: { fret: 2, from: 0, to: 5 } },
  "Gmaj7":  { positions: [3, 2, 0, 0, 0, 2] },
  "G#maj7": { positions: [4, 6, 5, 5, 4, 4], baseFret: 4, barre: { fret: 4, from: 0, to: 5 } },
  "Abmaj7": { positions: [4, 6, 5, 5, 4, 4], baseFret: 4, barre: { fret: 4, from: 0, to: 5 } },
  "Amaj7":  { positions: [-1, 0, 2, 1, 2, 0] },
  "A#maj7": { positions: [-1, 1, 3, 2, 3, 1], baseFret: 1 },
  "Bbmaj7": { positions: [-1, 1, 3, 2, 3, 1], baseFret: 1 },
  "Bmaj7":  { positions: [-1, 2, 4, 3, 4, 2], baseFret: 2 },

  // ── MINOR 7 ───────────────────────────────────────────────────────────────
  "Cm7":   { positions: [-1, 3, 5, 3, 4, 3], baseFret: 3 },
  "C#m7":  { positions: [-1, 4, 6, 4, 5, 4], baseFret: 4 },
  "Dbm7":  { positions: [-1, 4, 6, 4, 5, 4], baseFret: 4 },
  "Dm7":   { positions: [-1, -1, 0, 2, 1, 1] },
  "D#m7":  { positions: [-1, 6, 8, 6, 7, 6], baseFret: 6 },
  "Ebm7":  { positions: [-1, 6, 8, 6, 7, 6], baseFret: 6 },
  "Em7":   { positions: [0, 2, 2, 0, 3, 0] },
  "Fm7":   { positions: [1, 3, 3, 1, 4, 1], baseFret: 1 },
  "F#m7":  { positions: [2, 4, 2, 2, 2, 2], baseFret: 2, barre: { fret: 2, from: 0, to: 5 } },
  "Gbm7":  { positions: [2, 4, 2, 2, 2, 2], baseFret: 2, barre: { fret: 2, from: 0, to: 5 } },
  "Gm7":   { positions: [3, 5, 3, 3, 3, 3], baseFret: 3, barre: { fret: 3, from: 0, to: 5 } },
  "G#m7":  { positions: [4, 6, 4, 4, 4, 4], baseFret: 4, barre: { fret: 4, from: 0, to: 5 } },
  "Abm7":  { positions: [4, 6, 4, 4, 4, 4], baseFret: 4, barre: { fret: 4, from: 0, to: 5 } },
  "Am7":   { positions: [-1, 0, 2, 0, 1, 0] },
  "A#m7":  { positions: [-1, 1, 3, 1, 2, 1], baseFret: 1 },
  "Bbm7":  { positions: [-1, 1, 3, 1, 2, 1], baseFret: 1 },
  "Bm7":   { positions: [-1, 2, 4, 2, 3, 2], baseFret: 2 },

  // ── DIMINISHED ────────────────────────────────────────────────────────────
  "Cdim":  { positions: [-1, 3, 4, 5, 4, -1] },
  "C#dim": { positions: [-1, -1, 1, 2, 1, 2] },
  "Dbdim": { positions: [-1, -1, 1, 2, 1, 2] },
  "Ddim":  { positions: [-1, -1, 0, 1, 3, 1] },
  "D#dim": { positions: [-1, -1, 1, 2, 4, 2] },
  "Ebdim": { positions: [-1, -1, 1, 2, 4, 2] },
  "Edim":  { positions: [0, 1, 2, 3, 2, -1] },
  "Fdim":  { positions: [-1, -1, 3, 4, 3, -1] },
  "F#dim": { positions: [-1, -1, 4, 5, 4, -1], baseFret: 4 },
  "Gbdim": { positions: [-1, -1, 4, 5, 4, -1], baseFret: 4 },
  "Gdim":  { positions: [-1, -1, 5, 6, 5, -1], baseFret: 5 },
  "G#dim": { positions: [-1, -1, 1, 2, 1, 2] },
  "Abdim": { positions: [-1, -1, 1, 2, 1, 2] },
  "Adim":  { positions: [-1, 0, 1, 2, 1, -1] },
  "A#dim": { positions: [-1, 1, 2, 3, 2, -1] },
  "Bbdim": { positions: [-1, 1, 2, 3, 2, -1] },
  "Bdim":  { positions: [-1, 2, 3, 4, 3, -1], baseFret: 2 },

  // ── AUGMENTED ─────────────────────────────────────────────────────────────
  "Caug":  { positions: [-1, 3, 2, 1, 1, 0] },
  "C#aug": { positions: [-1, 4, 3, 2, 2, 1] },
  "Dbaug": { positions: [-1, 4, 3, 2, 2, 1] },
  "Daug":  { positions: [-1, -1, 0, 3, 3, 2] },
  "D#aug": { positions: [-1, -1, 1, 4, 4, 3] },
  "Ebaug": { positions: [-1, -1, 1, 4, 4, 3] },
  "Eaug":  { positions: [0, 3, 2, 1, 1, 0] },
  "Faug":  { positions: [1, 3, 3, 2, 2, 1] },
  "F#aug": { positions: [-1, 1, 0, 3, 3, 2] },
  "Gbaug": { positions: [-1, 1, 0, 3, 3, 2] },
  "Gaug":  { positions: [3, 2, 1, 0, 0, 3] },
  "G#aug": { positions: [4, 3, 2, 1, 1, 4] },
  "Abaug": { positions: [4, 3, 2, 1, 1, 4] },
  "Aaug":  { positions: [-1, 0, 3, 2, 2, 1] },
  "A#aug": { positions: [-1, 1, 4, 3, 3, 2] },
  "Bbaug": { positions: [-1, 1, 4, 3, 3, 2] },
  "Baug":  { positions: [-1, 2, 1, 0, 0, 3] },

  // ── SUS2 ──────────────────────────────────────────────────────────────────
  "Csus2":  { positions: [-1, 3, 0, 0, 1, 3] },
  "C#sus2": { positions: [-1, 4, 1, 1, 2, 4], baseFret: 1 },
  "Dbsus2": { positions: [-1, 4, 1, 1, 2, 4], baseFret: 1 },
  "Dsus2":  { positions: [-1, -1, 0, 2, 3, 0] },
  "D#sus2": { positions: [-1, -1, 1, 3, 4, 1] },
  "Ebsus2": { positions: [-1, -1, 1, 3, 4, 1] },
  "Esus2":  { positions: [0, 2, 4, 4, 0, 0] },
  "Fsus2":  { positions: [-1, -1, 3, 0, 1, 1] },
  "F#sus2": { positions: [-1, -1, 4, 1, 2, 2] },
  "Gbsus2": { positions: [-1, -1, 4, 1, 2, 2] },
  "Gsus2":  { positions: [3, 0, 0, 2, 3, 3] },
  "G#sus2": { positions: [4, 1, 1, 3, 4, 4] },
  "Absus2": { positions: [4, 1, 1, 3, 4, 4] },
  "Asus2":  { positions: [-1, 0, 2, 2, 0, 0] },
  "A#sus2": { positions: [-1, 1, 3, 3, 1, 1], barre: { fret: 1, from: 1, to: 5 } },
  "Bbsus2": { positions: [-1, 1, 3, 3, 1, 1], barre: { fret: 1, from: 1, to: 5 } },
  "Bsus2":  { positions: [-1, 2, 4, 4, 2, 2], baseFret: 2, barre: { fret: 2, from: 1, to: 5 } },

  // ── SUS4 ──────────────────────────────────────────────────────────────────
  "Csus4":  { positions: [-1, 3, 3, 0, 1, 1] },
  "C#sus4": { positions: [-1, 4, 6, 6, 7, 4], baseFret: 4 },
  "Dbsus4": { positions: [-1, 4, 6, 6, 7, 4], baseFret: 4 },
  "Dsus4":  { positions: [-1, -1, 0, 2, 3, 3] },
  "D#sus4": { positions: [-1, -1, 1, 3, 4, 4] },
  "Ebsus4": { positions: [-1, -1, 1, 3, 4, 4] },
  "Esus4":  { positions: [0, 2, 2, 2, 0, 0] },
  "Fsus4":  { positions: [-1, -1, 3, 3, 1, 1] },
  "F#sus4": { positions: [-1, -1, 4, 4, 2, 2] },
  "Gbsus4": { positions: [-1, -1, 4, 4, 2, 2] },
  "Gsus4":  { positions: [3, -1, 0, 0, 1, 3] },
  "G#sus4": { positions: [4, 4, 1, 1, 2, 4] },
  "Absus4": { positions: [4, 4, 1, 1, 2, 4] },
  "Asus4":  { positions: [-1, 0, 2, 2, 3, 0] },
  "A#sus4": { positions: [-1, 1, 3, 3, 4, 1] },
  "Bbsus4": { positions: [-1, 1, 3, 3, 4, 1] },
  "Bsus4":  { positions: [-1, 2, 4, 4, 5, 2], baseFret: 2 },
};

// Normalize chord name to match keys (handles "maj" suffix, alternate spellings)
const QUALITY_ALIASES: Record<string, string> = {
  "maj": "",
  "M": "",
  "min": "m",
  "min7": "m7",
  "M7": "maj7",
  "dom7": "7",
  "°": "dim",
  "dim7": "dim",
  "+": "aug",
  "5": "",     // power chord → major voicing
};

export function lookupVoicing(chordName: string): Voicing | null {
  // Direct lookup
  if (VOICINGS[chordName]) return VOICINGS[chordName];

  // Try normalizing quality aliases
  const twoCharRoots = new Set(["C#","D#","F#","G#","A#","Cb","Db","Eb","Gb","Ab","Bb"]);
  const root = chordName.length >= 2 && twoCharRoots.has(chordName.slice(0,2))
    ? chordName.slice(0,2)
    : chordName[0].toUpperCase();
  let quality = chordName.slice(root.length);

  const normalizedQuality = QUALITY_ALIASES[quality] ?? quality;
  const normalized = root + normalizedQuality;
  return VOICINGS[normalized] ?? null;
}
