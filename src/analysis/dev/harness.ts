// Dev-only harness (see harness.html). Drives the pipeline through createEngine,
// the same call the UI shell makes, and draws what the Analyser reports.
import { createEngine } from '../../audio/engine.ts';
import type { Engine } from '../../audio/engine.ts';
import { createTestTone, testToneHz, testTonePan } from '../../audio/testTone.ts';
import { createLightningSonifier } from '../../tracks/lightning/sonifier.ts';
import type { LightningNote } from '../../tracks/lightning/sonifier.ts';
import type { FrameFeatures, Sonifier } from '../../types.ts';

declare global {
  interface Window {
    /** Every lightning note since the sonifier was last chosen. For checks from the console. */
    harnessNotes: LightningNote[];
  }
}

const GRID = { cols: 64, rows: 32 };

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`harness: #${id} is missing`);
  return el as T;
}

const params = new URLSearchParams(location.search);
const video = byId<HTMLVideoElement>('video');
const message = byId('message');
const sonifierSelect = byId<HTMLSelectElement>('sonifier');
const out = {
  time: byId('time'),
  meanLuma: byId('meanLuma'),
  motion: byId('motion'),
  rate: byId('rate'),
  tone: byId('tone'),
  pan: byId('pan'),
  noteRate: byId('noteRate'),
  lastNote: byId('lastNote'),
  describe: byId('describe'),
};

// ---- Views of what the Analyser reports ----
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

// ---- Readouts ----
// Counts over the last second. Frame gaps alternate between about 33 and 67 ms
// on a 30 fps clip, so a count is the honest figure; averaging 1/gap reads high.
const recentFrames: number[] = [];
const recentNotes: number[] = [];
let sonifier: Sonifier | null = null;
window.harnessNotes = [];

function countRecent(times: number[], now: number): number {
  while (times.length > 0 && times[0] < now - 1000) times.shift();
  return times.length;
}

function onNote(note: LightningNote) {
  window.harnessNotes.push(note);
  recentNotes.push(performance.now());
  out.lastNote.textContent = `${note.hz.toFixed(0)} Hz, pan ${note.pan.toFixed(2)}, loudness ${note.velocity.toFixed(2)}`;
}

function onFeatures(f: FrameFeatures) {
  const now = performance.now();
  recentFrames.push(now);
  const isTone = sonifierSelect.value === 'tone';

  out.time.textContent = `${f.time.toFixed(2)} s`;
  out.meanLuma.textContent = f.meanLuma.toFixed(3);
  out.motion.textContent = f.motion.toFixed(4);
  out.rate.textContent = `${countRecent(recentFrames, now)} Hz`;
  out.tone.textContent = isTone ? `${testToneHz(f.meanLuma).toFixed(0)} Hz` : '-';
  out.pan.textContent = isTone ? `${testTonePan(f).toFixed(2)} (-1 left, +1 right)` : '-';
  out.noteRate.textContent = isTone ? '-' : String(countRecent(recentNotes, now));
  out.describe.textContent = sonifier?.describeNow?.(f) ?? '-';
  for (const draw of views) draw(f);
}

// ---- The part the UI shell will repeat ----
let engine: Engine | null = null;

/** A new engine for the chosen sonifier, as the shell does on a track change. */
function buildEngine() {
  engine?.dispose();
  sonifier = null;
  recentNotes.length = 0;
  window.harnessNotes = [];
  out.lastNote.textContent = '-';
  const kind = sonifierSelect.value;
  engine = createEngine({
    video,
    track: {
      grid: GRID,
      createSonifier: (output) => {
        sonifier = kind === 'lightning' ? createLightningSonifier(output, { onNote }) : createTestTone(output);
        return sonifier;
      },
    },
  });
  engine.onFeatures(onFeatures);
}

function play() {
  engine?.play().catch((err: unknown) => {
    message.textContent = `Play failed: ${String(err)}`;
  });
}

byId('play').addEventListener('click', play);
byId('pause').addEventListener('click', () => engine?.pause());
sonifierSelect.addEventListener('change', () => {
  const wasPlaying = !video.paused && !video.ended;
  buildEngine();
  // The video's play event will not fire again, so the new engine is started by hand.
  if (wasPlaying) play();
});
if (params.get('sonifier') === 'lightning') sonifierSelect.value = 'lightning';
buildEngine();
// -------------------------------------------

// ---- Clip loading ----
let objectUrl = '';
video.addEventListener('error', () => {
  message.textContent =
    'No clip loaded. Run `bash src/analysis/dev/make-clips.sh`, or load a clip with the file picker.';
});
video.addEventListener('loadeddata', () => {
  message.textContent = '';
});
byId<HTMLInputElement>('file').addEventListener('change', (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  engine?.pause();
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file); // a blob: URL is same-origin, so pixels can be read
  video.src = objectUrl;
});
byId<HTMLInputElement>('loop').addEventListener('change', (event) => {
  video.loop = (event.target as HTMLInputElement).checked;
});
// A bare file name is resolved against this page, so it is a clip in this folder.
const clip = params.get('clip') ?? '';
video.src = /^[\w.-]+\.mp4$/.test(clip) ? clip : 'standin.mp4';
