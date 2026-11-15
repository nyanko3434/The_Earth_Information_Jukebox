# Earth Jukebox: Architecture

The technical contract for both teammates and for Claude Code sessions. Read VISION.md first. Change the shared types in this file only by agreement between both teammates.

## Stack

| Concern | Choice | Note |
|---|---|---|
| App | React + Vite + TypeScript | TypeScript is here so the shared interfaces below are enforced. Switch to plain JS only if both agree. |
| Tooling | npm, Node 26, oxlint | oxlint is the linter the Vite template now ships with. No test runner. |
| Audio | Tone.js (Web Audio API) | Synths, effects, scheduling |
| Frame analysis | `<video>` or `<img>` drawn to a small hidden `<canvas>`, read with `getImageData` | No computer-vision library needed |
| Media prep | ffmpeg, run once on a laptop | Not part of the app |
| Hosting | GitHub Pages (static) | No backend |

## Data flow

```
media (video or still)        chosen by the visitor
        |
        v
FrameSource                   draws the current frame to a tiny canvas (~64x32)
        |
        v
Analyser                      canvas pixels -> FrameFeatures, ~20 times per second
        |
        v
Sonifier (one per track)      FrameFeatures -> Tone.js notes and parameters
        |
        v
Master bus                    reverb -> limiter -> speakers
```

The UI reads the same `FrameFeatures` to update the "what you're hearing" panel.

## Folder layout

```
.github/workflows/       deploy.yml (build and deploy to GitHub Pages)
public/media/            self-hosted clips, posters, colorbars
src/
  types.ts               shared interfaces (below)
  analysis/
    frameSource.ts       video -> small canvas -> pixels, at about 20 Hz
    analyser.ts          pixels -> FrameFeatures
    helpers.ts           derived values (findFlashes so far)
    dev/                 dev-only harness page and test-clip script; never built or deployed
  audio/
    engine.ts            createEngine(): the one call the UI makes (see "Engine API")
    master.ts            master bus: gain -> reverb -> duck -> limiter
    testTone.ts          Step 1 test tone (a Sonifier)
    scales.ts            pitch quantising (pentatonic by default)
  tracks/
    index.ts             list of TrackDef
    lightning/           track.ts (metadata) + sonifier.ts
    ocean/
    nightlights/
    aerosols/            stretch
  components/            Jukebox, TrackList, Player, Legend, NowHearing
  a11y/                  live-region announcer, keyboard shortcuts
docs/                    these planning files
```

## Shared interfaces (`src/types.ts`)

```ts
export type MediaDef =
  | { kind: 'video'; src: string; poster: string }
  | { kind: 'image'; src: string; scanSeconds: number }; // playhead sweeps left to right

export interface Rect { x: number; y: number; w: number; h: number } // all 0..1

export interface FrameFeatures {
  time: number;             // seconds into the track
  cols: number;
  rows: number;
  luma: Float32Array;       // per cell, 0..1, row-major, row 0 = top
  hue: Float32Array;        // per cell, 0..360
  sat: Float32Array;        // per cell, 0..1
  deltaLuma: Float32Array;  // per cell, change since previous frame (signed)
  meanLuma: number;         // 0..1
  motion: number;           // mean absolute deltaLuma, 0..1
  scanX?: number;           // 0..1, only for still images
}

export interface LegendItem {
  id: string;
  label: string;            // "Lightning in the far north"
  play(): void;             // plays that sound once
}

export interface Sonifier {
  start(): void;                   // build and connect nodes; called after the audio context is unlocked
  update(f: FrameFeatures): void;  // called for every analysed frame
  pause(): void;                   // release everything quickly
  dispose(): void;
  legend: LegendItem[];
  describeNow?(f: FrameFeatures): string; // one short sentence for the NowHearing panel
}

export interface TrackDef {
  id: string;
  title: string;
  media: MediaDef;
  credit: string;            // credit line as given on the SVS page
  sourceUrl: string;         // SVS page URL
  description: string;       // plain language, what the visualization shows
  listenFor: string[];       // 2-4 bullets on how to read the sound
  grid: { cols: number; rows: number };
  ignore?: Rect[];           // overlays to blank out before analysis (dates, colorbars, captions)
  createSonifier(output: ToneAudioNode): Sonifier; // import type { ToneAudioNode } from 'tone'
}
```

Derived values live in `src/analysis/helpers.ts`, not in `FrameFeatures`, so the core type stays small:

