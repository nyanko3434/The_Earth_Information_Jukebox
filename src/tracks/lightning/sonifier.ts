// Lightning sonifier: every new flash is one short plucked note.
//   a cell turning yellow (a lightning dot appearing)  -> one note
//   height in the frame (north is up)                  -> pitch, top is high, pentatonic
//   left-right position                                -> stereo pan
//   size of the jump in yellow                         -> loudness
import { Gain, Panner, Synth, immediate, now } from 'tone';
import type { ToneAudioNode } from 'tone';
import { findRises } from '../../analysis/helpers.ts';
import type { Flash } from '../../analysis/helpers.ts';
import { scaleHz } from '../../audio/scales.ts';
import type { FrameFeatures, Sonifier } from '../../types.ts';

// ---- What the picture looks like. Measured on public/media/lightning.mp4 (SVS 5011). ----
// A turning globe on a field of stars. Lightning is small yellow dots, a few
// pixels each, that appear within a few frames and fade over about a second.
// The white ISS orbit line, its label and the sunlit clouds brighten cells far
// more than a dot does, so a flash is a rise in yellow, not in brightness.
/** The hue of a lightning dot, in degrees, and how far from it a cell's hue may be and still count a little. */
const LIGHTNING_HUE = 48;
const HUE_WIDTH = 30;
/** Lightning appears between these two x positions; they are heard as full left and full right. */
const PAN_LEFT_X = 0.3;
const PAN_RIGHT_X = 0.8;

// ---- Tuning. Set by measurement on the real clip; see docs/PROJECT_LOG.md, 2026-11-15. ----
/**
 * A cell's yellow glow (see `yellowGlow`) must rise by more than this, between
 * two analysed frames, to count as a flash. About 4 notes a second on the real clip.
 */
const FLASH_THRESHOLD = 0.012;
/** A flash this strong (total rise in glow over the cell and its neighbours) plays at full loudness. */
const FULL_STRENGTH = 0.08;
/** C3 to C6. */
const PITCH_RANGE = { rootMidi: 48, octaves: 3 };
/** Full left and right are a little wide for headphones. */
const PAN_WIDTH = 0.9;
/** Note cap: 10 per second sustained plus 2 saved up, so no one-second span has more than 12. */
const NOTES_PER_SECOND = 10;
const NOTE_BURST = 2;
/**
 * A cell that has just sounded, and its neighbours, stay quiet this long. A dot
 * brightens over up to half a second and drifts with the globe, and is one note.
 */
const REFRACTORY_SECONDS = 1;
/** A gap in media time longer than this, or any step backwards, is a seek or a loop: nothing is a flash on that frame. */
const MAX_FRAME_GAP_SECONDS = 1;
const NOTE_SECONDS = 0.1;
const VOICE_COUNT = 8;
/** Above 1: short plucks need it to sit level with the ocean track's chord (volume balance of 2026-11-15). */
const LEVEL = 1.6;
const FADE_SECONDS = 0.05;

export interface LightningNote {
  /** Media time of the frame that caused the note, in seconds. */
  time: number;
  /** Where the flash is in the frame, 0..1 from the top left. */
  x: number;
  y: number;
  hz: number;
  /** -1 left .. +1 right. */
  pan: number;
  /** 0..1. */
  velocity: number;
}

export interface LightningOptions {
  /** Called for every note played. For the dev harness. */
  onNote?: (note: LightningNote) => void;
}

interface Voice {
  synth: Synth;
  panner: Panner;
}

// ---- Legend. Each example is a flash at a place on the map, of a given size,
// and goes through the same mapping as a real one. ----
/** A flash of ordinary size: the median on the real clip, loudness about 0.5. */
const TYPICAL_STRENGTH = 0.021;
/** The smallest rise that counts as a flash (loudness 0.25), and one that reaches full loudness. */
const SMALL_STRENGTH = FLASH_THRESHOLD;
const BIG_STRENGTH = FULL_STRENGTH;
/**
 * Heights for the examples, each in the middle of one note's band and not on
 * the edge between two: A5 near the top, G4 near the middle, E3 near the bottom.
 */
