// Step 1 test tone: one sine whose pitch follows meanLuma and whose stereo
// position follows the horizontal centre of brightness. A diagnostic, not a
// track. Its pitch is continuous on purpose (not quantised to a scale), so that
// small changes in brightness stay audible; real sonifiers quantise.
import { Gain, Oscillator, Panner, immediate } from 'tone';
import type { ToneAudioNode } from 'tone';
import type { FrameFeatures, Sonifier } from '../types.ts';

const LOW_HZ = 110;
const OCTAVES = 3; // meanLuma 0..1 spans 110-880 Hz
const LEVEL = 0.5;
const GLIDE_SECONDS = 0.1;
const FADE_SECONDS = 0.05;
/** Below this meanLuma the frame is as good as black and has no centre of brightness. */
const MIN_LUMA_FOR_PAN = 0.005;

/** The pitch the test tone plays for a given meanLuma. */
export function testToneHz(meanLuma: number): number {
  const m = Math.min(1, Math.max(0, meanLuma));
  return LOW_HZ * 2 ** (OCTAVES * m);
}

/**
 * The pan the test tone uses for a frame: -1 is hard left, +1 hard right. It is
 * the luma-weighted mean column, so left on the picture is left in the sound.
 */
export function testTonePan(f: FrameFeatures): number {
  if (f.meanLuma < MIN_LUMA_FOR_PAN) return 0;
  let total = 0;
  let weighted = 0;
  for (let row = 0; row < f.rows; row++) {
    for (let col = 0; col < f.cols; col++) {
      const y = f.luma[row * f.cols + col];
      total += y;
      weighted += y * (col + 0.5);
    }
  }
  const x = weighted / total / f.cols; // 0..1 across the frame
  return Math.min(1, Math.max(-1, x * 2 - 1));
}

export function createTestTone(output: ToneAudioNode): Sonifier {
  let osc: Oscillator | null = null;
  let gain: Gain | null = null;
  let panner: Panner | null = null;
  let sounding = false;

  return {
    legend: [],

    start() {
      if (osc) return;
      panner = new Panner(0).connect(output);
      gain = new Gain(0).connect(panner);
      osc = new Oscillator(LOW_HZ, 'sine').connect(gain).start();
    },

    update(f: FrameFeatures) {
      if (!osc || !gain || !panner) return;
      const hz = testToneHz(f.meanLuma);
      const pan = testTonePan(f);
      if (sounding) {
        osc.frequency.rampTo(hz, GLIDE_SECONDS);
        panner.pan.rampTo(pan, GLIDE_SECONDS);
      } else {
        // Coming back from silence: go straight to the pitch and position, then fade in.
        osc.frequency.rampTo(hz, 0.01);
        panner.pan.rampTo(pan, 0.01);
        gain.gain.rampTo(LEVEL, FADE_SECONDS);
        sounding = true;
      }
    },

    pause() {
      if (!gain || !sounding) return;
      sounding = false;
      // immediate() skips Tone's 100 ms look-ahead, so the fade starts now.
      gain.gain.rampTo(0, FADE_SECONDS, immediate());
    },

    dispose() {
      if (!osc || !gain || !panner) return;
      const nodes = [osc, gain, panner];
      gain.gain.rampTo(0, FADE_SECONDS, immediate());
      osc = null;
      gain = null;
      panner = null;
      sounding = false;
      // Let the fade finish before the nodes go, to avoid a click.
      setTimeout(() => nodes.forEach((n) => n.dispose()), 2 * FADE_SECONDS * 1000);
    },

    describeNow(f: FrameFeatures) {
      const pan = testTonePan(f);
      const where = pan < -0.2 ? 'to the left' : pan > 0.2 ? 'to the right' : 'in the centre';
      return `A single tone near ${Math.round(testToneHz(f.meanLuma))} Hz, ${where}. Higher means a brighter picture.`;
    },
  };
}
