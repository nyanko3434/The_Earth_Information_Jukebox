# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working rules for Claude Code

- **Do not create commits.** Never run `git commit`, `git push` or anything else that writes history. When a piece of work reaches a sensible commit point, say so, list the files involved, and suggest a commit message; the user makes the commit. The suggested message must end with the `Co-Authored-By: Claude` trailer (see "Submission constraints").
- **Keep the docs current.** If a change makes anything in `docs/` or this file untrue or incomplete — stack, folder layout, interfaces, rules, plan, scope, ownership, resource lists, commands — update that doc in the same piece of work, not later.
- **Log the work.** Add an entry to `docs/PROJECT_LOG.md` whenever work is finished, a decision is made, scope is cut, or a plan changes. The log has one section per teammate: A's entries go at the end of the "A (Sound)" section, B's at the end of the file. The format is described at the top of that file.
- **Edit shared docs only on your own lines.** `docs/BUILD_PLAN.md` has one progress line per teammate; update only the line of the role this session works for. Two branches editing the same line, or both adding at the end of the log, is what causes merge conflicts here.

## State of the repo

Earth Jukebox is a NASA Space Apps Challenge 2026 entry ("The Earth Information Jukebox") by a team of two. Submission deadline: **2026-11-15 23:59 local**.

The app is a React + Vite + TypeScript + Tone.js static site, deployed to GitHub Pages at <https://nyanko3434.github.io/The_Earth_Information_Jukebox/>. BUILD_PLAN.md has a "Progress" paragraph naming the current step, followed by one status line per teammate. `docs/PROJECT_LOG.md` says where things stand in more detail, in one section per teammate, each ending with that teammate's latest entries and handoff note. Read both at the start of a session.

## Commands

Package manager is npm (Node 26 locally and in CI).

```bash
npm install      # after cloning or pulling a dependency change
npm run dev      # dev server, served under /The_Earth_Information_Jukebox/
npm run build    # tsc -b (type-check) then vite build to dist/
npm run preview  # serve dist/ locally
npm run lint     # oxlint, configured in .oxlintrc.json
```

There is no test runner. Type errors surface through `npm run build`, not through `npm run lint`. Sound is judged by ear on the deployed site (see WORK_DIVISION.md).

To run the analysis and audio pipeline without the UI, start `npm run dev` and open the dev harness at `/The_Earth_Information_Jukebox/src/analysis/dev/harness.html`. It shows the live `FrameFeatures` and the output level, plays the test tone, the lightning sonifier or the ocean sonifier, and has a button for each legend sound of the chosen sonifier. It is not part of the build. Clips in `src/analysis/dev/` are git-ignored; `bash src/analysis/dev/make-clips.sh` generates the three synthetic test clips (`standin.mp4`, `flashes.mp4`, `oceantest.mp4`). Choose with the URL, for example `?clip=flashes.mp4&sonifier=lightning`, or `?clip=media/ocean.mp4&sonifier=ocean` for a deployed clip in `public/media/`.

TypeScript settings from the template that reject otherwise ordinary code (`tsconfig.app.json`):

- `verbatimModuleSyntax`: types must be imported with `import type`.
- `erasableSyntaxOnly`: no `enum`, no `namespace`, no constructor parameter properties (`constructor(private x: number)`). Use union types and plain fields.
- `noUnusedLocals` and `noUnusedParameters`: unused names fail the build, and so fail the deploy.
- `allowImportingTsExtensions`: local imports carry the extension, as in `import App from './App.tsx'`.

## Docs

`docs/` is the source of truth. Read `docs/ARCHITECTURE.md` before writing code; it is the technical contract between the two teammates and their Claude Code sessions.

| Doc | Use it for |
| --- | --- |
| `docs/VISION.md` | What the product is, the four tracks and their mappings, scope and out-of-scope |
| `docs/ARCHITECTURE.md` | Stack, folder layout, shared interfaces, analysis/audio/a11y rules, ffmpeg recipes, deployment |
| `docs/BUILD_PLAN.md` | Build order with a "done when" check per step, feature freeze, and the order in which to cut scope |
| `docs/WORK_DIVISION.md` | Which teammate owns which paths |
| `docs/SUBMISSION.md` | Submission form fields, resource lists, AI-use rules |
| `docs/PICTURE_TO_SOUND.md` | Plain-language explanation of what in each picture drives what in the sound; the source for the README's mapping table. Update it when a sonifier's mapping changes |
| `docs/PROJECT_LOG.md` | Dated record of work done, decisions and changes; read the latest entries to see where the project stands |

## What is being built

A web jukebox: the visitor picks a NASA Earth Information Center visualization and hears it. The soundscape is generated live in the browser from the visualization's rendered frames — nothing is pre-recorded, and the original science data is never read.

Pipeline (one direction, no backend):

```text
media (video or still) -> FrameSource -> Analyser -> Sonifier (one per track) -> master bus (reverb -> limiter)
                          tiny canvas    FrameFeatures   Tone.js notes/params
                          (~64x32)       at ~20 Hz
```

