import type { TrackDef } from '../../types.ts';
import { createNightlightsSonifier } from './sonifier.ts';

export const nightlightsTrack: TrackDef = {
  id: 'nightlights',
  title: 'Night lights 2012–2023',
  media: {
    kind: 'video',
    src: `${import.meta.env.BASE_URL}media/nightlights.mp4`,
    poster: `${import.meta.env.BASE_URL}media/nightlights.jpg`,
  },
  credit:
    "NASA's Scientific Visualization Studio — visualizer Kel Elkins (USRA); scientists Zhuosen Wang (University of Maryland), Miguel Román (Leidos), Ranjay Shrestha (SSAI), Srija Chakraborty (USRA) and Virginia Kalb (NASA)",
  sourceUrl: 'https://svs.gsfc.nasa.gov/5313/',
  description:
    'Annual averages of Earth’s night lights from 2012 to 2023 on a flat world map, followed by a change map where purple marks regions that gained light and orange marks regions that lost it, with zoomed views of India, Ukraine, Western Europe and the Eastern Mediterranean.',
  listenFor: [
    'A pattern of notes gets denser and faster as the map gets brighter.',
    'A rising tone marks a region that gained light; a falling tone marks one that lost it.',
    'Zoomed views of India, Ukraine, Western Europe and the Eastern Mediterranean get their own short phrases.',
  ],
  // 96x27 keeps the source's 32:9 aspect (the max canvas is 96x48), so analysis is not squished.
  grid: { cols: 96, rows: 27 },
  // The bottom ~12% is a static grey band with no map content; blank it so it cannot drive notes.
  ignore: [{ x: 0, y: 0.88, w: 1, h: 0.12 }],
  createSonifier: (output) => createNightlightsSonifier(output),
};

export default nightlightsTrack;
