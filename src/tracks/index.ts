import type { TrackDef } from '../types.ts';
import { lightningTrack } from './lightning/track.ts';
import { nightlightsTrack } from './nightlights/track.ts';
import { oceanTrack } from './ocean/track.ts';

export const tracks: TrackDef[] = [lightningTrack, oceanTrack, nightlightsTrack];
