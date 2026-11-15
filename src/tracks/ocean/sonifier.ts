// Ocean sonifier: a slow chord of six pad voices, one per region of the map.
//   region's colour, read off the colorbar (temperature) -> pitch and fullness:
//                                                           warm is low and full, cold is high and thin
//   west or east half of the map (longitude)             -> stereo pan
//   share of the region that is water                    -> loudness of its voice
//   movement in the region                               -> a shimmer above its note
// Pitch carries temperature here, so latitude chooses the voice instead of the
// pitch. This track is the stated exception to "latitude -> pitch"
// (docs/ARCHITECTURE.md, "Audio rules").
import { FatOscillator, Filter, Gain, LFO, Oscillator, Panner, immediate, now } from 'tone';
import type { ToneAudioNode } from 'tone';
import { regionValue } from '../../analysis/helpers.ts';
import type { Colorbar, ColourMask } from '../../analysis/helpers.ts';
import { scaleHz } from '../../audio/scales.ts';
import type { FrameFeatures, Rect, Sonifier } from '../../types.ts';

// ---- What the picture looks like. Read from public/media/ocean.jpg (SVS 3912). ----
/**
 * The clip's "Sea Surface Temp" colorbar, sampled at 17 even steps from its
 * cold end (value 0, labelled 0 °C) to its warm end (value 1, labelled 32 °C).
 * The bar is linear in temperature, so one step is 2 °C, but it is not linear
 * in hue: the greens are stretched.
 */
const HUES = [227, 215, 200, 178, 160, 148, 138, 129, 117, 100, 82, 68, 59, 47, 31, 12, -7];
export const OCEAN_COLORBAR: Colorbar = HUES.map((hue, i) => ({ hue, value: i / (HUES.length - 1) }));
/** Water is saturated and not black. Land is grey (saturation under 0.2); blanked cells are black. */
const WATER: ColourMask = { minSat: 0.4, minLuma: 0.04 };

// ---- Tuning. Set against the real clip by measurement; not yet judged by ear. ----
/** A2 to A5. */
const PITCH_RANGE = { rootMidi: 45, octaves: 3 };
/**
 * Colorbar positions that reach the ends of the pitch range. A region's mean
 * never gets near 0 or 1 (on the clip it stays between 0.26 and 0.86), so the
 * range is stretched to make a season's change worth a few notes.
 */
const COLDEST = 0.15;
const WARMEST = 0.9;
/** Seconds of picture between two strikes of the chord. Notes change only on a strike. */
const CHORD_SECONDS = 4;
/** On a strike each zone starts this long after the one above it, north first. */
const STAGGER_SECONDS = 0.2;
/** A strike: the voice dips to DIP_LEVEL, glides to its new note at the bottom of the dip, and swells back. */
const DIP_LEVEL = 0.4;
const DIP_SECONDS = 0.3;
const SWELL_SECONDS = 1.5;
const GLIDE_SECONDS = 0.25;
/** The swell from silence, on Play and after a pause. Shorter, so sound follows the picture promptly. */
const FRESH_SWELL_SECONDS = 0.8;
/**
 * Smoothing. A region's colour is a mean over hundreds of cells and is steady
 * already, so it is smoothed lightly; movement flickers from frame to frame and
 * needs longer. Synth parameters then ramp over PARAM_SECONDS.
 */
const READING_SECONDS = 0.15;
const MOTION_SECONDS = 0.5;
const PARAM_SECONDS = 0.3;
/** Fullness: voice level and filter opening (as a multiple of the note's frequency), cold to warm. */
const COLD_LEVEL = 0.26;
const WARM_LEVEL = 0.8;
const COLD_BRIGHTNESS = 1.3;
const WARM_BRIGHTNESS = 6;
const COLD_SPREAD_CENTS = 6;
const WARM_SPREAD_CENTS = 22;
/** A region with less water than this is silent; one with FULL_COVERAGE or more plays at full level. */
const MIN_COVERAGE = 0.03;
const FULL_COVERAGE = 0.3;
/**
 * Movement, as mean change in brightness per second of picture over the
 * region's water. STILL and below is no shimmer, FLOWING and above is full.
 * On the clip the regions read about 0.02 to 0.035.
 */
const STILL = 0.008;
const FLOWING = 0.05;
const SHIMMER_LEVEL = 0.12;
/** The shimmer is the voice's own note, moved up by whole octaves into this band (Hz). */
const SHIMMER_FLOOR_HZ = 1000;
const PAN = 0.6;
/**
 * Each voice sits this many cents from the next. Two voices often hold the same
 * note, and at exactly the same frequency they would add or cancel by chance of
 * phase; a few cents apart they drift slowly instead. Too little to hear as pitch.
 */