const NORTH_Y = 0.07;
const MIDDLE_Y = 0.47;
const SOUTH_Y = 0.87;
/** Halfway between the two edges of the pan range, so it is heard in the middle. */
const MIDDLE_X = (PAN_LEFT_X + PAN_RIGHT_X) / 2;
const LEGEND_EXAMPLES = [
  { id: 'north', label: 'Lightning in the north', x: MIDDLE_X, y: NORTH_Y, strength: TYPICAL_STRENGTH },
  { id: 'south', label: 'Lightning in the south', x: MIDDLE_X, y: SOUTH_Y, strength: TYPICAL_STRENGTH },
  { id: 'left', label: 'Lightning on the left of the picture', x: PAN_LEFT_X, y: MIDDLE_Y, strength: TYPICAL_STRENGTH },
  { id: 'right', label: 'Lightning on the right of the picture', x: PAN_RIGHT_X, y: MIDDLE_Y, strength: TYPICAL_STRENGTH },
  { id: 'small', label: 'A small flash', x: MIDDLE_X, y: MIDDLE_Y, strength: SMALL_STRENGTH },
  { id: 'big', label: 'A big flash', x: MIDDLE_X, y: MIDDLE_Y, strength: BIG_STRENGTH },
];

/**
 * How much lightning yellow a cell holds, 0..1: saturation times brightness,
 * weighted by how close the hue is to LIGHTNING_HUE. White, grey and blue cells
 * (the orbit line, clouds, the globe, stars) give about 0 however bright they are.
 */
function yellowGlow(hue: number, sat: number, luma: number): number {
  return sat * luma * Math.max(0, 1 - Math.abs(hue - LIGHTNING_HUE) / HUE_WIDTH);
}

/** Stereo position for a place in the frame: PAN_LEFT_X and anything left of it is full left. */
function panFor(x: number): number {
  const unit = (x - PAN_LEFT_X) / (PAN_RIGHT_X - PAN_LEFT_X);
  return (Math.min(1, Math.max(0, unit)) * 2 - 1) * PAN_WIDTH;
}

/** The note for a flash at (x, y), both 0..1 from the top left, with the strength findRises gives it. */
function noteFor(x: number, y: number, strength: number, time: number): LightningNote {
  const size = Math.max(0, strength - FLASH_THRESHOLD) / (FULL_STRENGTH - FLASH_THRESHOLD);
  return {
    time,
    x,
    y,
    hz: scaleHz(1 - y, PITCH_RANGE),
    pan: panFor(x),
    velocity: Math.min(1, 0.25 + 0.75 * Math.sqrt(size)),
  };
}

function makePluck(destination: ToneAudioNode): Synth {
  return new Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.003, decay: 0.3, sustain: 0, release: 0.2 },
  }).connect(destination);
}

/** Where a point is, in words. North is up on the globe; left and right are as heard. */
function describePlace(x: number, y: number): string {
  const ns = y < 0.4 ? 'in the north' : y > 0.6 ? 'in the south' : '';
  const pan = panFor(x);
  const side = pan < -0.3 ? 'on the left' : pan > 0.3 ? 'on the right' : '';
  if (ns && side) return `${ns}, ${side}`;
  return ns || side || 'near the middle of the picture';
}