- `findFlashes(f, threshold)` returns cells whose luma jumped, with x, y and strength. One result per blob (a cell counts only if no neighbour rose more), strongest first; falling luma is ignored. `strength` is the total rise over the cell and its eight neighbours. (Written.)
- The four below are not written yet; each arrives with the first track that needs it.
- `regionMean(f, rect, channel)` returns the mean of a channel over a region.
- `colourCoverage(f, classes)` returns, per colour class, the fraction of cells and their centroid.
- `column(f, x)` returns the cells in one column (used for still-image sweeps).
- `hueToValue(hue, colorbar)` maps a colour back to an approximate data value using the page's colorbar.

## Engine API (`src/audio/engine.ts`)

The UI never touches FrameSource, Analyser, the master bus or Tone directly. It makes one call per track:

```ts
export interface Engine {
  play(): Promise<void>;  // call inside the Play click: unlocks audio, starts the sonifier, plays the video
  pause(): void;          // pauses the video; sound is silent within 200 ms
  onFeatures(cb: (f: FrameFeatures) => void): () => void; // every analysed frame; returns unsubscribe
  dispose(): void;        // on track change or unmount
}

export function createEngine(opts: {
  video: HTMLVideoElement;
  track: Pick<TrackDef, 'grid' | 'ignore' | 'createSonifier'>;
}): Engine;
```

In the shell:

```tsx
const engine = createEngine({ video: videoRef.current, track }); // in an effect; the cleanup calls engine.dispose()
<button onClick={() => engine.play()}>Play</button>
<button onClick={() => engine.pause()}>Pause</button>
```

The lightning track uses `createSonifier: (output) => createLightningSonifier(output)`, from `src/tracks/lightning/sonifier.ts`. A track with no sonifier yet can use the test tone: `createSonifier: (output) => createTestTone(output)`, from `src/audio/testTone.ts`. The test tone is one sine: pitch follows `meanLuma`, and stereo position follows the horizontal centre of brightness, so something bright on the left of the picture is heard on the left.

- The video element is the source of truth for play state. The engine keeps no `isPlaying`; read `video.paused` and the `play`, `pause` and `ended` events for button labels and the live region.
- Sound follows the picture, not the button. The engine silences on the video's own `pause` and `ended` events, so native controls and the end of the clip behave. With no analysed frame for 250 ms (buffering, hidden tab) it also silences, and resumes with the next frame.
- The engine, not the sonifier, guarantees the pause rule: on every pause it mutes the master bus after the reverb (`setMasterAudible` in `master.ts`) and reopens it on the next analysed frame. A sonifier's own `pause()` still has to stop its notes, but a reverb tail or a slow release cannot leak.
- One engine per track. On a track change, dispose the old engine and create a new one. If the video is already playing at that moment, call `play()` on the new engine, because the video's `play` event will not fire again.
- `onFeatures` fires only while the video is playing, including when audio has not been unlocked.
- No audio node is built before the first `play()`. Chrome still logs "The AudioContext was not allowed to start" at page load, because importing Tone creates its suspended context; that is expected, and `play()` resumes it.
- Video only for now. Still images (`scanX`) are added to the same function if Track 4 is built.

### Dev harness

`src/analysis/dev/harness.html` runs the pipeline through `createEngine` without the UI shell, and shows the features the Analyser reports, the notes the lightning sonifier plays, and each sonifier's `describeNow` sentence. A select switches between the test tone and the lightning sonifier. With `npm run dev` it is at <http://localhost:5173/The_Earth_Information_Jukebox/src/analysis/dev/harness.html>. It is not linked from `index.html`, so it is left out of the build. Every `.mp4` in `src/analysis/dev/` is git-ignored. `bash src/analysis/dev/make-clips.sh` generates two synthetic ffmpeg test clips there, and its header says what each contains and should sound like: `standin.mp4` (brightness sweep, moving square, colour bars; for the test tone) and `flashes.mp4` (flashes at known places and times on a static map; for the lightning sonifier). The page loads `standin.mp4` unless the URL says otherwise: `?clip=flashes.mp4&sonifier=lightning`. A local cut of real footage can be kept in the same folder and loaded with `?clip=`, or any file can be loaded with the page's file picker.

## Analysis rules

- The analysis canvas is the track's `grid` multiplied by the largest whole number that keeps it within 96x48 (a 64x32 grid gives a 64x32 canvas; 32x16 gives 96x48). The Analyser averages each block of pixels into one cell. A grid larger than 96x48 is an error.
- `hue` and `sat` are HSV, computed from the averaged RGB of the cell. `luma` uses Rec. 709 weights.
- The first frame, and the first frame after a seek or loop, has `deltaLuma` all zero, so a jump in time is not read as a flash.
- Draw frames to a canvas no larger than 96x48. Create the 2D context with `willReadFrequently: true`.
- Use `requestVideoFrameCallback` where available, `requestAnimationFrame` otherwise. Throttle analysis to about 20 Hz.
- Blank out `ignore` rectangles before computing features, or on-screen dates and colorbars will be turned into sound. Blanked cells are black: luma 0, and they count as black in `meanLuma`.
- Media must be served from our own origin. Reading pixels from a cross-origin video fails in the browser.
- For still images, `scanX` advances from 0 to 1 over `scanSeconds`, and the UI draws a vertical line at that position.

