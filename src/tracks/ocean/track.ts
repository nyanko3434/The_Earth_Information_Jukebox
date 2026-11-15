import type { TrackDef } from '../../types.ts';
import { createOceanSonifier } from './sonifier.ts';

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
    'West of the map is in your left ear; east is in your right.',
    'Movement in the currents adds a shimmer.',
  ],
  grid: { cols: 64, rows: 32 },
  // The temperature colorbar and its labels occupy the bottom ~16% of the frame, and are static.
  ignore: [{ x: 0, y: 0.84, w: 1, h: 0.16 }],
  createSonifier: (output) => createOceanSonifier(output),
};

export default oceanTrack;
