import type { TrackDef } from '../../types.ts';
import { createPlaceholderSonifier } from '../placeholderSonifier.ts';

export const oceanTrack: TrackDef = {
  id: 'ocean',
  title: 'Sea surface currents and temperature',
  media: {
    kind: 'video',
    src: `${import.meta.env.BASE_URL}media/ocean.mp4`,
    poster: `${import.meta.env.BASE_URL}media/ocean.jpg`,
  },
  credit:
    'NASA/Goddard Space Flight Center Scientific Visualization Studio — animators Greg Shirah and Horace Mitchell (NASA/GSFC) and Eric Sokolowsky (Global Science and Technology, Inc.); producer Michael Starobin (HTSI); scientists Hong Zhang (UCLA) and Dimitris Menemenlis (NASA/JPL CalTech)',
  sourceUrl: 'https://svs.gsfc.nasa.gov/3912/',
  description:
    'Ocean surface currents from the ECCO2 model, coloured by sea surface temperature across a flat world map, from March 2007 to March 2008.',
  listenFor: [
    'Slow chords stand for the temperature of the water.',
    'Warmer water is lower and fuller; colder water is higher and thinner.',
    'Movement in the currents adds a shimmer.',
  ],
  grid: { cols: 64, rows: 32 },
  // TODO(B, T3.3): blank out on-screen dates and the temperature colorbar once the clip exists.
  ignore: [],
  createSonifier: createPlaceholderSonifier,
};

export default oceanTrack;
