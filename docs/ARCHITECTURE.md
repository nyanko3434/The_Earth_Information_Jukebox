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
    helpers.ts           derived values (findFlashes, hueToValue, regionValue)
    dev/                 dev-only harness page and test-clip script; never built or deployed
  audio/
    engine.ts            createEngine(): the one call the UI makes (see "Engine API")
    master.ts            master bus: gain -> reverb -> duck -> limiter
    testTone.ts          Step 1 test tone (a Sonifier)
    scales.ts            pitch quantising (pentatonic by default)
  tracks/
    index.ts             list of TrackDef
    lightning/           track.ts (metadata for three clips of SVS 5011) + sonifier.ts
    ocean/
    nightlights/
    aerosols/            stretch
  components/            Jukebox, TrackList, Player, Legend, NowHearing, RegionPicker (+ regions.ts, its presets), About
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
- `findRises(delta, cols, rows, threshold)` is the same search on any per-cell change. The lightning sonifier uses it on the rise of each cell's yellow, because on its clip the white orbit line and clouds brighten cells far more than a lightning dot does. (Written.)
- `hueToValue(hue, colorbar)` maps a colour back to an approximate data value using the page's colorbar. The colorbar is a list of `{ hue, value }` stops in order along the bar; a bar that crosses red continues past 0 or 360 instead of wrapping. (Written.)
- `regionValue(f, rect, colorbar, mask)` returns, for the coloured cells of a rectangle (saturation and luma above the mask's minimums, so not land, captions or blanked cells): `value`, the mean colorbar value; `coverage`, the fraction of the rectangle that is coloured; and `motion`, the mean absolute `deltaLuma` per analysed frame. It replaces the planned `regionMean`, because a plain mean of hue is wrong (hue is circular). (Written.)
- The two below are not written yet; each arrives with the first track that needs it.
- `colourCoverage(f, classes)` returns, per colour class, the fraction of cells and their centroid.
- `column(f, x)` returns the cells in one column (used for still-image sweeps).

## Engine API (`src/audio/engine.ts`)

The UI never touches FrameSource, Analyser, the master bus or Tone directly. It makes one call per track:

```ts
export interface Engine {
  play(): Promise<void>;  // call inside the Play click: unlocks audio, starts the sonifier, plays the video
  pause(): void;          // pauses the video; sound is silent within 200 ms
  onFeatures(cb: (f: FrameFeatures) => void): () => void; // every analysed frame; returns unsubscribe
  describeNow(f: FrameFeatures): string | undefined; // one sentence on what that frame sounds like (see below)
  setRegion(region: Rect | null): void; // listen to one rectangle of the picture; null is the whole picture (see below)
  dispose(): void;        // on track change or unmount
  readonly legend: LegendItem[]; // the track's audio legend; can be listed before Play (see "Legend")
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
<ul>{engine.legend.map((item) => (
  <li key={item.id}><button type="button" onClick={() => item.play()}>{item.label}</button></li>
))}</ul>
```

The lightning track uses `createSonifier: (output) => createLightningSonifier(output)`, from `src/tracks/lightning/sonifier.ts`; the ocean track uses `createSonifier: (output) => createOceanSonifier(output)`, from `src/tracks/ocean/sonifier.ts`. A track with no sonifier yet can use the test tone: `createSonifier: (output) => createTestTone(output)`, from `src/audio/testTone.ts`. The test tone is one sine: pitch follows `meanLuma`, and stereo position follows the horizontal centre of brightness, so something bright on the left of the picture is heard on the left.

- The video element is the source of truth for play state. The engine keeps no `isPlaying`; read `video.paused` and the `play`, `pause` and `ended` events for button labels and the live region.
- Sound follows the picture, not the button. The engine silences on the video's own `pause` and `ended` events, so native controls and the end of the clip behave. With no analysed frame for 250 ms (buffering, hidden tab) it also silences, and resumes with the next frame.
- The engine, not the sonifier, guarantees the pause rule: on every pause it mutes the master bus after the reverb (`setMasterAudible` in `master.ts`) and reopens it on the next analysed frame. A sonifier's own `pause()` still has to stop its notes, but a reverb tail or a slow release cannot leak.
- One engine per track. On a track change, dispose the old engine and create a new one. If the video is already playing at that moment, call `play()` on the new engine, because the video's `play` event will not fire again.
- `onFeatures` fires only while the video is playing, including when audio has not been unlocked.
- No sound is possible before the first gesture. `createEngine` builds the master bus (four nodes) and creates the sonifier object, so that the legend can be listed, but they sit on Tone's suspended context; the sonifier's own nodes are built in its `start()`, on the first Play or legend press. Chrome still logs "The AudioContext was not allowed to start" at page load, because importing Tone creates that suspended context; that is expected, and the first gesture resumes it.
- `describeNow(f)` passes a frame to the sonifier's own `describeNow` and returns its sentence, so the UI never touches the sonifier. The shell calls it from an `onFeatures` callback at most twice a second and shows the sentence in the `NowHearing` panel, which is plain text and not a live region; the sentence is cleared when the picture pauses. The lightning sentence counts the notes of the last second, so it reads steadily at that rate.
- `setRegion(rect)` limits the sound to one rectangle of the picture (0..1 of its width and height, like an `ignore` rectangle). The FrameSource blanks everything outside it to black, snapped outward to whole cells, so the sonifiers need no change: a black cell is already "nothing here" to all three, and a cell keeps its place in the grid, so pan and pitch mean what they did. On a change the engine resets the Analyser and calls the sonifier's `pause()`, so that what comes into the area is not heard as a change in the picture; the next frame resumes the sound (the lightning sonifier forgets its last frame in `pause()` for this reason). It can be called while playing or paused, and a new engine starts on the whole picture. In the shell, `RegionPicker` offers six buttons with `aria-pressed` (whole picture, the four halves, the centre) and a line of text naming the area; `Player` lets a pointer user drag a rectangle on the picture and draws the chosen area as an outline with the rest dimmed. The buttons are the keyboard and screen reader route; a drawn rectangle under 0.16 of the width or 0.1 of the height is ignored (narrower than 0.15, the night lights sonifier would take it for a zoomed view). Each change is announced once through the live region.
- Video only for now. Still images (`scanX`) are added to the same function if Track 4 is built.

### Legend

Added by A on 2026-11-15. It adds the `legend` member above and changes nothing in `src/types.ts`.

- `engine.legend` is the list for the Legend component: one `LegendItem` per sound, with the `id` and `label` the sonifier gave it. It is fixed for the life of the engine and is there as soon as `createEngine` returns, before Play. Since the engine is created in an effect, keep it in state (`useState<Engine | null>`), not only in a ref, so the list renders. A track on the test tone or the placeholder sonifier has an empty list.
- Call `item.play()` directly in the button's click handler, with no `await` or timeout in front of it. The click is the user gesture: `play()` unlocks audio if Play has never been pressed, starts the sonifier if needed, and plays that one sound through the master bus.
- A legend press pauses the picture, so the example is heard alone and not over the track. The video fires its own `pause` event, so the Play button and the live region follow as for any other pause. The legend press itself needs no announcement.
- The UI never calls `createSonifier` or reads `sonifier.legend` itself.
- The engine keeps the master bus open for 3 s after a legend press, then closes it again unless the picture is playing. A pause during those 3 s does not cut the example. One consequence: if the picture was playing when the button was pressed, the track's voices fade in 50 ms as usual, but its reverb tail dies away under the example instead of being cut (measured: 5 to 10 % of the track's level after 100 ms, about 2 % after 350 ms).