const VOICE_DETUNE_CENTS = 1.5;
const LEVEL = 1;
const FADE_SECONDS = 0.05;
/** A gap in media time longer than this, or any step backwards, is a seek or a loop. */
const MAX_FRAME_GAP_SECONDS = 1;

// ---- Legend. One voice plays one example: a colorbar position, with or
// without the shimmer, through the same mapping as the six voices. Not yet
// judged by ear. ----
/** The warm end of the pitch range (A2, where the tropics sit) and the coldest any region of the clip gets (E5). */
const LEGEND_WARM = WARMEST;
const LEGEND_COLD = 0.26;
/** "Moving water" is a mild note (E4) with the shimmer at full strength. */
const LEGEND_MILD = 0.5;
/** An example swells in, holds and fades: 1.55 s in all. */
const LEGEND_ATTACK_SECONDS = 0.15;
const LEGEND_HOLD_SECONDS = 1;
const LEGEND_RELEASE_SECONDS = 0.4;
/** An example still sounding is faded out this quickly when another one starts. */
const LEGEND_CUT_SECONDS = 0.03;
const LEGEND_LEVEL = 1;
const LEGEND_EXAMPLES = [
  { id: 'warm', label: 'Warm water', warmth: LEGEND_WARM, moving: false },
  { id: 'cold', label: 'Cold water', warmth: LEGEND_COLD, moving: false },
  { id: 'moving', label: 'Moving water', warmth: LEGEND_MILD, moving: true },
];

interface Region {
  id: string;
  /** For describeNow, to follow "in". */
  label: string;
  rect: Rect;
  /** 0 north, 1 tropics, 2 south: the order the voices enter on a strike. */
  zone: number;
  pan: number;
}

// Three latitude zones by two halves. The south stops at y 0.81, above the
// colorbar, so the colorbar cannot sound even without the track's ignore rectangle.
const ZONES = [
  { y: 0, h: 0.34, west: ['north-west', 'the north-west'], east: ['north-east', 'the north-east'] },
  { y: 0.34, h: 0.32, west: ['tropics-west', 'the western tropics'], east: ['tropics-east', 'the eastern tropics'] },
  { y: 0.66, h: 0.15, west: ['south-west', 'the south-west'], east: ['south-east', 'the south-east'] },
] as const;

const REGIONS: Region[] = ZONES.flatMap((z, zone) => [
  { id: z.west[0], label: z.west[1], rect: { x: 0, y: z.y, w: 0.5, h: z.h }, zone, pan: -PAN },
  { id: z.east[0], label: z.east[1], rect: { x: 0.5, y: z.y, w: 0.5, h: z.h }, zone, pan: PAN },
]);

/** What one voice is doing. For the dev harness. */
export interface OceanVoiceState {
  id: string;
  /** Colorbar position of the region's water, 0 cold .. 1 warm, smoothed. */
  warmth: number;
  /** Fraction of the region that is water. */
  coverage: number;
  /** Movement per second of picture, smoothed. */
  motion: number;
  /** The note the voice holds since the last strike. */
  hz: number;
  /** -1 left .. +1 right. */
  pan: number;
  /** Gain of the pad, 0 when the region has no water. */
  level: number;
  /** Gain of the shimmer. */
  shimmer: number;
}

export interface OceanUpdate {
  /** Media time of the frame, in seconds. */
  time: number;
  /** True on the frame that struck the chord. */
  struck: boolean;
  voices: OceanVoiceState[];
}

export interface OceanOptions {
  /** Called for every analysed frame. For the dev harness. */
  onUpdate?: (update: OceanUpdate) => void;
}

