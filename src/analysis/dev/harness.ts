// Dev-only harness (see harness.html). Drives the pipeline through createEngine,
// the same call the UI shell makes, and draws what the Analyser reports.
import { createEngine } from '../../audio/engine.ts';
import { createTestTone, testToneHz, testTonePan } from '../../audio/testTone.ts';
import type { FrameFeatures } from '../../types.ts';

const GRID = { cols: 64, rows: 32 };

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`harness: #${id} is missing`);
  return el as T;
}

const video = byId<HTMLVideoElement>('video');
const message = byId('message');
const out = {
  time: byId('time'),
  meanLuma: byId('meanLuma'),
  motion: byId('motion'),
  rate: byId('rate'),
  tone: byId('tone'),
  pan: byId('pan'),
};

// ---- The part the UI shell will repeat ----
const engine = createEngine({
  video,
  track: { grid: GRID, createSonifier: (output) => createTestTone(output) },
});
byId('play').addEventListener('click', () => {
  engine.play().catch((err: unknown) => {
    message.textContent = `Play failed: ${String(err)}`;
  });
});
byId('pause').addEventListener('click', () => engine.pause());
// -------------------------------------------

type CellColour = (f: FrameFeatures, cell: number) => [number, number, number];

function makeView(id: string, colour: CellColour): (f: FrameFeatures) => void {
  const canvas = byId<HTMLCanvasElement>(id);
  canvas.width = GRID.cols;
  canvas.height = GRID.rows;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(GRID.cols, GRID.rows);
  return (f) => {
    for (let cell = 0; cell < f.cols * f.rows; cell++) {
      const [r, g, b] = colour(f, cell);
      image.data[cell * 4] = r;
      image.data[cell * 4 + 1] = g;
      image.data[cell * 4 + 2] = b;
      image.data[cell * 4 + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
  };
}

/** HSV with value 1, so the colour view shows hue and sat without luma. */
function hueSatToRgb(hue: number, sat: number): [number, number, number] {
  const channel = (n: number) => {
    const k = (n + hue / 60) % 6;
    return 255 * (1 - sat * Math.max(0, Math.min(k, 4 - k, 1)));
  };
  return [channel(5), channel(3), channel(1)];
}

const views = [
  makeView('viewLuma', (f, c) => [f.luma[c] * 255, f.luma[c] * 255, f.luma[c] * 255]),
  makeView('viewColour', (f, c) => hueSatToRgb(f.hue[c], f.sat[c])),
  makeView('viewDelta', (f, c) => {
    const d = Math.min(255, Math.abs(f.deltaLuma[c]) * 4 * 255);
    return [d, d, d];
  }),
];

// Frames analysed in the last second. Gaps alternate between about 33 and 67 ms
// on a 30 fps clip, so a count is the honest figure; averaging 1/gap reads high.
const recentFrames: number[] = [];
engine.onFeatures((f) => {
  const now = performance.now();
  recentFrames.push(now);
  while (recentFrames[0] < now - 1000) recentFrames.shift();

  out.time.textContent = `${f.time.toFixed(2)} s`;
  out.meanLuma.textContent = f.meanLuma.toFixed(3);
  out.motion.textContent = f.motion.toFixed(4);
  out.rate.textContent = `${recentFrames.length} Hz`;
  out.tone.textContent = `${testToneHz(f.meanLuma).toFixed(0)} Hz`;
  out.pan.textContent = `${testTonePan(f).toFixed(2)} (-1 left, +1 right)`;
  for (const draw of views) draw(f);
});

// ---- Clip loading ----
let objectUrl = '';
video.addEventListener('error', () => {
  message.textContent =
    'No clip loaded. Generate standin.mp4 (command at the top of harness.html) or load a clip with the file picker.';
});
video.addEventListener('loadeddata', () => {
  message.textContent = '';
});
byId<HTMLInputElement>('file').addEventListener('change', (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  engine.pause();
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file); // a blob: URL is same-origin, so pixels can be read
  video.src = objectUrl;
});
byId<HTMLInputElement>('loop').addEventListener('change', (event) => {
  video.loop = (event.target as HTMLInputElement).checked;
});
video.src = 'standin.mp4'; // resolved against this page, so it is this folder
