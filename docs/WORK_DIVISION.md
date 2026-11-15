# Earth Jukebox: Work Division

Two teammates with equal skills and no audio background. The split is by area of the codebase so that two Claude Code sessions rarely touch the same files.

**From 2026-11-15 at about 18:50, A works alone.** B had other commitments for the rest of the hackathon, so A now owns every path below, including B's, and does B's remaining steps (Legend UI, Step 6 checks, README, demo video, the form). The split below describes how the work was divided until then.

- **A: Sound.** Turns frames into features and features into music. A is `nyanko3434`.
- **B: Experience.** Turns that into something a person can find, use and understand. B is the other teammate.

## Ownership

| Area | Owner |
|---|---|
| `src/analysis/` (FrameSource, Analyser, helpers) | A |
| `src/audio/` (engine, master bus, scales, synth helpers) | A |
| `src/tracks/*/sonifier.ts` | A, except night lights (B on Day 2) |
| `src/tracks/*/track.ts` (metadata, descriptions, ignore rectangles) | B |
| `src/components/`, `src/a11y/`, styling | B |
| `public/media/` and ffmpeg prep | B |
| Deployment workflow | B |
| README, demo video, submission form | B leads, A reviews |
| `src/types.ts` | Shared. Change only after both agree. |

## By step

Steps refer to BUILD_PLAN.md.

| Step | A: Sound | B: Experience |
|---|---|---|
| 0 Setup | Together | Together |
| 1 Walking skeleton | FrameSource, Analyser, test tone | Lightning clip and poster, UI shell, deploy |
| 2 Track 1 and interface | Lightning sonifier, master bus, scales | Jukebox UI, accessibility baseline, mock tracks |
| 3 Integrate | Together: merge, listen, fix | Together, then B prepares ocean and night lights clips |
| 4 Tracks 2 and 3 | Ocean sonifier | Night lights sonifier, plus track metadata for both |
| 5 Learnable | Legend sounds and `describeNow` for all tracks | Legend UI, NowHearing panel, About section |
| 6 Test and polish | Volume balance, audio bugs, browser check | Screen-reader and keyboard run, UI bugs |
| 7 Submission | Mapping table and technical write-up, review | README, demo video, Summary and Details text |
| 8 Submit | Verify links in a private window | Fill in and submit the form |

B writes one sonifier on Day 2 so that both of you have worked on the sound, and so Tracks 2 and 3 are built in parallel.

## How the two halves meet

- The contract between A and B is `src/types.ts` (`FrameFeatures`, `Sonifier`, `TrackDef`) plus one function, `createEngine` in `src/audio/engine.ts`, which B's shell calls to play and pause a track. Both are described in ARCHITECTURE.md.
- Until A's real sonifier exists, B builds against a mock `TrackDef` whose sonifier does nothing.
- A tests sonifiers on the deployed UI as soon as Step 1 is merged.

## Working agreements

- Short-lived branches, merged to `main` several times a day. `main` always deploys. Each teammate works on their own branch (`a/<topic>`, `b/<topic>`) cut from an up-to-date `dev`, and merges `origin/dev` into it before starting and before each commit point.
- In the shared docs, edit only your own lines: your progress line in BUILD_PLAN, and your section of PROJECT_LOG (A's section sits above B's; B adds at the end of the file). This keeps two branches from changing the same lines.
- Pull before starting a Claude Code session, and tell it to read `docs/ARCHITECTURE.md` first.
- Do not edit files in the other person's area without asking. If you need a change there, ask them.
- Sound is judged by both of you, by ear, at the end of Steps 2, 4 and 6. Neither person signs off a track alone.
- Quick sync at the start and end of each day: what is done, what is blocked, what gets cut.