export function createLightningSonifier(output: ToneAudioNode, options: LightningOptions = {}): Sonifier {
  let out: Gain | null = null;
  let voices: Voice[] = [];
  let nextVoice = 0;
  let silent = true;
  let tokens = NOTE_BURST;
  let lastTime = 0;
  let lastFired = new Float64Array(0);

  // The detector's memory: each cell's yellow glow on the last frame it saw.
  let glow = new Float32Array(0);
  let glowTime = -Infinity;
  let found: Flash[] = [];

  /**
   * The new flashes of a frame, strongest first. Remembers the frame, so that
   * update() and describeNow() can both ask about the same one.
   */
  const detect = (f: FrameFeatures): Flash[] => {
    const cells = f.cols * f.rows;
    if (f.time === glowTime && glow.length === cells) return found;
    const jumped = glow.length !== cells || f.time < glowTime || f.time - glowTime > MAX_FRAME_GAP_SECONDS;
    const next = new Float32Array(cells);
    const rise = new Float32Array(cells);
    for (let cell = 0; cell < cells; cell++) {
      next[cell] = yellowGlow(f.hue[cell], f.sat[cell], f.luma[cell]);
      if (!jumped) rise[cell] = next[cell] - glow[cell];
    }
    glow = next;
    glowTime = f.time;
    found = jumped ? [] : findRises(rise, f.cols, f.rows, FLASH_THRESHOLD);
    return found;
  };

  // The legend's own voice, built the first time a legend button is pressed.
  let legendVoice: (Voice & { gain: Gain }) | null = null;

  // The notes of the last second or so, for describeNow.
  let recent: LightningNote[] = [];

  const playNote = (x: number, y: number, strength: number, time: number) => {
    const voice = voices[nextVoice];
    nextVoice = (nextVoice + 1) % voices.length;
    const note = noteFor(x, y, strength, time);
    recent.push(note);
    // Bounded even if nobody asks for a description (the cap is 12 notes a second).
    if (recent.length > 32) recent.shift();
    const at = now();
    voice.panner.pan.setValueAtTime(note.pan, at);
    voice.synth.triggerAttackRelease(note.hz, NOTE_SECONDS, at, note.velocity);
    options.onNote?.(note);
  };

  const playExample = (x: number, y: number, strength: number) => {
    if (!legendVoice) {
      // Its own way to the output: the main gain is closed while the picture is paused.
      const gain = new Gain(LEVEL).connect(output);
      const panner = new Panner(0).connect(gain);
      legendVoice = { synth: makePluck(panner), panner, gain };
    }
    const note = noteFor(x, y, strength, 0);
    const at = now();
    legendVoice.panner.pan.setValueAtTime(note.pan, at);
    legendVoice.synth.triggerAttackRelease(note.hz, NOTE_SECONDS, at, note.velocity);
  };

  return {
    legend: LEGEND_EXAMPLES.map(({ id, label, x, y, strength }) => ({
      id,
      label,
      play: () => playExample(x, y, strength),
    })),

    start() {
      if (out) return;
      const bus = new Gain(0).connect(output);
      out = bus;
      voices = Array.from({ length: VOICE_COUNT }, () => {
        const panner = new Panner(0).connect(bus);
        return { synth: makePluck(panner), panner };
      });
    },

    update(f: FrameFeatures) {
      if (!out) return;
      if (silent) {
        out.gain.rampTo(LEVEL, FADE_SECONDS);
        silent = false;
      }

      const cells = f.cols * f.rows;
      if (lastFired.length !== cells || f.time < lastTime) {
        // New grid, or the media jumped backwards (loop, seek): forget what has sounded.
        lastFired = new Float64Array(cells).fill(-Infinity);
        lastTime = f.time;
      }
      tokens = Math.min(NOTE_BURST, tokens + Math.min(1, f.time - lastTime) * NOTES_PER_SECOND);
      lastTime = f.time;

      // Strongest first, so when the cap bites it is the small flashes that are dropped.
      for (const flash of detect(f)) {
        if (tokens < 1) break;
        if (f.time - lastFired[flash.row * f.cols + flash.col] < REFRACTORY_SECONDS) continue;
        for (let r = Math.max(0, flash.row - 1); r <= Math.min(f.rows - 1, flash.row + 1); r++) {
          for (let c = Math.max(0, flash.col - 1); c <= Math.min(f.cols - 1, flash.col + 1); c++) {
            lastFired[r * f.cols + c] = f.time;
          }
        }
        tokens -= 1;
        playNote(flash.x, flash.y, flash.strength, f.time);
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
      const nodes: ToneAudioNode[] = [];
      if (legendVoice) {
        legendVoice.gain.gain.rampTo(0, FADE_SECONDS, immediate());
        nodes.push(legendVoice.synth, legendVoice.panner, legendVoice.gain);
        legendVoice = null;
      }
      if (out) {
        out.gain.rampTo(0, FADE_SECONDS, immediate());
        nodes.push(out, ...voices.flatMap((v) => [v.synth, v.panner]));
        out = null;
        voices = [];
        silent = true;
      }
      // Let the fade finish before the nodes go, to avoid a click.
      setTimeout(() => nodes.forEach((n) => n.dispose()), 2 * FADE_SECONDS * 1000);
    },

    describeNow(f: FrameFeatures) {
      if (out && !silent) {
        // While it sounds: the notes of the last second, so the sentence is what was just heard.
        recent = recent.filter((note) => note.time <= f.time && note.time > f.time - 1);
        if (recent.length === 0) return 'No new lightning in the last second.';
        const latest = recent[recent.length - 1];
        const where = describePlace(latest.x, latest.y);
        return recent.length === 1
          ? `One flash in the last second, ${where}.`
          : `${recent.length} flashes in the last second, the latest ${where}.`;
      }
      // Before the sound has started: this frame alone.
      const flashes = detect(f);
      if (flashes.length === 0) return 'No new lightning right now.';
      const where = describePlace(flashes[0].x, flashes[0].y);
      return flashes.length === 1
        ? `One new flash, ${where}.`
        : `${flashes.length} new flashes, the brightest ${where}.`;
    },
  };
}