- A shared engine (`src/analysis/`, `src/audio/`) reads frames; each track under `src/tracks/<id>/` supplies its own `track.ts` (metadata) and `sonifier.ts` (mapping).
- The UI starts and stops all of this through one call, `createEngine({ video, track })` in `src/audio/engine.ts`, which returns `play()`, `pause()`, `onFeatures()`, `dispose()` and `legend`, the list the Legend component renders (ARCHITECTURE, "Engine API" and "Legend").
- The UI reads the same `FrameFeatures` as the sonifier to drive the "what you're hearing" panel.
- `src/types.ts` (`FrameFeatures`, `Sonifier`, `TrackDef`, `MediaDef`) is the only contract between the sound half and the UI half. Copy it exactly from ARCHITECTURE.md; derived values go in `src/analysis/helpers.ts`, not into `FrameFeatures`.
- Tracks 1–3 (lightning, ocean, night lights) are videos. Track 4 (aerosols) is a stretch goal: a still image with a playhead sweeping left to right (`scanX`).

## Rules that are easy to break

### Analysis

- Media must be self-hosted under `public/media/`. Reading pixels from a cross-origin video fails.
- Analysis canvas is at most 96x48, with the 2D context created with `willReadFrequently: true`. Throttle to about 20 Hz (`requestVideoFrameCallback`, falling back to `requestAnimationFrame`).
- Blank each track's `ignore` rectangles before computing features, or on-screen dates and colorbars become sound.

### Audio

- Start audio only from a user gesture (`await Tone.start()` in the Play handler).
- Quantise every pitch to a scale (default pentatonic, `src/audio/scales.ts`), smooth continuous values (EMA or `rampTo` over 100–300 ms), and cap triggered notes at about 12 per second per track.
- On flat world maps, longitude maps to stereo pan and latitude to pitch. The ocean track is the one exception for pitch: there pitch is temperature (VISION), and latitude chooses the voice. Pan is longitude in every track.
- `pause()` must silence within 200 ms. No sound continues while the picture is paused, except a legend sound: one example under 2 s, played through `engine.legend`, which pauses the picture first. A sonifier's legend item plays on its own nodes, not through a gain that `pause()` closes (ARCHITECTURE, "Audio rules"). A sonifier's `start()` runs once, `pause()` keeps its nodes, and the next `update()` resumes the sound. The engine also mutes the master bus after the reverb on every pause, so do not route anything around the bus.
- Everything routes through the single master bus.

### Accessibility (applies from the first commit, never cut)

- Semantic HTML, an accessible name on every control, a text alternative for the video.
- Keyboard: Tab reaches everything, Space toggles play, Left/Right change track, visible focus ring.
- One `aria-live="polite"` region for track changes and play state — never per-frame announcements.
- The audio legend is a list of buttons that each play one sound and name its meaning.
- WCAG AA contrast, respect `prefers-reduced-motion`, nothing conveyed by colour alone.

### Deployment

- `.github/workflows/deploy.yml` builds and deploys to GitHub Pages on every push to `main`; `main` always deploys. Work happens on `dev` or short-lived branches.
- Vite `base` is `'/The_Earth_Information_Jukebox/'`. Build media URLs from `import.meta.env.BASE_URL`; a bare `/media/...` path works in neither dev nor production.

### Media prep

- ffmpeg is run once by hand, not by the app. Always transcode to H.264, strip audio, target under 10 MB per clip. Recipes are in ARCHITECTURE.md.

## Ownership and collaboration

**From 2026-11-15 at about 18:50 A (`nyanko3434`) works alone and owns every path**, including B's below; B is no longer available. The rest of this section describes the split until then, and its rule against editing the other role's paths no longer applies.

Work is split by path so two Claude Code sessions rarely touch the same files. `docs/WORK_DIVISION.md` records who holds which role (A is `nyanko3434`); match it against the git user to know whose session this is, and ask if it is unclear. Stay inside that role's paths. If the task needs a change in the other role's area, say so and let the user raise it with their teammate; do not make the edit.

- **A (Sound):** `src/analysis/`, `src/audio/`, `src/tracks/*/sonifier.ts` (except night lights, which B writes).
- **B (Experience):** `src/components/`, `src/a11y/`, styling, `src/tracks/*/track.ts`, `public/media/`, deployment workflow, README and submission.
- **Shared:** `src/types.ts` and the interfaces in ARCHITECTURE.md change only when both teammates agree. Do not alter them unprompted.

Branches are short-lived and merged to `main` several times a day. Each teammate works on their own branch, named `a/<topic>` or `b/<topic>`, cut from an up-to-date `dev`. Merge `origin/dev` into the branch before starting work and again before each commit point, so the other teammate's changes arrive in small pieces. If the session is on `dev` or `main` when work is about to start, say so and ask the user to create the branch.

## Submission constraints that affect code and commits

- Commits containing Claude-written code carry the `Co-Authored-By: Claude` trailer; Space Apps requires AI-generated code to be acknowledged in metadata. Since the user makes the commits, include the trailer in every suggested commit message.
- The README needs a "Use of AI tools" section, a mapping table, and credits. The app's About section must state that the sound is synthesised by the project's own rules at run time, not by a generative AI model.
- No NASA logo, insignia or other NASA branding anywhere in the app, repo or demo. No AI-generated images or video.
- Each track records its SVS source URL and credit line (as given on the SVS page) in `track.ts`, and the app shows both.
- When a new library, font, icon set or NASA resource enters the repo, add it to the lists in `docs/SUBMISSION.md`.
- Out of scope: any backend, user uploads, ML models, reading original science data files.
