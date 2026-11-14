// Master bus. Every sonifier connects here and nowhere else.
// Step 1: gain -> limiter -> speakers. Step 2 adds a light reverb before the limiter.
import { Gain, Limiter, dbToGain } from 'tone';
import type { ToneAudioNode } from 'tone';

/** Conservative default level; sonifiers set their own level on top of this. */
const MASTER_DB = -12;
const LIMITER_DB = -1;

let bus: Gain | null = null;

/**
 * The node to pass to `TrackDef.createSonifier`. Built on first call, so
 * nothing touches the audio context before the visitor presses Play.
 */
export function getMasterBus(): ToneAudioNode {
  if (!bus) {
    const limiter = new Limiter(LIMITER_DB).toDestination();
    bus = new Gain(dbToGain(MASTER_DB)).connect(limiter);
  }
  return bus;
}
