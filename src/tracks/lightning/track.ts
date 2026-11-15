import type { TrackDef } from '../../types.ts';
import { createLightningSonifier } from './sonifier.ts';

export const lightningTrack: TrackDef = {
  id: 'lightning',
  title: 'Lightning from the ISS',
  media: {
    kind: 'video',
    src: `${import.meta.env.BASE_URL}media/lightning.mp4`,
    poster: `${import.meta.env.BASE_URL}media/lightning.jpg`,
  },
  credit:
    "NASA's Scientific Visualization Studio — visualizers Michala Garrison (SSAI), Greg Shirah (NASA/GSFC), Kel Elkins (USRA) and Alex Kekesi (Global Science and Technology, Inc.)",
  sourceUrl: 'https://svs.gsfc.nasa.gov/5011/',
  description:
    'Lightning strikes detected by the Lightning Imaging Sensor on the International Space Station, January 2017 to July 2023, accumulated over a rolling 10-day window and shown as flashes on a world map.',
  listenFor: [
    'A short plucked note is a lightning flash.',
    'Higher pitch means the flash is farther north.',
    'Left and right in the sound match east and west on the map.',
    'A louder note means a bigger flash.',
  ],
  grid: { cols: 64, rows: 32 },
  // A small static label in the bottom-right corner; the rest of the frame is clean map.
  ignore: [{ x: 0.92, y: 0.9, w: 0.08, h: 0.1 }],
  createSonifier: (output) => createLightningSonifier(output),
};

export default lightningTrack;
