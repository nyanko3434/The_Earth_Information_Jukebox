// Night lights sonifier: a pattern of short notes whose density and speed follow
// how bright the map is.
//   overall brightness                     -> notes per second (and their loudness)
//   a note's cell, left or right (longitude) -> stereo pan
//   a note's cell, up or down (latitude)     -> pitch, north is high, pentatonic
//   a cell that is orange in the change map  -> a falling tone (that region lost light)
//   a cell that is purple in the change map  -> a rising tone (that region gained light)
//   a zoomed-in view (bright content in one part of the map) -> a short rising phrase
import { Gain, Panner, Synth, immediate, now } from 'tone';
import type { ToneAudioNode } from 'tone';
import { PENTATONIC, scaleHz } from '../../audio/scales.ts';
import type { FrameFeatures, Sonifier } from '../../types.ts';

// ---- Tuning. Calibrated against public/media/nightlights.mp4 by measurement; not yet judged by ear. ----
/** Measured in the browser on the real clip: mean luma about 0.019 on the annual map, 0.033 on the change map. */
const DARK_LUMA = 0.014;
const BRIGHT_LUMA = 0.036;
/** Notes per second across that range. The cap in ARCHITECTURE is 12. */
const MIN_RATE = 1.5;
const MAX_RATE = 9;
/** Notes that may be owed at once, so a sudden brightening does not fire a burst. */
const MAX_TOKENS = 4;
/** C4 to C6. */
const PITCH_RANGE = { rootMidi: 60, octaves: 2 };
export const NIGHTLIGHTS_STEP = 1 / (PENTATONIC.length * PITCH_RANGE.octaves);
const PAN_WIDTH = 0.8;
const NOTE_SECONDS = 0.12;
const GLIDE_SECONDS = 0.1;
const VOICE_COUNT = 10;
const LEVEL = 0.8;
const FADE_SECONDS = 0.05;
const SMOOTH_SECONDS = 0.3;
/** A cell at least this bright can carry a note or count towards a zoom. */
const BRIGHT_CELL = 0.1;
/** A gap in media time longer than this, or any step backwards, is a seek or a loop. */
const MAX_FRAME_GAP_SECONDS = 1;

/** The map counts as the change view when this share of its cells are vivid. About 2 % annually, 5-7 % in the change map. */
const CHANGE_MIN_FRACTION = 0.035;
const ORANGE = { minHue: 10, maxHue: 60, minSat: 0.4, minLuma: 0.1 };
const PURPLE = { minHue: 240, maxHue: 340, minSat: 0.35, minLuma: 0.06 };
/**
 * Zoom detection uses a brighter threshold than notes: on the annual map the
 * bright note-cells span the whole width, while a zoom has a few very bright
 * cells in a narrow band (measured span about 0.07, against 0.25+ elsewhere).
 */
const ZOOM_CELL = 0.2;
const ZOOM_SPAN = 0.15;
const ZOOM_MIN_CELLS = 3;
const ZOOM_PHRASE_STEP_SECONDS = 0.14;
/** Cost of the zoom phrase in notes, so it cannot exceed the note budget. */
const ZOOM_PHRASE_NOTES = 3;

export interface NightlightsNote {
  /** Media time of the frame that caused the note, in seconds. */
  time: number;
  hz: number;
  /** -1 left .. +1 right. */
  pan: number;
  /** 0..1. */
  velocity: number;
  /** -1 falling (lost light), 0 steady, +1 rising (gained light). */
  direction: -1 | 0 | 1;
  /** True for the three notes of a zoom's phrase. */
  zoomPhrase: boolean;
}

export interface NightlightsOptions {
  /** Called for every note played. For the dev harness. */
  onNote?: (note: NightlightsNote) => void;
}

