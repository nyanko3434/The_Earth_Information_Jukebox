import type { TrackDef } from '../types.ts';
import { lightningTrack, lightningTrack2, lightningTrack3 } from './lightning/track.ts';
import { nightlightsTrack } from './nightlights/track.ts';
import { oceanTrack } from './ocean/track.ts';

export const tracks: TrackDef[] = [
  lightningTrack,
  lightningTrack2,
  lightningTrack3,
  oceanTrack,
  nightlightsTrack,
];
