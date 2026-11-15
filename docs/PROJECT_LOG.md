# Earth Jukebox: Project Log

A running record of work done and changes made during the project. It answers "what happened, and when" so neither teammate, nor a new Claude Code session, has to reconstruct it from the commit history.

## How to use this log

- Add an entry whenever a piece of work is finished, a decision is made, scope is cut, or a plan in another doc changes.
- From 2026-11-15 the log has one section per teammate, so that two branches never add lines at the same place (that caused a merge conflict on Day 1). **A adds entries at the end of the "A (Sound)" section. B adds entries at the end of the file, which is the "B (Experience)" section.** Nobody adds anything below B's section except B.
- Within a section, entries go under a date subheading, oldest first, newest at the bottom.
- Each entry is one line: time (24 h, local), who (A, B, both), and what changed. Add a short "why" when it is not obvious.
- Name the BUILD_PLAN step where one applies, and any doc that was updated as a result.
- Record decisions and problems as well as completed work. Mark them **Decision:** or **Problem:**.

## 2026-11-14 (Day 1)

- 12:44 — Repository created with the MIT licence.
- 12:50 — Planning docs added under `docs/`: VISION, ARCHITECTURE, BUILD_PLAN, SUBMISSION, WORK_DIVISION.
- 13:13 — Submission deadline recorded as 2026-11-15 23:59 local in BUILD_PLAN and SUBMISSION.
- 13:27 — `CLAUDE.md` added at the repo root as guidance for Claude Code sessions.
- **Decision:** Claude Code does not create commits. It says when a commit is due and suggests a message; a teammate makes the commit. Recorded in `CLAUDE.md`.
- **Decision:** Docs are updated in the same piece of work as the change that affects them. Recorded in `CLAUDE.md`.
- `docs/PROJECT_LOG.md` (this file) added.

Status at this point: planning docs only. No app scaffold yet; BUILD_PLAN Step 0 has not started.

- 13:45 — Step 0, both: app scaffolded with the Vite `react-ts` template (Vite 8, React 19, TypeScript 7), Tone.js 15 added, package named `earth-jukebox`. Template demo content, logos and README removed.
- 13:45 — Step 0: `src/types.ts` added, copied from ARCHITECTURE.md with the `ToneAudioNode` type import.
- 13:45 — Step 0: placeholder page (`index.html`, `src/App.tsx`, `src/index.css`, own `public/favicon.svg`), Vite `base` set to `/The_Earth_Information_Jukebox/`, and `.github/workflows/deploy.yml` added to deploy to GitHub Pages on push to `main`.
- 13:45 — `README.md` stub added with run commands and the "Use of AI tools" section. Full README is still a Step 7 job.
- **Decision:** npm is the package manager; Node 26 locally and in CI.
- **Decision:** the linter is oxlint, not ESLint, because that is what the current Vite template ships. ARCHITECTURE, SUBMISSION and CLAUDE.md updated to match.
- **Decision:** lint is not part of the deploy workflow, so a lint finding cannot block the site during the hackathon. The build still type-checks.
- Docs updated: CLAUDE.md (state, commands, deployment), ARCHITECTURE (tooling row, folder layout, deployment details), SUBMISSION (site URL, tools list).
- Checked locally: `npm run lint` and `npm run build` pass; the built site serves under `/The_Earth_Information_Jukebox/`.

Status at this point: Step 0 code is written and builds locally but is not yet committed or deployed. Still open before Step 0 is done: set the repo's Pages source to "GitHub Actions", merge `dev` into `main`, confirm the public URL shows the placeholder, and confirm both teammates can push.