### Dev harness

`src/analysis/dev/harness.html` runs the pipeline through `createEngine` without the UI shell, and shows the features the Analyser reports, the notes the lightning sonifier plays, what each of the ocean sonifier's six voices is doing, the output level at the left and right speaker, and each sonifier's `describeNow` sentence. Its "Legend" row has one button per item of `engine.legend`, wired the way the shell should wire them, so legend sounds can be heard and measured before Play and without the UI shell. A select switches between the test tone, the lightning sonifier and the ocean sonifier. The lightning and ocean sonifiers are run with the `ignore` rectangles from their own `track.ts`, so the harness blanks what the site blanks; `?ignore=off` in the URL turns the blanking off. `?region=x,y,w,h` (0..1) calls `engine.setRegion` with that rectangle. A check script can set `window.harnessFrame` to be given every analysed frame. With `npm run dev` it is at <http://localhost:5173/The_Earth_Information_Jukebox/src/analysis/dev/harness.html>. It is not linked from `index.html`, so it is left out of the build. Every `.mp4` in `src/analysis/dev/` is git-ignored. `bash src/analysis/dev/make-clips.sh` generates three synthetic ffmpeg test clips there, and its header says what each contains and should sound like: `standin.mp4` (brightness sweep, moving square, colour bars; for the test tone), `flashes.mp4` (yellow flashes at known places and times on a static map, and one white flash that must stay silent; for the lightning sonifier) and `oceantest.mp4` (warm and cold halves that swap, then movement on one side only; for the ocean sonifier). The page loads `standin.mp4` unless the URL says otherwise: `?clip=flashes.mp4&sonifier=lightning`. A deployed clip is loaded from `public/media/` with `?clip=media/ocean.mp4&sonifier=ocean`. A local cut of real footage can be kept in the same folder and loaded with `?clip=`, or any file can be loaded with the page's file picker.

## Analysis rules

