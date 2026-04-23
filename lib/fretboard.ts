/**
 * Guitar fretboard helpers for the live detector.
 *
 * String indexing follows scale_service.py: 0 = low E, 5 = high E.
 * Semitone values match OPEN_STRING_SEMITONES = [4, 9, 2, 7, 11, 4].
 */

const OPEN_STRING_SEMITONES = [4, 9, 2, 7, 11, 4]; // E2 A2 D3 G3 B3 E4
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export interface FretPosition {
  string: number; // 0 = low E … 5 = high E
  fret:   number; // 0 = open string, 1–12
  note:   string; // e.g. "A"
}

/**
 * Return every fretboard position (frets 0–12, all 6 strings) that produces
 * the same pitch class as the given MIDI note number.
 */
export function midi_to_fretboard_positions(midi: number): FretPosition[] {
  const targetSemitone = ((midi % 12) + 12) % 12;
  const positions: FretPosition[] = [];

  for (let stringIdx = 0; stringIdx < 6; stringIdx++) {
    const openSemitone = OPEN_STRING_SEMITONES[stringIdx];
    for (let fret = 0; fret <= 12; fret++) {
      const noteSemitone = (openSemitone + fret) % 12;
      if (noteSemitone === targetSemitone) {
        positions.push({ string: stringIdx, fret, note: NOTE_NAMES[noteSemitone] });
      }
    }
  }

  return positions;
}
