// Dev-only harness (see harness.html). Drives the pipeline through createEngine,
// the same call the UI shell makes, and draws what the Analyser reports.
import { Analyser as LevelAnalyser, Split, getDestination } from 'tone';
import { createEngine } from '../../audio/engine.ts';
import type { Engine } from '../../audio/engine.ts';
import { createTestTone, testToneHz, testTonePan } from '../../audio/testTone.ts';
import { createLightningSonifier } from '../../tracks/lightning/sonifier.ts';
import type { LightningNote } from '../../tracks/lightning/sonifier.ts';
import { createOceanSonifier } from '../../tracks/ocean/sonifier.ts';
import type { OceanUpdate } from '../../tracks/ocean/sonifier.ts';
import { oceanTrack } from '../../tracks/ocean/track.ts';
import type { FrameFeatures, Rect, Sonifier } from '../../types.ts';

declare global {
  interface Window {
    /** Every lightning note since the sonifier was last chosen. For checks from the console. */
    harnessNotes: LightningNote[];
    /** The ocean sonifier's latest frame, and every frame that struck its chord, since it was last chosen. */
    harnessOcean: { last: OceanUpdate | null; strikes: OceanUpdate[] };
    /** RMS at the speakers, [left, right], over the last `samples` samples (2048, about 46 ms, at most). Zeros before the first Play button press. */
    harnessLevels: (samples?: number) => [number, number];
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
  level: byId('level'),
  voices: byId('voices'),
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
window.harnessOcean = { last: null, strikes: [] };

function countRecent(times: number[], now: number): number {
  while (times.length > 0 && times[0] < now - 1000) times.shift();
  return times.length;
}

function onNote(note: LightningNote) {
  window.harnessNotes.push(note);
  recentNotes.push(performance.now());
  out.lastNote.textContent = `${note.hz.toFixed(0)} Hz, pan ${note.pan.toFixed(2)}, loudness ${note.velocity.toFixed(2)}`;
}

function onOcean(update: OceanUpdate) {
  window.harnessOcean.last = update;
  if (update.struck) {
    window.harnessOcean.strikes.push(update);
    // A strike is one note from every voice that has water to play.
    const at = performance.now();
    for (const v of update.voices) if (v.level > 0) recentNotes.push(at);
    out.lastNote.textContent = `chord at ${update.time.toFixed(1)} s: ${update.voices.map((v) => v.hz.toFixed(0)).join(', ')} Hz`;
  }
  out.voices.textContent = [
    'region         warmth  water  movement/s  note Hz    pan  level  shimmer',
    ...update.voices.map((v) =>
      [
        v.id.padEnd(13),
        v.warmth.toFixed(2).padStart(7),
        v.coverage.toFixed(2).padStart(6),
        v.motion.toFixed(3).padStart(11),
        v.hz.toFixed(0).padStart(8),
        v.pan.toFixed(1).padStart(6),
        v.level.toFixed(2).padStart(6),
        v.shimmer.toFixed(3).padStart(8),
      ].join(' '),
    ),
  ].join('\n');
}

// ---- Output level, measured at the speakers (after the master bus) ----
let meters: LevelAnalyser[] | null = null;

/** Built on the first Play button press, so no audio node exists before a gesture. */
function buildMeters() {
  if (meters) return;
  const split = new Split(2);
  getDestination().connect(split);
  meters = [0, 1].map((channel) => {
    const meter = new LevelAnalyser('waveform', 2048);
    split.connect(meter, channel);
    return meter;
  });
}

window.harnessLevels = (samples = 2048) => {
  const rms = (meter: LevelAnalyser) => {
    const wave = (meter.getValue() as Float32Array).slice(-samples);
    let sum = 0;
    for (const x of wave) sum += x * x;
    return Math.sqrt(sum / wave.length);
  };
  return meters ? [rms(meters[0]), rms(meters[1])] : [0, 0];
};

function onFeatures(f: FrameFeatures) {
  const now = performance.now();
  recentFrames.push(now);
  const isTone = sonifierSelect.value === 'tone';
  const [left, right] = window.harnessLevels();

  out.time.textContent = `${f.time.toFixed(2)} s`;
  out.meanLuma.textContent = f.meanLuma.toFixed(3);
  out.motion.textContent = f.motion.toFixed(4);
  out.rate.textContent = `${countRecent(recentFrames, now)} Hz`;
  out.tone.textContent = isTone ? `${testToneHz(f.meanLuma).toFixed(0)} Hz` : '-';
  out.pan.textContent = isTone ? `${testTonePan(f).toFixed(2)} (-1 left, +1 right)` : '-';
  out.noteRate.textContent = isTone ? '-' : String(countRecent(recentNotes, now));
  out.describe.textContent = sonifier?.describeNow?.(f) ?? '-';
  out.level.textContent = `left ${left.toFixed(3)}, right ${right.toFixed(3)}`;
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
  window.harnessOcean = { last: null, strikes: [] };
  out.lastNote.textContent = '-';
  out.voices.textContent = '-';
  const kind = sonifierSelect.value;
  // The ocean sonifier is run with the ocean track's own ignore rectangles
  // (B's track.ts), so the harness blanks what the site will blank.
  const ignore: Rect[] = kind === 'ocean' ? (oceanTrack.ignore ?? []) : [];
  engine = createEngine({
    video,
    track: {
      grid: GRID,
      ignore,
      createSonifier: (output) => {
        if (kind === 'lightning') sonifier = createLightningSonifier(output, { onNote });
        else if (kind === 'ocean') sonifier = createOceanSonifier(output, { onUpdate: onOcean });
        else sonifier = createTestTone(output);
        return sonifier;
      },
    },
  });
  engine.onFeatures(onFeatures);
}

function play() {
  buildMeters();
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
const wanted = params.get('sonifier');
if (wanted === 'lightning' || wanted === 'ocean') sonifierSelect.value = wanted;
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
// `media/<name>.mp4` is a deployed clip in public/media/.
const clip = params.get('clip') ?? '';
if (/^media\/[\w.-]+\.mp4$/.test(clip)) video.src = `${import.meta.env.BASE_URL}${clip}`;
else video.src = /^[\w.-]+\.mp4$/.test(clip) ? clip : 'standin.mp4';