## Audio rules

- Start audio only from a user gesture (`await Tone.start()` in the Play handler). Browsers block it otherwise.
- Quantise every pitch to a scale (default: pentatonic). Helpers live in `src/audio/scales.ts`.
- Smooth continuous values before they reach a synth parameter (exponential moving average, or `rampTo` over 100–300 ms).
- Cap triggered notes at about 12 per second per track. The lightning sonifier does it with a token bucket (10 per second plus 2 saved up, so no one-second span exceeds 12) and spends tokens on the strongest flashes first.
- Everything goes through one master bus: light reverb, then a limiter. Default volume is conservative. (`src/audio/master.ts`: gain at -12 dB, reverb with a 1.8 s decay at 18 % wet, a duck gain the engine closes on pause, then a limiter at -1 dB.) The bus is stereo throughout: a source panned with a Tone `Panner` before the bus comes out panned at the speakers (measured on 2026-11-14). Anything added to the bus must keep two channels.
- Map longitude to stereo pan and latitude to pitch where the frame is a flat world map, so position means the same thing in every track.
- `pause()` must silence within 200 ms. No sound may continue while the picture is paused.
- Sonifier lifecycle (proposed by A on 2026-11-14, awaiting B's agreement; no change to the types): `start()` is called once per sonifier; `pause()` silences but keeps the nodes; the next `update()` resumes the sound. The engine relies on this.
- Schedule the silencing ramp in `pause()` at `Tone.immediate()`, not the default `Tone.now()`, which is 100 ms later.
- The Step 1 test tone is the one exception to scale quantising: it is a diagnostic, and its pitch is continuous so that small brightness changes stay audible.

## Media preparation

Run once per track, on a laptop. Check what the downloaded file looks like before choosing the crop.

```bash
# 45-second clip, 1280 px wide, H.264, no audio track, web-optimised
ffmpeg -ss 00:00:05 -t 45 -i input.mp4 \
  -vf "scale=1280:-2" -an -c:v libx264 -crf 26 -preset slow \
  -pix_fmt yuv420p -movflags +faststart public/media/lightning.mp4

# poster frame
ffmpeg -ss 00:00:10 -i public/media/lightning.mp4 -frames:v 1 public/media/lightning.jpg
```

- Target under 10 MB per clip.
- Always transcode to H.264. Some sources are H.265, which many browsers will not play.
- Prefer a flat world map version of each visualization over a rotating globe, so longitude and latitude map cleanly to pan and pitch.
- The night lights EIC file is 7680x2160 (very wide). Crop or scale it; decide after viewing it.
- Record the source URL and credit line of every file in the track's `track.ts`.

## Accessibility requirements

These apply to every component from the first commit.

- Semantic HTML: real `<button>`, `<ul>`, headings, one `<main>`.
- Every control has an accessible name. The video has a text alternative (the track description).
- Keyboard: Tab reaches everything, Space toggles play, Left/Right change track, visible focus ring.
- One `aria-live="polite"` region announces track changes and play state. Do not announce every frame.
- The audio legend is a list of buttons, each of which plays one sound and names what it means.
- Text contrast meets WCAG AA. Respect `prefers-reduced-motion`.
- Nothing depends on colour alone.

## AI-use attribution

Space Apps requires AI-generated code to be acknowledged in descriptive text and metadata.

- The README has a "Use of AI tools" section saying what Claude was used for.
- Keep the `Co-Authored-By: Claude` trailer on commits made with Claude Code.
- The app's About section states that the sound is synthesised by our own rules at run time and is not produced by a generative AI model.
- Do not use the NASA logo or other NASA branding anywhere in the app, repo or demo.

## Deployment

- GitHub Pages via a GitHub Actions workflow (`.github/workflows/deploy.yml`) on push to `main`. It can also be run by hand from the Actions tab.
- The repo's Pages source must be set to "GitHub Actions" (Settings → Pages), or the deploy job fails.
- `base` in `vite.config.ts` is `'/The_Earth_Information_Jukebox/'`. Build media URLs from `import.meta.env.BASE_URL`.
- Public URL: <https://nyanko3434.github.io/The_Earth_Information_Jukebox/>
- Deploy a placeholder page in the first hour so the public link exists from the start.