- 14:33 — Step 0: `dev` merged into `main` (PR #1) and the Pages deploy ran. The placeholder is live at <https://nyanko3434.github.io/The_Earth_Information_Jukebox/>; the page, script, stylesheet and favicon all load.

Status at this point: the public link exists. Step 0 is done once both teammates have confirmed they can push. Next is Step 1, the walking skeleton.

- 15:17 — **Decision:** roles assigned. `nyanko3434` is A (Sound); the other teammate is B (Experience). Recorded in WORK_DIVISION.
- 15:17 — Docs prepared for Step 1: progress line added to BUILD_PLAN, TypeScript settings and role lookup added to CLAUDE.md.

### Handoff: starting Step 1

Where the code stands: `src/` holds only `main.tsx`, `App.tsx` (placeholder page), `index.css` and `types.ts`. `public/` holds only the favicon. There is no `src/analysis/`, `src/audio/`, `src/tracks/`, `src/components/` or `public/media/` yet. `dev` is level with `main` plus the docs commits.

Step 1 split (from WORK_DIVISION):

- A: FrameSource, Analyser, and a test tone whose pitch follows `meanLuma`. Paths: `src/analysis/`, `src/audio/`.
- B: lightning clip and poster in `public/media/`, the bare UI shell (track list with one entry, video, Play/Pause), deploy.

Open points to settle before or during Step 1:

- **A has nothing to analyse yet.** The lightning clip is B's job and is not in the repo. A needs a stand-in video under `public/media/` to develop against, or B's clip first.
- **Nothing calls A's code yet.** The Play button and `<video>` element live in B's UI shell (`src/App.tsx`, `src/components/`). A and B need to agree how the shell hands the video element to FrameSource and starts and stops the tone. Until the shell exists, A needs some way to run the pipeline in the browser without editing B's files.
- Teammate push access is still unconfirmed.

Step 1 is done when, on the deployed site, pressing Play shows the video with a tone that clearly changes with the picture, and pausing silences it.

- 16:10 — Step 1, A: `src/analysis/frameSource.ts` and `src/analysis/analyser.ts` added. A playing video is drawn to a hidden canvas (64x32 for a 64x32 grid) and turned into `FrameFeatures` at 20 Hz.
- 16:10 — Step 1, A: `src/audio/master.ts` (gain at -12 dB, then a limiter), `src/audio/testTone.ts` (one sine, 110-880 Hz from `meanLuma`) and `src/audio/engine.ts` added.
- 16:10 — Step 1, A: dev harness added at `src/analysis/dev/harness.html`, so the pipeline can be run before the UI shell exists. It is not part of the build.
- **Decision:** the UI shell drives everything through `createEngine({ video, track })`, which returns `play()`, `pause()`, `onFeatures()` and `dispose()`. The video element is the source of truth for play state, and the engine silences on the video's own `pause` and `ended` events. Recorded in ARCHITECTURE ("Engine API"), WORK_DIVISION and CLAUDE.md.
- **Decision:** A's stand-in clip is a synthetic ffmpeg test pattern at `src/analysis/dev/standin.mp4`, git-ignored and outside `public/`, so it is never committed or deployed. Its content is known (brightness sweep, moving square, colour bars), so the Analyser's numbers can be checked against it.
- **Decision:** the test tone's pitch is continuous, not quantised to a scale. It is a diagnostic that Step 2 replaces, and steps would hide small brightness changes. Recorded in ARCHITECTURE as the one exception.
- **Decision (awaiting B's agreement):** sonifier lifecycle. `start()` is called once, `pause()` silences but keeps the nodes, the next `update()` resumes. No change to `src/types.ts`. B needs this for the night lights sonifier.
- Checked in headless Chrome against the stand-in clip: `meanLuma` follows the sweep from 0 to 0.95 and back with the tone frequency tracking it; 20.0 analysed frames per second; the moving square appears in the expected columns and rows; the colour bars read grey, yellow, cyan, green, magenta, red, blue; output is silent about 65 ms after Pause, after `video.pause()` called directly, and at the end of the clip. `npm run lint` and `npm run build` pass, and `dist/` contains neither the harness nor the clip.
- **Problem (harmless):** Chrome logs "The AudioContext was not allowed to start" at page load. Importing Tone creates its suspended context; `play()` resumes it. Noted in ARCHITECTURE.
- Not yet done: listening by ear (the checks above measured the signal, nobody heard it), and Firefox.
- 17:12 — Step 1, A: the test tone is now stereo. It was a single centred sine, so both speakers carried the same signal. A Tone `Panner` now places it at the horizontal centre of brightness of the frame (`testTonePan` in `src/audio/testTone.ts`); a nearly black frame pans to centre. The harness shows the pan value.
- **Decision:** pan the test tone in Step 1 instead of waiting for the lightning sonifier, to prove that pan survives the master bus before Step 2 depends on it.
- Checked in headless Chrome, left and right measured separately at the speaker output: equal during the full-frame fade (0.089 each); from left 0.124 / right 0.023 to left 0.026 / right 0.123 as the square crosses; steady at pan -0.32 on the colour bars; both silent within 150 ms of Pause. The master bus keeps stereo, so `master.ts` is unchanged. Lint and build pass. Still not heard by ear.
- Note: a centred tone is now 3 dB quieter per speaker than before, because the panner keeps total power constant.

### Handoff: B's half of Step 1

A's half is ready to be called. What B needs:

- In the lightning `track.ts`: `createSonifier: (output) => createTestTone(output)`, imported from `src/audio/testTone.ts`, and a `grid` of `{ cols: 64, rows: 32 }` unless there is a reason to differ.
- In the shell: `const engine = createEngine({ video, track })` from `src/audio/engine.ts`, created in an effect whose cleanup calls `engine.dispose()`. Play button calls `engine.play()`, Pause calls `engine.pause()`.
- The `<video>` must be self-hosted and should be `muted` and `playsInline`. Read play state from the video element, not from the engine.
- A worked example of all of this is `src/analysis/dev/harness.ts`.
- Listen on headphones when checking Step 1: the tone moves left and right with the bright part of the picture as well as changing pitch.
- To agree: the sonifier lifecycle sentence above.

Step 1 is done when the deployed site plays the lightning clip with a tone that follows the picture and pausing silences it.

## A (Sound)

A's entries from Step 2 on. A adds new entries at the end of this section, above the "B (Experience)" heading.

### 2026-11-14 (Day 1), Step 2

- 17:35 — **Decision:** A started Step 2 before Step 1 is closed. Nothing left in Step 1 is A's, and the dev harness runs the sonifier without the UI shell.
- 17:35 — Step 2, A: `src/tracks/lightning/sonifier.ts` added. Each new flash is one plucked note: pitch from height in the frame (pentatonic on C, C3 to C6, top is high), pan from left-right position, loudness from the size of the jump in brightness. Eight voices, each with its own panner. A cell that has just sounded stays quiet for 0.4 s, so a flash that brightens over several frames is one note. `legend` is empty until Step 5; `describeNow` is written.
- 17:35 — Step 2, A: `src/audio/scales.ts` (pentatonic quantising) and `src/analysis/helpers.ts` (`findFlashes`) added. The other helpers named in ARCHITECTURE wait for the tracks that need them.
- 17:35 — Step 2, A: master bus is now gain -> reverb (1.8 s decay, 18 % wet) -> duck gain -> limiter.
- **Decision:** the engine guarantees the pause rule at the bus. On every pause it mutes the bus after the reverb, and reopens it on the next frame. Without this a reverb tail outlasts the 200 ms rule; with it, the rule holds for any sonifier, including B's night lights. No change to the `Engine` interface.
- **Decision:** the note cap is a token bucket of 10 notes per second plus 2 saved up, so no one-second span exceeds 12, and the strongest flashes get the notes. (The plan said 12 per second with 4 saved up; that would have allowed 16 in a second.)
- 17:35 — Dev harness: a select switches between the test tone and the lightning sonifier; `?clip=` and `?sonifier=` in the URL; readouts for notes per second, last note and `describeNow`. `src/analysis/dev/make-clips.sh` now generates both synthetic clips, and every `.mp4` in that folder is git-ignored.
- Checked in headless Chrome on `flashes.mp4`: the four corner flashes played 784 Hz left, 784 Hz right, 165 Hz left, 165 Hz right, and were measured louder on the matching side (about 0.16 against 0.04); the large flash played at loudness 1.00 and the small dim one at 0.62; 40 flashes in 2 s produced 21 notes with at most 11 in any second; the six lingering dots sounded once each; the static map and date box made no sound; both channels were silent within 100 ms of Pause in the middle of the burst, and sound returned on Play; switching sonifier while playing left nothing stuck. The test tone still pans correctly through the reverb bus. Lint and build pass.
- **Problem (open):** none of this is tuned on real lightning footage, and nobody has listened to it. The SVS 5011 page does not describe the picture. Its text says a 10-day roving window is used, so lightning may linger and fade rather than flash; the threshold, the 0.4 s quiet time and the loudness curve (a 16-pixel flash already reaches 0.91) are the constants to revisit. They are at the top of `sonifier.ts`.
- **Problem (minor):** a large flash is placed at one cell of its blob, not its centre, so its pitch or pan can be off by a cell or two.
- For B, when writing the lightning `track.ts`: `createSonifier: (output) => createLightningSonifier(output)` from `src/tracks/lightning/sonifier.ts`. Prefer a flat world map cut of SVS 5011 (the Science On a Sphere file looks like the candidate, unconfirmed), and set `ignore` rectangles over any date or caption. A needs a 45 s local cut of the same footage at `src/analysis/dev/lightning.mp4` to tune against.

### 2026-11-15 (Day 2)

- 10:50 — `dev` now holds both halves: A's Step 2 commit merged with B's two pull requests (#2 lightning metadata and `TrackList`; #4 ocean and night lights track shells, About, `Announcer`). The merge conflicted in two docs, the BUILD_PLAN progress line and the end of this log, because both teammates had edited the same lines. Resolved keeping both. `npm run lint` and `npm run build` pass on the merged tree.
- **Decision:** to stop those conflicts, shared docs are now edited per teammate. BUILD_PLAN has one progress line each; this log has one section each (rules at the top of this file). A works on short-lived `a/<topic>` branches cut from an up-to-date `dev`, and merges `origin/dev` into the branch before starting and before each commit point. Recorded in CLAUDE.md and WORK_DIVISION. B's habit of adding entries at the end of this file already fits; B still needs to be told about the progress line.
- Step 0's last open point is closed: B has pushed and merged, so both teammates can push.
- **Problem (B's, deadline is tonight 23:59):** there is still no UI shell (`src/App.tsx` is the Step 0 placeholder; no Jukebox or Player), no `public/media/lightning.mp4`, and `src/tracks/lightning/track.ts` still wires the test tone. Step 1 is not closed. BUILD_PLAN says Track 3 is the first thing to cut if Day 1's checkpoint was missed.
- Note: B's branch `b/ignore-rects` (not merged yet) adds the ocean and night lights clips under `public/media/` and their `ignore` rectangles. Once it is in `dev`, A has real footage for the ocean sonifier.
- ARCHITECTURE folder layout: `src/tracks/placeholderSonifier.ts` (B's silent sonifier) added to the list.
- 11:15 — Step 4, A: `src/tracks/ocean/sonifier.ts` added (`createOceanSonifier`), on branch `a/ocean-sonifier`. Six sustained voices, one per region of the map: north (`y` 0 to 0.34), tropics (0.34 to 0.66) and south (0.66 to 0.81), each split into a west and an east half. A region's mean colour, read off the clip's colorbar, sets the voice's note (pentatonic on A, A2 to A5; warm is low, cold is high) and its fullness (warm is louder, with the filter open and a wider detune; cold is close to a sine). West is panned left and east right (±0.6). A region with little water is quieter, and one with none is silent. Movement in a region sets the level of a tremolo shimmer on the voice's own note, moved up by octaves to between 1 and 2 kHz. The chord is struck again every 4 s of picture, north first: each voice dips, glides to its new note and swells back. Notes change only on a strike. `describeNow` is written; `legend` is empty until Step 5.
- 11:15 — Step 4, A: `src/analysis/helpers.ts` gains `hueToValue` and `regionValue`. `regionValue` replaces the planned `regionMean`: a plain mean of hue is wrong, and the sonifier needs the water's share of the region and its movement from the same pass. `colourCoverage` and `column` are still unwritten.
- 11:15 — Dev harness: third sonifier option (`?sonifier=ocean`), a readout of the six voices, an output level meter (left and right, at the speakers), and `?clip=media/<name>.mp4` to load a clip from `public/media/`. With the ocean sonifier it uses the `ignore` rectangles of `src/tracks/ocean/track.ts`. `make-clips.sh` generates a third clip, `oceantest.mp4`, with known answers.
- **Decision:** in the ocean track, pitch is temperature, not latitude. VISION says warm is low and cold is high; the rule in ARCHITECTURE says latitude is pitch; the far south is cold, so both cannot hold. Longitude is still pan, and latitude chooses the voice. Recorded as the one exception in ARCHITECTURE ("Audio rules") and CLAUDE.md. B should know, because the "listen for" text and the README mapping table describe it.
- **Decision:** the colorbar value stays 0 to 1 (cold end to warm end) and the app claims no degrees. For Step 5: the clip's colorbar is labelled "Sea Surface Temp (°C)", 0 to 32, and is linear, so a value is about `32 × value` °C if the legend or the panel should say so. The 17 stops in `OCEAN_COLORBAR` were read from `public/media/ocean.jpg`; the bar is not linear in hue.
- What the real clip gives (measured, 45 s, a whole year): the tropical voices hold A2 to C#3 throughout; the northern voices start at B4 and C#5, fall to E4 and F#4 by 16 to 24 s (northern summer) and rise to C#5 and E5 by the end; the southern voices go from A4 and B4 up to C#5 and back to A4. The north-east is the quietest voice (about a quarter of it is water).
- Checked in headless Chrome. On `oceantest.mp4`: the warm half played 110 Hz and the cold half 880 Hz, and they swapped when the picture did; the warm voice's gain was 0.80 against 0.26; the speakers were louder on the warm side (left 0.091 against right 0.039, then 0.043 against 0.061 with only two warm voices against three cold); the grey "land" region stayed silent; no voice shimmered on a still picture; a bar moving through two regions gave shimmer 0.12 in those two and at most 0.006 elsewhere; the red band where the colorbar sits changed nothing. On the real clip: 12 strikes, 4.00 to 4.03 s apart, every pitch on the scale, at most 6 notes in any second; mean output 0.066 per channel (the test tone measures 0.062); silent 97 to 104 ms after Pause in the middle of a strike, after `video.pause()` called directly, and after switching sonifier; Play struck the chord again; a seek to 22 s struck it at once with that moment's notes; switching to the lightning sonifier while playing left no ocean voice sounding. The test tone and the lightning sonifier still behave as before in the changed harness. `npm run lint` and `npm run build` pass, and `dist/` has neither the harness nor a dev clip.
- **Problem (open):** nobody has listened to it. The levels, the 4 s chord, the size of the dip and the shimmer level are set by measurement and reasoning only. They are the constants at the top of `sonifier.ts`.
- **Problem (open, expected):** the shimmer barely changes during the real clip, because the movement in the picture barely changes (0.012 to 0.033 per second in every region). It is stronger in the two tropical voices and absent on a still picture, but it does not rise and fall.
- **Problem (minor):** a note waits for the next strike, so after a hard cut in a picture the old chord can last up to 4 s. The ocean clip has no cuts, and a seek strikes at once.
- Note: `b/ignore-rects` was not yet merged when this was written, so the checks ran on a copy of its `ocean.mp4` taken from the git object into the git-ignored `src/analysis/dev/ocean.mp4`, with no `ignore` rectangle. The sonifier does not depend on that rectangle (its regions stop above the colorbar). `?clip=media/ocean.mp4` builds the right URL but has not loaded a file yet, because `public/media/` is not on this branch.
- Docs updated: ARCHITECTURE (folder layout, helper list, Engine API, dev harness, audio rules), CLAUDE.md (harness paragraph, the pan and pitch rule), BUILD_PLAN (A's line).
- 12:05 — `origin/b/ignore-rects` merged into `a/ocean-sonifier` by A, so the branch now has `public/media/ocean.mp4` and the ocean `ignore` rectangle. A listened to the ocean sonifier on the real clip and found it fine; no constant was changed. This is the first listening recorded in this log. Still unheard: lightning on real footage (there is no clip), and B has not listened to the ocean track.
- 12:05 — `docs/PICTURE_TO_SOUND.md` added: a plain-language account of how a frame becomes sound, with a table per track of what in the picture drives what in the sound (lightning and ocean; night lights is marked as not written). It is meant for explaining the project and as the source for the README's mapping table in Step 7. Listed in CLAUDE.md's docs table. It must be updated when a mapping changes.

### Handoff: A's next session

Read this, the two progress lines in BUILD_PLAN, and ARCHITECTURE ("Engine API" and "Audio rules") first.

What exists on A's side:

- `src/analysis/`: `frameSource.ts`, `analyser.ts`, `helpers.ts` (`findFlashes`, `hueToValue`, `regionValue`), and the dev harness in `dev/`.
- `src/audio/`: `engine.ts` (`createEngine`, the one call the UI makes), `master.ts` (gain, reverb, duck, limiter), `scales.ts`, `testTone.ts`.
- `src/tracks/lightning/sonifier.ts`: written, checked on the synthetic `flashes.mp4` only.
- `src/tracks/ocean/sonifier.ts`: written, checked on the real clip and on the synthetic `oceantest.mp4`. On branch `a/ocean-sonifier` until it is merged into `dev`.

What A still owes, in the order to do it:

1. **Ocean track:** A has listened and found it fine. Still to do: B listens, and a check on laptop speakers (the tropical voices are as low as 110 Hz). The harness URL is `?clip=media/ocean.mp4&sonifier=ocean`.
2. **Step 5:** legend items for lightning and ocean (`legend` is empty in both). The engine does not yet give the UI the sonifier, so how the Legend component reaches `legend`, and how a legend sound plays before Play has been pressed, has to be agreed with B first.
3. **Lightning (Step 2):** tune the constants at the top of the sonifier once real footage exists. No lightning clip is in the repo yet.
4. **Step 6:** volume balance across tracks, audio bugs, Chrome and Firefox. Feature freeze is at the end of Step 6. **Step 7:** the mapping table and technical write-up for the README (B leads the README).

Not code, still open:

- Only the ocean track has been listened to, and only by A. Every other check measured the signal in headless Chrome.
- `docs/PICTURE_TO_SOUND.md` is the draft of the README's mapping table and technical write-up (Step 7); the night lights section is empty until B writes that sonifier.
- The sonifier lifecycle sentence in ARCHITECTURE is still marked as awaiting B's agreement.
- To raise with B: switch the ocean `track.ts` to `createSonifier: (output) => createOceanSonifier(output)` (it still uses the placeholder, so the deployed ocean track is silent); switch the lightning `track.ts` to `createLightningSonifier`; the ocean track's pitch exception, and that left and right are the west and east halves of the map (worth a "listen for" bullet); the shell and the lightning clip (see the problem above); the per-teammate progress line.

How to check sound work: `npm run dev`, then the harness at `/The_Earth_Information_Jukebox/src/analysis/dev/harness.html` (options and clips are described in CLAUDE.md and in `src/analysis/dev/make-clips.sh`).

## B (Experience)

B's entries from Step 1 on. B adds new entries at the end of the file.

- 15:10 — Step 1, B: `src/tracks/lightning/track.ts` and `src/tracks/index.ts` added. Lightning metadata with the real SVS 5011 credit and source URL, the description, four "listen for" bullets, a 64x32 grid, and `createSonifier` wired to A's `createTestTone`. Media URLs are built from `import.meta.env.BASE_URL` as ARCHITECTURE requires. `ignore` is empty with a TODO for T3.3, once the clip exists.
- 15:10 — Step 1, B: `src/components/TrackList.tsx` added, presentational: a `<nav>` with one button per track, the selected one marked with `aria-current`.
- Note: `public/media/lightning.mp4` and `lightning.jpg` are still outstanding (B's media task); until they land the player will show a missing poster. `npm run lint` and `npm run build` pass.

### Phase 2 (Step 2), B's half

- 15:20 — Step 2, B: `src/tracks/ocean/track.ts` and `src/tracks/nightlights/track.ts` added as metadata shells with the real SVS 3912 and 5313 credit lines, source URLs, descriptions and "listen for" bullets, plus `src/tracks/placeholderSonifier.ts` (a silent `Sonifier`) until the real mappings land. Both are registered in `src/tracks/index.ts` alongside lightning, so the track list is ready for the shell. `ignore` is empty with TODOs for T3.3.
- 15:20 — Step 2, B: `src/components/About.tsx` added, static: how the sound is made, the pixels-not-data caveat, the SVS credits, and the AI-use note.
- 15:20 — Step 2, B: accessibility baseline for the live region. `src/a11y/Announcer.tsx` renders the single `role="status"`, `aria-live="polite"` region, and `.sr-only` was added to `index.css`. ARCHITECTURE updated to say the shell mounts it. It is not mounted yet: `Jukebox.tsx` and `Player.tsx` (T1.4) are not on `main`, so T2.4 and mounting the Announcer are blocked on that merge.
- Note: `public/media/ocean.mp4`/`ocean.jpg` and `nightlights.mp4`/`nightlights.jpg` are still outstanding (T3.2); the paths here fix those filenames. `npm run lint` and `npm run build` pass.

### Phase 3 (Step 3), B's half

- 16:14 — Step 3, B (T3.2): ocean and night lights clips and posters added under `public/media/`, transcoded from SVS to H.264 with no audio track, `-movflags +faststart`, and the filenames the tracks already expect. Ocean: 45 s starting at 00:00:10 of `flat_global_ecco2_2028x1024_comp_p30.mp4`, 1280x640, CRF 32, 6.9 MB. Night lights: the full 43 s `nightlights_flat_series_and_change_wZooms_13_EIC_2160p30_h265.mp4`, 1280x360, CRF 26, 0.55 MB. Sources `https://svs.gsfc.nasa.gov/3912/` and `https://svs.gsfc.nasa.gov/5313/`; credits stay in each `track.ts`.
- **Decision:** the night lights clip is kept whole, including the zoomed views. Its planned mapping is brightness to note density and tempo (not latitude/longitude), so the zooms do not break the mapping; cutting them would lose the change section the track is about.
- **Problem:** `public/media/lightning.mp4` and `lightning.jpg` are still missing (T1.1 was never committed), so the lightning track's `ignore` rectangles cannot be set yet and the deployed player will 404 that clip.
- 16:14 — Step 3, B (T3.3): `ignore` rectangles set for ocean (bottom 0.84–1.0, the temperature colorbar and its labels) and night lights (bottom 0.88–1.0, a static grey band with no map content). Located by per-second frame analysis of the transcoded clips: both bands are static for the whole clip. Lightning keeps an empty list because its clip is still missing.
- **Note:** the rectangles were found numerically rather than by eye. Both sit over dark or static areas, so blanking them removes little if any real science content even if the exact edge is a little off.

### Phase 4 (Step 4) and integration, B's half

- 06:51 — Step 1, B (T1.1): `public/media/lightning.mp4` and `lightning.jpg` added from the SVS 5011 EIC flat map: 45 s starting at 00:00:20, 1280x360, H.264, CRF 26, 1.3 MB, no audio. Frame analysis found no static date or colour bar; a small static label in the bottom-right corner is blanked by the lightning `ignore` rectangle (`x 0.92, y 0.9, w 0.08, h 0.1`). Step 1's media is now complete.
- 06:51 — Step 3/integration, B: `src/tracks/lightning/track.ts` and `src/tracks/ocean/track.ts` now wire A's `createLightningSonifier` and `createOceanSonifier` instead of the test tone and the silent placeholder, as A's handoff asked. Ocean's "listen for" gains the west/east ear bullet. Night lights stays on the placeholder until T4.1.
- **Note:** the dev server on port 5173 was already running, so the temporary one started for checks used 5174 and was stopped again. Static checks: `npm run lint` and `npm run build` pass, and all six media URLs return 200 from the dev server. The runtime checklist (play/pause, silence timing, keyboard, console errors, levels) could not be run: there is no Chrome/Chromium or `agent-browser` on this machine.
- 06:58 — T3.1 integration checks (B), headless Chrome via `agent-browser` at `localhost:5174`: all three tracks switch with the right `src`; Play/Pause and video progress work; Space toggles from body focus; Left and Right change track; Tab shows the 3 px focus ring; the live region says "Track changed to …" and "…: playing/paused" and does not change per frame; the end of the clip pauses and returns the button to Play; no console errors. Ocean plays; night lights plays and is silent, as expected until T4.1. Pause silencing is guaranteed by the engine closing the post-reverb duck at `immediate()` over 50 ms (A measured 97–104 ms); it was not re-measured here.
- **Not verified:** sound quality, output levels and clipping by ear. That needs the two of you on headphones and laptop speakers, as WORK_DIVISION says at Steps 2, 4 and 6.
