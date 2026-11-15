// Pitch quantising. Every pitch a track plays goes through here.

/** Major pentatonic, in semitones above the root. Any two of its notes sound fine together. */
export const PENTATONIC: readonly number[] = [0, 2, 4, 7, 9];

export interface ScaleRange {
  /** MIDI note of the lowest pitch (48 is C3, 60 is middle C). */
  rootMidi: number;
  /** How many octaves the range spans. The root at the top is included. */
  octaves: number;
  /** Semitones above the root, ascending, all below 12. Defaults to PENTATONIC. */
  scale?: readonly number[];
}

export function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Maps 0..1 to the nearest note of the scale in the range, as a MIDI number. 0 is the lowest note. */
export function scaleMidi(unit: number, range: ScaleRange): number {
  const scale = range.scale ?? PENTATONIC;
  const steps = scale.length * range.octaves;
  const step = Math.round(Math.min(1, Math.max(0, unit)) * steps);
  return range.rootMidi + 12 * Math.floor(step / scale.length) + scale[step % scale.length];
}

/** As scaleMidi, in Hz. */
export function scaleHz(unit: number, range: ScaleRange): number {
  return midiToHz(scaleMidi(unit, range));
}