- The analysis canvas is the track's `grid` multiplied by the largest whole number that keeps it within 96x48 (a 64x32 grid gives a 64x32 canvas; 32x16 gives 96x48). The Analyser averages each block of pixels into one cell. A grid larger than 96x48 is an error.
- `hue` and `sat` are HSV, computed from the averaged RGB of the cell. `luma` uses Rec. 709 weights.
- The first frame, and the first frame after a seek or loop, has `deltaLuma` all zero, so a jump in time is not read as a flash.
- Draw frames to a canvas no larger than 96x48. Create the 2D context with `willReadFrequently: true`.
- Use `requestVideoFrameCallback` where available, `requestAnimationFrame` otherwise. Throttle analysis to about 20 Hz.
- Blank out `ignore` rectangles before computing features, or on-screen dates and colorbars will be turned into sound. Blanked cells are black: luma 0, and they count as black in `meanLuma`.
- An area chosen by the visitor (`engine.setRegion`) is applied the same way: every cell outside it is blanked to black before the features are computed.
- Media must be served from our own origin. Reading pixels from a cross-origin video fails in the browser.
- For still images, `scanX` advances from 0 to 1 over `scanSeconds`, and the UI draws a vertical line at that position.

## Audio rules

- Start audio only from a user gesture (`await Tone.start()` in the Play handler). Browsers block it otherwise.
- Quantise every pitch to a scale (default: pentatonic). Helpers live in `src/audio/scales.ts`.
- Smooth continuous values before they reach a synth parameter (exponential moving average, or `rampTo` over 100–300 ms).
- Cap triggered notes at about 12 per second per track. The lightning sonifier does it with a token bucket (10 per second plus 2 saved up, so no one-second span exceeds 12) and spends tokens on the strongest flashes first.
- The lightning sonifier's flash is a rise in a cell's yellow (saturation times luma, weighted by closeness of hue to 48°), kept from frame to frame inside the sonifier, not a rise in luma. A cell that has sounded, and its neighbours, stay quiet for 1 s. Measured on the real clip: about 4 notes a second, at most 9 in one second.
- Track levels are balanced by each sonifier's `LEVEL` constant, not at the bus: ocean 0.63, lightning 1.6, night lights 1.6 (set on 2026-11-15 so the three measure within about 2.5 dB of each other at the 95th percentile; the ocean track's six sustained voices are otherwise about 12 dB louder than the plucks).
- Everything goes through one master bus: light reverb, then a limiter. Default volume is conservative. (`src/audio/master.ts`: gain at -12 dB, reverb with a 1.8 s decay at 18 % wet, a duck gain the engine closes on pause, then a limiter at -1 dB.) The bus is stereo throughout: a source panned with a Tone `Panner` before the bus comes out panned at the speakers (measured on 2026-11-14). Anything added to the bus must keep two channels.
- Map longitude to stereo pan and latitude to pitch where the frame is a flat world map, so position means the same thing in every track.
- The lightning clip turned out to be a turning globe, not a flat map (the EIC cut of SVS 5011). Height in the frame is still pitch (north is up), and left-right position is still pan, but that is left and right in the picture, not longitude. Lightning only appears between x 0.3 and 0.8 there, and the sonifier spreads that span over the full pan width.
- The ocean track is the one exception to latitude as pitch. VISION gives its pitch to temperature (warm is low, cold is high), and the far south is cold, so both cannot hold. It keeps longitude as pan (west half left, east half right), and latitude chooses the voice: north, tropics and south each have their own.
- The ocean sonifier holds six sustained voices and strikes the chord again every 4 s of picture (and at once after a pause or a seek). Its notes change only on a strike, which is 1.5 notes per second, and its continuous values (level, filter, shimmer) ramp over 300 ms.
- `pause()` must silence within 200 ms. No sound may continue while the picture is paused. The one exception is a legend sound: a single example under 2 s, started by its own button (see "Legend" under "Engine API").
- A sonifier's legend items follow these rules. `play()` is called only by the engine, after `start()`, and usually while the sonifier is paused, so the sound must not pass through a gain that `pause()` closes: give the legend its own node or nodes, connected to the same `output`. It must not depend on `update()`, it must be over within 2 s, and pressing a second item while the first sounds must not click. Compute the example with the same mapping functions as the live sound, so the legend cannot drift from the track. `dispose()` disposes the legend's nodes too.
- Legend items written so far. Lightning: north (A5, centre), south (E3, centre), left of the picture (G4, left), right of the picture (G4, right), a small flash and a big flash (G4, centre, quiet and loud); each is one pluck. Ocean: warm water (A2, full), cold water (E5, thin), moving water (E4 with the shimmer at full strength); each swells in, holds for a second and fades, 1.6 s in all. Night lights: a light in the north (G5), a light in the south (E4), a region that lost light (falls from E5 to C5), a region that gained light (rises from A4 to C5), a zoomed-in view (C5, D5, E5 in turn); all centred, each under a second.
- Sonifier lifecycle (no change to the types): `start()` is called once per sonifier; `pause()` silences but keeps the nodes; the next `update()` resumes the sound. The engine relies on this.
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
- One `aria-live="polite"` region announces track changes and play state. Mount the shared `Announcer` (`src/a11y/Announcer.tsx`) once in the shell and give it the current message. Do not announce every frame.
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