interface Voice {
  region: Region;
  osc: FatOscillator;
  filter: Filter;
  level: Gain;
  shimmerOsc: Oscillator;
  shimmerLevel: Gain;
  tremolo: Gain;
  lfo: LFO;
  swell: Gain;
  panner: Panner;
  // Smoothed readings of the region.
  warmth: number;
  coverage: number;
  motion: number;
  // What the synth has been asked for.
  hz: number;
  levelTarget: number;
  cutoffTarget: number;
  shimmerTarget: number;
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/** 0 at COLDEST, 1 at WARMEST. */
function warmthUnit(warmth: number): number {
  return clamp01((warmth - COLDEST) / (WARMEST - COLDEST));
}

/** The note for a colorbar position: warm is low. */
export function oceanHz(warmth: number): number {
  return scaleHz(1 - warmthUnit(warmth), PITCH_RANGE);
}

function shimmerHz(hz: number): number {
  return hz * 2 ** Math.max(1, Math.ceil(Math.log2(SHIMMER_FLOOR_HZ / hz)));
}

function shimmerAmount(motion: number): number {
  return clamp01((motion - STILL) / (FLOWING - STILL));
}

function coverageGain(coverage: number): number {
  return coverage < MIN_COVERAGE ? 0 : Math.min(1, Math.sqrt(coverage / FULL_COVERAGE));
}

// Fullness, for a warmth unit of 0 (cold) to 1 (warm). Shared by the six voices and the legend.
function padLevel(unit: number): number {
  return COLD_LEVEL + (WARM_LEVEL - COLD_LEVEL) * unit;
}

function padCutoff(hz: number, unit: number): number {
  return hz * (COLD_BRIGHTNESS + (WARM_BRIGHTNESS - COLD_BRIGHTNESS) * unit);
}

function padSpread(unit: number): number {
  return COLD_SPREAD_CENTS + (WARM_SPREAD_CENTS - COLD_SPREAD_CENTS) * unit;
}

/** The legend's voice: the same chain as one of the six, with its own envelope and its own way to the output. */
interface LegendVoice {
  osc: FatOscillator;
  filter: Filter;
  level: Gain;
  shimmerOsc: Oscillator;
  shimmerLevel: Gain;
  tremolo: Gain;
  lfo: LFO;
  envelope: Gain;
  panner: Panner;
  out: Gain;
}

function buildLegendVoice(output: ToneAudioNode): LegendVoice {
  const hz = oceanHz(LEGEND_MILD);
  const out = new Gain(LEGEND_LEVEL).connect(output);
  // Centred, through a panner like the six voices, so the level per speaker is comparable.
  const panner = new Panner(0).connect(out);
  const envelope = new Gain(0).connect(panner);
  const level = new Gain(0).connect(envelope);
  const filter = new Filter({ type: 'lowpass', frequency: hz * 2, rolloff: -24, Q: 0.5 }).connect(level);
  const osc = new FatOscillator({ frequency: hz, type: 'sawtooth', count: 3, spread: COLD_SPREAD_CENTS })
    .connect(filter)
    .start();
  const tremolo = new Gain(0).connect(envelope);
  const shimmerLevel = new Gain(0).connect(tremolo);
  const shimmerOsc = new Oscillator({ frequency: shimmerHz(hz), type: 'sine' }).connect(shimmerLevel).start();
  const lfo = new LFO(5.5, 0.1, 1).connect(tremolo.gain).start();
  return { osc, filter, level, shimmerOsc, shimmerLevel, tremolo, lfo, envelope, panner, out };
}

/** One reading of every region straight from a frame, unsmoothed. */
function readRegions(f: FrameFeatures) {
  return REGIONS.map((region) => ({ region, ...regionValue(f, region.rect, OCEAN_COLORBAR, WATER) }));
}

export function createOceanSonifier(output: ToneAudioNode, options: OceanOptions = {}): Sonifier {
  let out: Gain | null = null;
  let voices: Voice[] = [];
  let silent = true;
  let hasFrame = false;
  let lastTime = 0;
  let lastStrike = -Infinity;

  /** Starts the chord again. `fresh` is from silence: no dip and no glide, every voice swells from nothing. */
  const strike = (fresh: boolean) => {
    const t0 = now();
    for (const v of voices) {
      const t = t0 + v.region.zone * STAGGER_SECONDS;
      // A region with no water keeps its old note; it is silent anyway.
      const hz = v.coverage < MIN_COVERAGE ? v.hz : oceanHz(v.warmth);
      v.osc.spread = padSpread(warmthUnit(v.warmth));
      if (fresh) {
        v.swell.gain.cancelScheduledValues(t0);
        v.swell.gain.setValueAtTime(0, t0);
        v.swell.gain.setValueAtTime(0, t);
        v.swell.gain.linearRampToValueAtTime(1, t + FRESH_SWELL_SECONDS);
        v.osc.frequency.cancelScheduledValues(t0);
        v.osc.frequency.setValueAtTime(hz, t0);
        v.shimmerOsc.frequency.cancelScheduledValues(t0);
        v.shimmerOsc.frequency.setValueAtTime(shimmerHz(hz), t0);
      } else {
        v.swell.gain.cancelAndHoldAtTime(t);
        v.swell.gain.linearRampToValueAtTime(DIP_LEVEL, t + DIP_SECONDS);
        v.swell.gain.linearRampToValueAtTime(1, t + DIP_SECONDS + SWELL_SECONDS);
        if (hz !== v.hz) {
          const glideAt = t + DIP_SECONDS - GLIDE_SECONDS / 2;
          v.osc.frequency.exponentialRampTo(hz, GLIDE_SECONDS, glideAt);
          v.shimmerOsc.frequency.exponentialRampTo(shimmerHz(hz), GLIDE_SECONDS, glideAt);
        }
      }
      v.hz = hz;
    }
  };

  /** Moves the continuous parameters towards what the region shows now. */
  const follow = (v: Voice, snap: boolean) => {
    const unit = warmthUnit(v.warmth);
    const cover = coverageGain(v.coverage);
    const level = padLevel(unit) * cover;
    const cutoff = padCutoff(v.hz, unit);
    const shimmer = SHIMMER_LEVEL * shimmerAmount(v.motion) * cover;
    const seconds = snap ? 0.01 : PARAM_SECONDS;
    // Skip changes too small to hear, so 20 frames a second do not mean 20
    // ramps a second; but always go all the way to zero.
    const moved = (target: number, last: number, step: number) =>
      snap || Math.abs(target - last) > step || (target === 0 && last !== 0);
    if (moved(level, v.levelTarget, 0.005)) {
      v.level.gain.rampTo(level, seconds);
      v.levelTarget = level;
    }
    if (moved(cutoff, v.cutoffTarget, 0.02 * v.cutoffTarget)) {
      v.filter.frequency.rampTo(cutoff, seconds);
      v.cutoffTarget = cutoff;
    }
    if (moved(shimmer, v.shimmerTarget, 0.002)) {
      v.shimmerLevel.gain.rampTo(shimmer, seconds);
      v.shimmerTarget = shimmer;
    }
  };

  // Built the first time a legend button is pressed.
  let legendVoice: LegendVoice | null = null;

  const playExample = (warmth: number, moving: boolean) => {
    legendVoice ??= buildLegendVoice(output);
    const v = legendVoice;
    const hz = oceanHz(warmth);
    const unit = warmthUnit(warmth);
    // An example that is still sounding is faded out first, so the new note does not start with a jump.
    const cut = now();
    const t = cut + LEGEND_CUT_SECONDS;
    v.envelope.gain.cancelAndHoldAtTime(cut);
    v.envelope.gain.linearRampToValueAtTime(0, t);
    v.osc.spread = padSpread(unit);
    v.osc.frequency.setValueAtTime(hz, t);
    v.filter.frequency.setValueAtTime(padCutoff(hz, unit), t);
    v.level.gain.setValueAtTime(padLevel(unit), t);
    v.shimmerOsc.frequency.setValueAtTime(shimmerHz(hz), t);
    v.shimmerLevel.gain.setValueAtTime(moving ? SHIMMER_LEVEL : 0, t);
    const held = t + LEGEND_ATTACK_SECONDS;
    v.envelope.gain.linearRampToValueAtTime(1, held);
    v.envelope.gain.setValueAtTime(1, held + LEGEND_HOLD_SECONDS);
    v.envelope.gain.linearRampToValueAtTime(0, held + LEGEND_HOLD_SECONDS + LEGEND_RELEASE_SECONDS);
  };

  return {
    legend: LEGEND_EXAMPLES.map(({ id, label, warmth, moving }) => ({
      id,
      label,
      play: () => playExample(warmth, moving),
    })),

    start() {
      if (out) return;
      const bus = new Gain(0).connect(output);
      out = bus;
      voices = REGIONS.map((region, i) => {
        const hz = oceanHz(0.5);
        const panner = new Panner(region.pan).connect(bus);
        const swell = new Gain(0).connect(panner);
        const level = new Gain(0).connect(swell);
        const filter = new Filter({ type: 'lowpass', frequency: hz * 2, rolloff: -24, Q: 0.5 }).connect(level);
        const detune = (i - (REGIONS.length - 1) / 2) * VOICE_DETUNE_CENTS;
        const osc = new FatOscillator({
          frequency: hz,
          detune,
          type: 'sawtooth',
          count: 3,
          spread: COLD_SPREAD_CENTS,
        })
          .connect(filter)
          .start();
        // The shimmer goes through the same swell, so it breathes with the chord.
        const tremolo = new Gain(0).connect(swell);
        const shimmerLevel = new Gain(0).connect(tremolo);
        const shimmerOsc = new Oscillator({ frequency: shimmerHz(hz), detune, type: 'sine' })
          .connect(shimmerLevel)
          .start();
        // A different rate per voice, so the six shimmers do not pulse together.
        const lfo = new LFO(5.5 + 0.6 * i, 0.1, 1).connect(tremolo.gain).start();
        return {
          region,
          osc,
          filter,
          level,
          shimmerOsc,
          shimmerLevel,
          tremolo,
          lfo,
          swell,
          panner,
          warmth: 0.5,
          coverage: 0,
          motion: 0,
          hz,
          levelTarget: 0,
          cutoffTarget: hz * 2,
          shimmerTarget: 0,
        };
      });
    },

    update(f: FrameFeatures) {
      if (!out) return;
      const gap = f.time - lastTime;
      // The first frame, a seek or a loop: take the picture as it is, with no smoothing from before.
      const jumped = !hasFrame || gap < 0 || gap > MAX_FRAME_GAP_SECONDS;
      const blend = jumped ? 1 : 1 - Math.exp(-gap / READING_SECONDS);
      const motionBlend = jumped ? 0 : 1 - Math.exp(-gap / MOTION_SECONDS);
      for (const v of voices) {
        const r = regionValue(f, v.region.rect, OCEAN_COLORBAR, WATER);
        v.coverage += (r.coverage - v.coverage) * blend;
        if (r.coverage > 0) v.warmth += (r.value - v.warmth) * blend;
        // deltaLuma is the change since the last analysed frame, and those are
        // 33 or 67 ms apart on a 30 fps clip, so it is turned into a rate.
        // After a jump it is all zero and says nothing.
        if (gap > 0) v.motion += (r.motion / gap - v.motion) * motionBlend;
      }
      hasFrame = true;
      lastTime = f.time;

      const fresh = silent;
      const struck = fresh || jumped || f.time - lastStrike >= CHORD_SECONDS;
      if (struck) {
        strike(fresh);
        lastStrike = f.time;
      }
      for (const v of voices) follow(v, fresh);
      if (silent) {
        out.gain.rampTo(LEVEL, FADE_SECONDS);
        silent = false;
      }

      options.onUpdate?.({
        time: f.time,
        struck,
        voices: voices.map((v) => ({
          id: v.region.id,
          warmth: v.warmth,
          coverage: v.coverage,
          motion: v.motion,
          hz: v.hz,
          pan: v.region.pan,
          level: v.levelTarget,
          shimmer: v.shimmerTarget,
        })),
      });
    },

    pause() {
      if (!out || silent) return;
      // The oscillators keep running behind the closed gain; the next update strikes the chord from silence.
      silent = true;
      out.gain.rampTo(0, FADE_SECONDS, immediate());
    },

    dispose() {
      const nodes: ToneAudioNode[] = [];
      if (legendVoice) {
        legendVoice.out.gain.rampTo(0, FADE_SECONDS, immediate());
        nodes.push(...Object.values(legendVoice));
        legendVoice = null;
      }
      if (out) {
        out.gain.rampTo(0, FADE_SECONDS, immediate());
        nodes.push(
          out,
          ...voices.flatMap((v) => [
            v.osc,
            v.filter,
            v.level,
            v.shimmerOsc,
            v.shimmerLevel,
            v.tremolo,
            v.lfo,
            v.swell,
            v.panner,
          ]),
        );
        out = null;
        voices = [];
        silent = true;
        hasFrame = false;
      }
      // Let the fade finish before the nodes go, to avoid a click.
      setTimeout(() => nodes.forEach((n) => n.dispose()), 2 * FADE_SECONDS * 1000);
    },

    describeNow(f: FrameFeatures) {
      // The smoothed readings when the sonifier is running, so the sentence
      // matches the sound; otherwise the frame alone, which has no usable rate of movement.
      const running = voices.length > 0 && hasFrame;
      const readings = running
        ? voices.map((v) => ({ label: v.region.label, warmth: v.warmth, coverage: v.coverage, motion: v.motion }))
        : readRegions(f).map((r) => ({ label: r.region.label, warmth: r.value, coverage: r.coverage, motion: 0 }));
      const water = readings.filter((r) => r.coverage >= MIN_COVERAGE);
      if (water.length === 0) return 'No open water in the picture right now.';

      const warm = water.reduce((a, b) => (b.warmth > a.warmth ? b : a));
      const cold = water.reduce((a, b) => (b.warmth < a.warmth ? b : a));
      const moving = water.reduce((a, b) => (b.motion > a.motion ? b : a));
      const shimmer =
        shimmerAmount(moving.motion) > 0.1
          ? `the shimmer is strongest in ${moving.label}, where the water moves most`
          : 'there is no shimmer, because the water is still';
      if (oceanHz(warm.warmth) === oceanHz(cold.warmth)) {
        return `The water is about the same temperature everywhere, so the notes sit together; ${shimmer}.`;
      }
      return `Warm water in ${warm.label} is the low, full sound; cold water in ${cold.label} is the high, thin one; ${shimmer}.`;
    },
  };
}
