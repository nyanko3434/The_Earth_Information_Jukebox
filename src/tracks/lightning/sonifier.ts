// Lightning sonifier: every new flash is one short plucked note.
//   height in the frame (latitude)   -> pitch, top is high, pentatonic
//   left-right position (longitude)  -> stereo pan
//   size of the jump in brightness   -> loudness
import { Gain, Panner, Synth, immediate, now } from 'tone';
import type { ToneAudioNode } from 'tone';
import { findFlashes } from '../../analysis/helpers.ts';
import { scaleHz } from '../../audio/scales.ts';
import type { FrameFeatures, Sonifier } from '../../types.ts';

// ---- Tuning. Set against the synthetic flashes clip; revisit on real footage. ----
/** A cell must brighten by more than this, between two analysed frames, to count as a flash. */
const FLASH_THRESHOLD = 0.08;
/** C3 to C6. */
const PITCH_RANGE = { rootMidi: 48, octaves: 3 };
/** Full left and right are a little wide for headphones. */
const PAN_WIDTH = 0.9;
/** Note cap: 10 per second sustained plus 2 saved up, so no one-second span has more than 12. */
const NOTES_PER_SECOND = 10;
const NOTE_BURST = 2;
/** A cell that has just sounded, and its neighbours, stay quiet this long (a flash that brightens over several frames is one note). */
const REFRACTORY_SECONDS = 0.4;
const NOTE_SECONDS = 0.1;
const VOICE_COUNT = 8;
const LEVEL = 0.8;
const FADE_SECONDS = 0.05;

export interface LightningNote {
  /** Media time of the frame that caused the note, in seconds. */
  time: number;
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
/** A flash of ordinary size: loudness 0.6. */
const TYPICAL_STRENGTH = 0.65;
/** The smallest rise that counts as a flash, and one that reaches full loudness. */
const SMALL_STRENGTH = FLASH_THRESHOLD;
const BIG_STRENGTH = 3;
/**
 * Heights for the examples, each in the middle of one note's band and not on
 * the edge between two: A5 near the top, G4 near the equator, E3 near the bottom.
 */
const NORTH_Y = 0.07;
const MIDDLE_Y = 0.47;
const SOUTH_Y = 0.87;
const LEGEND_EXAMPLES = [
  { id: 'north', label: 'Lightning in the north', x: 0.5, y: NORTH_Y, strength: TYPICAL_STRENGTH },
  { id: 'south', label: 'Lightning in the south', x: 0.5, y: SOUTH_Y, strength: TYPICAL_STRENGTH },
  { id: 'west', label: 'Lightning in the west', x: 0.05, y: MIDDLE_Y, strength: TYPICAL_STRENGTH },
  { id: 'east', label: 'Lightning in the east', x: 0.95, y: MIDDLE_Y, strength: TYPICAL_STRENGTH },
  { id: 'small', label: 'A small flash', x: 0.5, y: MIDDLE_Y, strength: SMALL_STRENGTH },
  { id: 'big', label: 'A big flash', x: 0.5, y: MIDDLE_Y, strength: BIG_STRENGTH },
];

/** The note for a flash at (x, y), both 0..1 from the top left, with the strength findFlashes gives it. */
function noteFor(x: number, y: number, strength: number, time: number): LightningNote {
  return {
    time,
    hz: scaleHz(1 - y, PITCH_RANGE),
    pan: (x * 2 - 1) * PAN_WIDTH,
    velocity: Math.min(1, 0.25 + 0.75 * Math.sqrt(strength / 3)),
  };
}

function makePluck(destination: ToneAudioNode): Synth {
  return new Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.003, decay: 0.3, sustain: 0, release: 0.2 },
  }).connect(destination);
}

/** Where a point is, in words. Assumes a flat world map with north at the top. */
function describePlace(x: number, y: number): string {
  const ns = y < 0.4 ? 'north' : y > 0.6 ? 'south' : '';
  const ew = x < 0.4 ? 'west' : x > 0.6 ? 'east' : '';
  if (ns && ew) return `in the ${ns}-${ew}`;
  if (ns || ew) return `in the ${ns || ew}`;
  return 'near the middle of the map';
}

export function createLightningSonifier(output: ToneAudioNode, options: LightningOptions = {}): Sonifier {
  let out: Gain | null = null;
  let voices: Voice[] = [];
  let nextVoice = 0;
  let silent = true;
  let tokens = NOTE_BURST;
  let lastTime = 0;
  let lastFired = new Float64Array(0);

  // The legend's own voice, built the first time a legend button is pressed.
  let legendVoice: (Voice & { gain: Gain }) | null = null;

  const playNote = (x: number, y: number, strength: number, time: number) => {
    const voice = voices[nextVoice];
    nextVoice = (nextVoice + 1) % voices.length;
    const note = noteFor(x, y, strength, time);
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
      for (const flash of findFlashes(f, FLASH_THRESHOLD)) {
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
      const flashes = findFlashes(f, FLASH_THRESHOLD);
      if (flashes.length === 0) return 'No new lightning right now.';
      const where = describePlace(flashes[0].x, flashes[0].y);
      return flashes.length === 1
        ? `One new flash, ${where}.`
        : `${flashes.length} new flashes, the brightest ${where}.`;
    },
  };
}
