# Earth Jukebox: Build Plan

The order we build in, with a check at the end of each step. Times are working hours, based on about 6 hours per person per day. Who does what is in WORK_DIVISION.md.

**Before anything else:** confirm the exact submission deadline for our local event and write it here: `2026 Nov 15 11:59pm`.

**Progress:** Step 0 is finished (public link live, both teammates have pushed). **Current step: Step 1**, which closes when the deployed site plays the lightning clip with sound; Step 2 and Step 4 work is running alongside it. Each teammate updates only their own line below, so two branches never edit the same line. Details go in PROJECT_LOG.md.

**A (Sound), updated 2026-11-15 19:10:** Step 1 half done (FrameSource, Analyser, test tone, engine; checked in the dev harness). Step 2 half written and now working on the real clip: the lightning sonifier plays one pluck for each rise in yellow (the first version answered to brightness and played the white ISS orbit line instead of the lightning). Measured on the real clip in headless Chrome: 4.3 notes a second, all from lightning dots. Not yet listened to by either teammate. Step 4, A's half written: the ocean sonifier (`src/tracks/ocean/sonifier.ts`), checked in headless Chrome on the real ocean clip and on a synthetic one, listened to by A and found fine, and wired into the ocean `track.ts` by B. The mappings are explained in plain language in `docs/PICTURE_TO_SOUND.md`. Step 5, A's half written: legend sounds for lightning (six) and ocean (three), reached by the UI through `engine.legend` (an addition to the Engine API that awaits B's agreement), playable in the dev harness, checked in headless Chrome and not yet listened to; `describeNow` is written for both. The legend work is in `dev` and `main` (PR #5, with B's shell, lightning clip, track wiring and night lights sonifier). A has listened to lightning and to the lightning and ocean legend sounds and found them fine. Step 6, volume balance: the three tracks now measure within about 2.5 dB of each other (they were 12 dB apart); to be confirmed by ear. Night lights now has five legend sounds. **Working alone from 18:50.** Step 5 is complete in code (19:10): the Legend is mounted on `engine.legend` for all three tracks and the "What you are hearing" panel shows each sonifier's `describeNow` sentence; checked in headless Chrome, waiting to be deployed. Next, in order: deploy, Step 6 checks (keyboard, Firefox, phone, accessibility tree), freeze at 21:00, then README, demo video and the form.

**B (Experience), last updated by A on 2026-11-15 19:00 (B left at about 18:50; A works alone from here):** B's half of Steps 1 to 4 is merged and deployed: the Jukebox and Player shell, `TrackList`, About, the `Announcer` live region, all three clips with their `ignore` rectangles, and the night lights sonifier. Written by B but not merged: the `Legend` and `NowHearing` components (`b/step5-nowhearing`). Everything still open on this side (mounting the legend, Step 6 checks, README, demo video, the form) is now A's.

## Day 1

### Step 0: Setup, together (about 45 min)

- Create the public GitHub repo and add these docs under `docs/`.
- Scaffold React + Vite + TypeScript, add Tone.js.
- Set up the GitHub Pages workflow and deploy the placeholder page.
- Add `src/types.ts` exactly as in ARCHITECTURE.md.

**Done when:** the public URL shows a page, and both teammates can push.

### Step 1: Walking skeleton (about 1 h 45 min)

The thinnest version of the whole pipeline, with no polish.

- Prepare the lightning clip and poster with ffmpeg.
- FrameSource and Analyser produce `FrameFeatures` from the playing video.
- One sine tone whose pitch follows `meanLuma`, started by a Play button.
- A bare UI shell: track list with one entry, video, Play/Pause.

**Done when:** on the deployed site, pressing Play shows the video and a tone that clearly changes with the picture, and pausing silences it.

### Step 2: Track 1 complete, and the real interface (about 2 h 30 min)

- Lightning sonifier: flash detection, pitch from latitude, pan from longitude, loudness from strength, note cap, master bus with reverb and limiter.
- Jukebox UI: track list, player, description, credit and source link.
- Accessibility baseline: semantic HTML, keyboard control, live-region announcements.
- Mock tracks 2 and 3 in the list so the UI is built for several tracks.

**Done when:** lightning sounds good to both of us with eyes closed, and the whole site is usable by keyboard alone.

### Step 3: Integrate and review, together (about 1 h)

- Merge, deploy, and listen on headphones and on laptop speakers.
- Fix the two or three worst problems.
- Prepare the ocean and night lights clips so Day 2 starts with media ready.

**Day 1 checkpoint:** one finished track on the public site inside the real interface. If we are not here, Day 2 starts by finishing this, and Track 3 becomes the first thing to cut.

## Day 2

### Step 4: Tracks 2 and 3, in parallel (about 2 h 30 min)

- Ocean: regional colour mapped to temperature through the colorbar, slow chords, movement adds shimmer.
- Night lights: brightness drives note density and tempo; the "change" section of the video gets rising or falling tones.
- Each track gets its `ignore` rectangles, description and "listen for" bullets.

**Done when:** all three tracks play on the deployed site and sound clearly different from one another.

### Step 5: Make it learnable (about 1 h)

- Audio legend buttons for each track.
- "What you're hearing" panel driven by `describeNow`.
- About section: how it works, the pixels-not-data caveat, credits, AI-use note.

**Done when:** someone who has not seen the project can explain what one sound means after using the legend.

### Step 6: Test and polish (about 45 min)

- Full run with a screen reader (NVDA on Windows or Orca on Linux) and keyboard only.
- Check Chrome and Firefox, and one phone.
- Check volume levels across tracks and fix loading states.

**Feature freeze at the end of this step.** After it, only bug fixes.

### Step 7: Submission materials (about 1 h 15 min)

- README: what it is, how it works, mapping table, how to run, credits, AI use.
- Record the 30-second demo video with system audio and upload it.
- Write the Summary and Project Details text.

See SUBMISSION.md for the full checklist.

### Step 8: Submit (about 30 min)

- Fill in the form.
- Open every link in a private browser window to confirm it needs no login.
- Submit at least one hour before the deadline.

## Stretch work

Start it only if Step 4 finishes early, and stop at the feature freeze regardless.

1. Track 4: aerosols still image with a sweeping playhead and four instruments.
2. Explore mode with arrow keys.

## What to cut if we fall behind

Cut in this order:

1. Stretch items.
2. The "change" section logic in night lights (keep brightness to density only).
3. The "what you're hearing" panel (keep the legend and the static "listen for" text).
4. Track 3 entirely.

Never cut the accessibility baseline, the deployed public link, or the time reserved for Steps 7 and 8.
