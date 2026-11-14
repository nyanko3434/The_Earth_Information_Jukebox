# Earth Jukebox: Project Log

A running record of work done and changes made during the project. It answers "what happened, and when" so neither teammate, nor a new Claude Code session, has to reconstruct it from the commit history.

## How to use this log

- Add an entry whenever a piece of work is finished, a decision is made, scope is cut, or a plan in another doc changes.
- Entries go under the current date, oldest first, newest at the bottom.
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

- 15:10 — Step 1, B: `src/tracks/lightning/track.ts` and `src/tracks/index.ts` added. Lightning metadata with the real SVS 5011 credit and source URL, the description, four "listen for" bullets, a 64x32 grid, and `createSonifier` wired to A's `createTestTone`. Media URLs are built from `import.meta.env.BASE_URL` as ARCHITECTURE requires. `ignore` is empty with a TODO for T3.3, once the clip exists.
- 15:10 — Step 1, B: `src/components/TrackList.tsx` added, presentational: a `<nav>` with one button per track, the selected one marked with `aria-current`.
- Note: `public/media/lightning.mp4` and `lightning.jpg` are still outstanding (B's media task); until they land the player will show a missing poster. `npm run lint` and `npm run build` pass.
