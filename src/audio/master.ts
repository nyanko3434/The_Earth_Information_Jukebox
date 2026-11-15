// Master bus. Every sonifier connects here and nowhere else.
//   input gain -> light reverb -> duck gain -> limiter -> speakers
// Stereo throughout: anything added here must keep two channels.
import { Gain, Limiter, Reverb, dbToGain, immediate } from 'tone';
import type { ToneAudioNode } from 'tone';

/** Conservative default level; sonifiers set their own level on top of this. */
const MASTER_DB = -12;
const LIMITER_DB = -1;
const REVERB_DECAY_SECONDS = 1.8;
const REVERB_WET = 0.18;
const DUCK_SECONDS = 0.05;

let bus: Gain | null = null;
let duck: Gain | null = null;

/**
 * The node to pass to `TrackDef.createSonifier`. Built on first call, so no
 * audio node exists before the visitor presses Play.
 */
export function getMasterBus(): ToneAudioNode {
  if (!bus) {
    const limiter = new Limiter(LIMITER_DB).toDestination();
    duck = new Gain(1).connect(limiter);
    const reverb = new Reverb({ decay: REVERB_DECAY_SECONDS, wet: REVERB_WET }).connect(duck);
    bus = new Gain(dbToGain(MASTER_DB)).connect(reverb);
  }
  return bus;
}

/**
 * Mutes or restores everything after the reverb, over 50 ms. The engine calls
 * this on pause, so the reverb tail cannot outlast the picture whatever a
 * sonifier does. Does nothing before the bus exists.
 */
export function setMasterAudible(audible: boolean): void {
  duck?.gain.rampTo(audible ? 1 : 0, DUCK_SECONDS, immediate());
}
