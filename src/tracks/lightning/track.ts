import type { Rect, TrackDef } from '../../types.ts';
import { createLightningSonifier } from './sonifier.ts';

// Three clips cut from the same SVS visualization, played by the same sonifier.
interface Part {
  id: string;
  title: string;
  file: string; // name under public/media/, without extension
  description: string;
  ignore: Rect[];
}

function lightningPart({ id, title, file, description, ignore }: Part): TrackDef {
  return {
    id,
    title,
    media: {
      kind: 'video',
      src: `${import.meta.env.BASE_URL}media/${file}.mp4`,
      poster: `${import.meta.env.BASE_URL}media/${file}.jpg`,
    },
    credit:
      "NASA's Scientific Visualization Studio — visualizers Michala Garrison (SSAI), Greg Shirah (NASA/GSFC), Kel Elkins (USRA) and Alex Kekesi (Global Science and Technology, Inc.)",
    sourceUrl: 'https://svs.gsfc.nasa.gov/5011/',
    description,
    listenFor: [
      'A short plucked note is a lightning flash.',
      'Higher pitch means the flash is farther north.',
      'Left and right in the sound match left and right in the picture.',
      'A louder note means a bigger flash.',
    ],
    grid: { cols: 64, rows: 32 },
    ignore,
    createSonifier: (output) => createLightningSonifier(output),
  };
}

/** The dial in the bottom-right corner of the later parts ("10 Day Roving Window", months and year). */
const DIAL: Rect = { x: 0.92, y: 0.78, w: 0.08, h: 0.22 };

export const lightningTrack = lightningPart({
  id: 'lightning',
  title: 'Lightning from the ISS',
  file: 'lightning',
  description:
    'Lightning strikes detected by the Lightning Imaging Sensor on the International Space Station, January 2017 to July 2023, shown as yellow flashes on a slowly turning globe, with the station\'s orbit drawn as a white line.',
  // A small static label in the bottom-right corner; the rest of the frame is clean map.
  ignore: [{ x: 0.92, y: 0.9, w: 0.08, h: 0.1 }],
});

export const lightningTrack2 = lightningPart({
  id: 'lightning-2',
  title: 'Lightning from the ISS: 2017 to 2018',
  file: 'lightning2',
  description:
    'Later in the same visualization: the globe turns slowly while time runs fast. Each yellow dot is lightning detected from the International Space Station within a ten-day window, so storms build up and fade with the seasons. This part runs from March 2017 to the middle of 2018; a dial in the bottom-right corner shows the month and year.',
  ignore: [DIAL],
});

export const lightningTrack3 = lightningPart({
  id: 'lightning-3',
  title: 'Lightning from the ISS: 2021 to 2023',
  file: 'lightning3',
  description:
    'The end of the same visualization, from late 2021 to the middle of 2023. Each yellow dot is lightning detected from the International Space Station within a ten-day window, on a slowly turning globe; a dial in the bottom-right corner shows the month and year.',
  ignore: [DIAL],
});

export default lightningTrack;