interface Voice {
  synth: Synth;
  panner: Panner;
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/** Brightness 0..1 as a note rate. Exported so the rate can be checked without audio. */
export function nightlightsRate(brightness: number): number {
  return MIN_RATE + (MAX_RATE - MIN_RATE) * clamp01(brightness);
}

export function createNightlightsSonifier(output: ToneAudioNode, options: NightlightsOptions = {}): Sonifier {
  let out: Gain | null = null;
  let voices: Voice[] = [];
  let nextVoice = 0;
  let silent = true;
  let hasFrame = false;
  let lastTime = 0;
  let brightness = 0;
  let tokens = 0;
  let pick = 0.5;
  let wasZoom = false;

  const trigger = (
    f: FrameFeatures,
    cell: number,
    direction: -1 | 0 | 1,
    delay: number,
    zoomPhrase: boolean,
  ) => {
    const voice = voices[nextVoice];
    nextVoice = (nextVoice + 1) % voices.length;
    const rows = f.rows;
    const cols = f.cols;
    const row = Math.floor(cell / cols);
    const col = cell % cols;
    // North (row 0) is high.
    const unit = clamp01(1 - (row + 0.5) / rows);
    const pan = ((col + 0.5) / cols) * 2 * PAN_WIDTH - PAN_WIDTH;
    const luma = f.luma[cell];
    const velocity = clamp01(0.25 + 0.75 * Math.min(1, luma / 0.4));

    const hz = scaleHz(unit, PITCH_RANGE);
    const at = now() + delay;
    voice.panner.pan.setValueAtTime(pan, at);
    if (direction === 0) {
      voice.synth.triggerAttackRelease(hz, NOTE_SECONDS, at, velocity);
    } else {
      // Rise from below, or fall from above, by two scale steps, so the direction
      // is heard as movement rather than as a different note.
      const fromUnit = clamp01(unit - direction * 2 * NIGHTLIGHTS_STEP);
      const fromHz = scaleHz(fromUnit, PITCH_RANGE);
      voice.synth.triggerAttack(fromHz, at, velocity);
      voice.synth.frequency.exponentialRampTo(hz, GLIDE_SECONDS, at);
      voice.synth.triggerRelease(at + NOTE_SECONDS);
    }

    options.onNote?.({
      time: f.time,
      hz,
      pan,
      velocity,
      direction,
      zoomPhrase,
    });
  };

  /** -1 for a lost-light (orange) cell, +1 for a gained-light (purple) cell, 0 otherwise. */
  const directionAt = (f: FrameFeatures, cell: number): -1 | 0 | 1 => {
    const hue = f.hue[cell];
    const sat = f.sat[cell];
    const luma = f.luma[cell];
    if (sat >= ORANGE.minSat && luma >= ORANGE.minLuma && hue >= ORANGE.minHue && hue <= ORANGE.maxHue) {
      return -1;
    }
    if (sat >= PURPLE.minSat && luma >= PURPLE.minLuma && hue >= PURPLE.minHue && hue <= PURPLE.maxHue) {
      return 1;
    }
    return 0;
  };

  /**
   * Picks a cell by brightness-weighted rotation, so notes move around the map
   * instead of hammering the brightest spot. In the change view it prefers cells
   * that carry a direction, so the rising and falling tones are actually heard.
   */
  const pickCell = (f: FrameFeatures, preferDirection: boolean): number => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const directionalOnly = preferDirection && attempt === 0;
      let total = 0;
      for (let i = 0; i < f.luma.length; i++) {
        if (f.luma[i] > BRIGHT_CELL && (!directionalOnly || directionAt(f, i) !== 0)) total += f.luma[i];
      }
      if (total === 0) continue;
      pick = (pick + 0.6180339887) % 1;
      let target = pick * total;
      for (let i = 0; i < f.luma.length; i++) {
        if (f.luma[i] <= BRIGHT_CELL || (directionalOnly && directionAt(f, i) === 0)) continue;
        target -= f.luma[i];
        if (target <= 0) return i;
      }
    }
    return -1;
  };

  const directionOf = (f: FrameFeatures, cell: number, changeView: boolean): -1 | 0 | 1 =>
    changeView ? directionAt(f, cell) : 0;

  return {
    legend: [],

    start() {
      if (out) return;
      const bus = new Gain(0).connect(output);
      out = bus;
      voices = Array.from({ length: VOICE_COUNT }, () => {
        const panner = new Panner(0).connect(bus);
        const synth = new Synth({
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.004, decay: 0.16, sustain: 0, release: 0.14 },
        }).connect(panner);
        return { synth, panner };
      });
    },

    update(f: FrameFeatures) {
      if (!out) return;
      if (silent) {
        out.gain.rampTo(LEVEL, FADE_SECONDS);
        silent = false;
      }

      const gap = f.time - lastTime;
      const jumped = !hasFrame || gap < 0 || gap > MAX_FRAME_GAP_SECONDS;
      brightness = jumped ? f.meanLuma : brightness + (f.meanLuma - brightness) * (1 - Math.exp(-gap / SMOOTH_SECONDS));
      const dt = jumped ? 0 : gap;
      hasFrame = true;
      lastTime = f.time;

      // One pass for the change view, the zoom test and the bright-cell spread.
      let vivid = 0;
      let brightCells = 0;
      let zoomCells = 0;
      let zoomMinCol = f.cols;
      let zoomMaxCol = -1;
      let zoomRowSum = 0;
      let zoomColSum = 0;
      const cells = f.cols * f.rows;
      for (let i = 0; i < cells; i++) {
        const luma = f.luma[i];
        const sat = f.sat[i];
        if (sat > 0.35 && luma > 0.08) vivid++;
        if (luma > BRIGHT_CELL) brightCells++;
        if (luma > ZOOM_CELL) {
          const col = i % f.cols;
          zoomCells++;
          zoomRowSum += Math.floor(i / f.cols);
          zoomColSum += col;
          if (col < zoomMinCol) zoomMinCol = col;
          if (col > zoomMaxCol) zoomMaxCol = col;
        }
      }
      const changeView = vivid / cells >= CHANGE_MIN_FRACTION;
      const zooming =
        zoomCells >= ZOOM_MIN_CELLS &&
        zoomMaxCol >= zoomMinCol &&
        (zoomMaxCol - zoomMinCol + 1) / f.cols < ZOOM_SPAN;

      const level = (brightness - DARK_LUMA) / (BRIGHT_LUMA - DARK_LUMA);
      const rate = nightlightsRate(level);
      tokens = Math.min(MAX_TOKENS, tokens + rate * dt);

      // A zoom entry is a one-off event, so it spends its three notes at once:
      // three notes over 0.28 s is about 11 a second, inside the 12-note cap.
      if (zooming && !wasZoom && zoomCells > 0) {
        wasZoom = true;
        // Entering a zoom: a short rising phrase from the zoomed region, panned to it.
        const meanRow = zoomRowSum / zoomCells;
        const meanCol = zoomColSum / zoomCells;
        const baseUnit = clamp01(1 - (meanRow + 0.5) / f.rows);
        const pan = ((meanCol + 0.5) / f.cols) * 2 * PAN_WIDTH - PAN_WIDTH;
        const voice = voices[nextVoice];
        nextVoice = (nextVoice + 1) % voices.length;
        voice.panner.pan.setValueAtTime(pan, now());
        for (let step = 0; step < ZOOM_PHRASE_NOTES; step++) {
          const hz = scaleHz(clamp01(baseUnit + step * NIGHTLIGHTS_STEP), PITCH_RANGE);
          voice.synth.triggerAttackRelease(
            hz,
            NOTE_SECONDS,
            now() + step * ZOOM_PHRASE_STEP_SECONDS,
            0.5,
          );
          options.onNote?.({
            time: f.time,
            hz,
            pan,
            velocity: 0.5,
            direction: 1,
            zoomPhrase: true,
          });
        }
        tokens = Math.max(0, tokens - ZOOM_PHRASE_NOTES);
      }
      // Stay marked while inside the zoom; reset only when the whole map is back,
      // so a phrase is not skipped just because it had to wait for a note token.
      if (!zooming) wasZoom = false;

      while (tokens >= 1) {
        const cell = pickCell(f, changeView);
        if (cell < 0) break;
        trigger(f, cell, directionOf(f, cell, changeView), 0, false);
        tokens -= 1;
      }
    },

    pause() {
      if (!out || silent) return;
      silent = true;
      const at = immediate();
      out.gain.rampTo(0, FADE_SECONDS, at);
      for (const voice of voices) voice.synth.triggerRelease(at);
    },

    dispose() {
      if (!out) return;
      const nodes = [out, ...voices.flatMap((v) => [v.synth, v.panner])];
      out.gain.rampTo(0, FADE_SECONDS, immediate());
      out = null;
      voices = [];
      silent = true;
      hasFrame = false;
      // Let the fade finish before the nodes go, to avoid a click.
      setTimeout(() => nodes.forEach((n) => n.dispose()), 2 * FADE_SECONDS * 1000);
    },

    describeNow(f: FrameFeatures) {
      const level = (f.meanLuma - DARK_LUMA) / (BRIGHT_LUMA - DARK_LUMA);
      const perSecond = nightlightsRate(level);
      let vivid = 0;
      const cells = f.cols * f.rows;
      for (let i = 0; i < cells; i++) {
        if (f.sat[i] > 0.35 && f.luma[i] > 0.08) vivid++;
      }
      const changeView = vivid / cells >= CHANGE_MIN_FRACTION;
      if (changeView) {
        return `About ${perSecond.toFixed(0)} notes a second on the change map; orange regions fall and purple regions rise.`;
      }
      return `About ${perSecond.toFixed(0)} notes a second; brighter parts of the map are busier.`;
    },
  };
}
