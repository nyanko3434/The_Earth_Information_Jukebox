# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## State of the repo

Earth Jukebox is a NASA Space Apps Challenge 2026 entry ("The Earth Information Jukebox") by a team of two. Submission deadline: **2026-11-15 23:59 local**.

As of this writing the repo contains only planning docs under `docs/` — no `package.json`, no `src/`, no build, lint or test commands. The planned stack is React + Vite + TypeScript + Tone.js, deployed as a static site to GitHub Pages. When the app is scaffolded (BUILD_PLAN Step 0), add the real commands to this file.

`docs/` is the source of truth. Read `docs/ARCHITECTURE.md` before writing code; it is the technical contract between the two teammates and their Claude Code sessions.

| Doc | Use it for |
|---|---|
| `docs/VISION.md` | What the product is, the four tracks and their mappings, scope and out-of-scope |
| `docs/ARCHITECTURE.md` | Stack, folder layout, shared interfaces, analysis/audio/a11y rules, ffmpeg recipes, deployment |
| `docs/BUILD_PLAN.md` | Build order with a "done when" check per step, feature freeze, and the order in which to cut scope |
| `docs/WORK_DIVISION.md` | Which teammate owns which paths |
| `docs/SUBMISSION.md` | Submission form fields, resource lists, AI-use rules |

## What is being built

A web jukebox: the visitor picks a NASA Earth Information Center visualization and hears it. The soundscape is generated live in the browser from the visualization's rendered frames — nothing is pre-recorded, and the original science data is never read.

Pipeline (one direction, no backend):

```
media (video or still) -> FrameSource -> Analyser -> Sonifier (one per track) -> master bus (reverb -> limiter)
                          tiny canvas    FrameFeatures   Tone.js notes/params
                          (~64x32)       at ~20 Hz
```

- A shared engine (`src/analysis/`, `src/audio/`) reads frames; each track under `src/tracks/<id>/` supplies its own `track.ts` (metadata) and `sonifier.ts` (mapping).
- The UI reads the same `FrameFeatures` as the sonifier to drive the "what you're hearing" panel.
- `src/types.ts` (`FrameFeatures`, `Sonifier`, `TrackDef`, `MediaDef`) is the only contract between the sound half and the UI half. Copy it exactly from ARCHITECTURE.md; derived values go in `src/analysis/helpers.ts`, not into `FrameFeatures`.
- Tracks 1–3 (lightning, ocean, night lights) are videos. Track 4 (aerosols) is a stretch goal: a still image with a playhead sweeping left to right (`scanX`).

## Rules that are easy to break

Analysis
- Media must be self-hosted under `public/media/`. Reading pixels from a cross-origin video fails.
- Analysis canvas is at most 96x48, with the 2D context created with `willReadFrequently: true`. Throttle to about 20 Hz (`requestVideoFrameCallback`, falling back to `requestAnimationFrame`).
- Blank each track's `ignore` rectangles before computing features, or on-screen dates and colorbars become sound.

Audio
- Start audio only from a user gesture (`await Tone.start()` in the Play handler).
- Quantise every pitch to a scale (default pentatonic, `src/audio/scales.ts`), smooth continuous values (EMA or `rampTo` over 100–300 ms), and cap triggered notes at about 12 per second per track.
- On flat world maps, longitude maps to stereo pan and latitude to pitch, in every track.
- `pause()` must silence within 200 ms. No sound continues while the picture is paused.
- Everything routes through the single master bus.

Accessibility (applies from the first commit, never cut)
- Semantic HTML, an accessible name on every control, a text alternative for the video.
- Keyboard: Tab reaches everything, Space toggles play, Left/Right change track, visible focus ring.
- One `aria-live="polite"` region for track changes and play state — never per-frame announcements.
- The audio legend is a list of buttons that each play one sound and name its meaning.
- WCAG AA contrast, respect `prefers-reduced-motion`, nothing conveyed by colour alone.

Deployment
- GitHub Pages via a GitHub Actions workflow on push to `main`; `main` always deploys.
- Set Vite `base` to `'/<repo-name>/'` and build media URLs from `import.meta.env.BASE_URL`.

Media prep
- ffmpeg is run once by hand, not by the app. Always transcode to H.264, strip audio, target under 10 MB per clip. Recipes are in ARCHITECTURE.md.

## Ownership and collaboration

Work is split by path so two Claude Code sessions rarely touch the same files. Ask the user which role they hold before editing outside the area they are working in.

- **A (Sound):** `src/analysis/`, `src/audio/`, `src/tracks/*/sonifier.ts` (except night lights, which B writes).
- **B (Experience):** `src/components/`, `src/a11y/`, styling, `src/tracks/*/track.ts`, `public/media/`, deployment workflow, README and submission.
- **Shared:** `src/types.ts` and the interfaces in ARCHITECTURE.md change only when both teammates agree. Do not alter them unprompted.

Branches are short-lived and merged to `main` several times a day.

## Submission constraints that affect code and commits

- Keep the `Co-Authored-By: Claude` trailer on commits made with Claude Code; Space Apps requires AI-generated code to be acknowledged in metadata.
- The README needs a "Use of AI tools" section, a mapping table, and credits. The app's About section must state that the sound is synthesised by the project's own rules at run time, not by a generative AI model.
- No NASA logo, insignia or other NASA branding anywhere in the app, repo or demo. No AI-generated images or video.
- Each track records its SVS source URL and credit line (as given on the SVS page) in `track.ts`, and the app shows both.
- When a new library, font, icon set or NASA resource enters the repo, add it to the lists in `docs/SUBMISSION.md`.
- Out of scope: any backend, user uploads, ML models, reading original science data files.
