// Step 1 test tone: one sine whose pitch follows meanLuma. A diagnostic, not a
// track. Its pitch is continuous on purpose (not quantised to a scale), so that
// small changes in brightness stay audible; real sonifiers quantise.
import { Gain, Oscillator, immediate } from 'tone';
import type { ToneAudioNode } from 'tone';
import type { FrameFeatures, Sonifier } from '../types.ts';

const LOW_HZ = 110;
const OCTAVES = 3; // meanLuma 0..1 spans 110-880 Hz
const LEVEL = 0.5;
const GLIDE_SECONDS = 0.1;
const FADE_SECONDS = 0.05;

/** The pitch the test tone plays for a given meanLuma. */
export function testToneHz(meanLuma: number): number {
  const m = Math.min(1, Math.max(0, meanLuma));
  return LOW_HZ * 2 ** (OCTAVES * m);
}

export function createTestTone(output: ToneAudioNode): Sonifier {
  let osc: Oscillator | null = null;
  let gain: Gain | null = null;
  let sounding = false;

  return {
    legend: [],

    start() {
      if (osc) return;
      gain = new Gain(0).connect(output);
      osc = new Oscillator(LOW_HZ, 'sine').connect(gain).start();
    },

    update(f: FrameFeatures) {
      if (!osc || !gain) return;
      const hz = testToneHz(f.meanLuma);
      if (sounding) {
        osc.frequency.rampTo(hz, GLIDE_SECONDS);
      } else {
        // Coming back from silence: go straight to the pitch, then fade in.
        osc.frequency.rampTo(hz, 0.01);
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
      if (!osc || !gain) return;
      const nodes = [osc, gain];
      gain.gain.rampTo(0, FADE_SECONDS, immediate());
      osc = null;
      gain = null;
      sounding = false;
      // Let the fade finish before the nodes go, to avoid a click.
      setTimeout(() => nodes.forEach((n) => n.dispose()), 2 * FADE_SECONDS * 1000);
    },

    describeNow(f: FrameFeatures) {
      return `A single tone near ${Math.round(testToneHz(f.meanLuma))} Hz. Higher means a brighter picture.`;
    },
  };
}
