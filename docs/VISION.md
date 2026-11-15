# Earth Jukebox: Vision

NASA Space Apps Challenge 2026, "The Earth Information Jukebox". Team of two. Working title only; the final project name is still open (see SUBMISSION.md).

## In one sentence

A web jukebox where you pick a NASA Earth Information Center (EIC) visualization and hear it: the soundscape is generated live in the browser from the visualization's own frames.

## The problem

EIC visualizations show how the planet is changing, but only to people who can see them. Blind and low-vision people are left out, and everyone else gets one sense where two would carry more.

## Who it is for

1. Blind and low-vision people who want to experience Earth science directly, not through a second-hand description.
2. Students, museum visitors and the general public, for whom sound adds pattern and feeling that the picture alone does not.

## What a visitor does

1. Opens the site and finds a short list of tracks, like records in a jukebox.
2. Chooses a track and gets a plain-language description of what the visualization shows.
3. Plays the audio legend to learn the sounds ("this is a lightning strike in the north", "this is warm water").
4. Presses play. The visualization and its soundscape run together.
5. Follows a "what you're hearing" panel that explains the mapping while it plays.

Every step works with a keyboard and a screen reader.

## Principles

1. **Live from the frames.** Nothing is pre-recorded. Pause the picture and the sound stops; seek and the sound follows.
2. **Musical, not noisy.** Notes are locked to a scale, values are smoothed, and the number of notes per second is capped.
3. **One ruleset per track.** A shared engine reads the frames; each track has its own mapping suited to what it shows.
4. **Learnable.** After the legend and ten seconds of listening, a visitor should be able to say what a sound means.
5. **Accessible by default.** Accessibility is part of every feature, not a final pass.
6. **Honest.** We sonify the rendered pixels of the visualization, not the original science data, and we document every mapping.

## Tracks

| # | Track | Source | What we read from the frames | What you hear |
|---|---|---|---|---|
| 1 | Lightning from the ISS | Video, [SVS 5011](https://svs.gsfc.nasa.gov/5011/) | Sudden bright flashes and where they are | Short plucked notes: pitch from height in the picture (north is up), left/right from position in the picture, loudness from flash size. The clip is a turning globe, not a flat map |
| 2 | Sea surface currents and temperature | Video, [SVS 3912](https://svs.gsfc.nasa.gov/3912/) | Colour (temperature) per region, amount of movement | Slow chords: warm water is lower and fuller, cold water is higher and thinner, movement adds shimmer |
| 3 | Night lights 2012–2023 | Video, [SVS 5313](https://svs.gsfc.nasa.gov/5313/) | Brightness and how it changes | A pattern of notes that gets denser and faster as the map gets brighter |
| 4 (stretch) | GEOS aerosols | Still image, [SVS 5669](https://svs.gsfc.nasa.gov/5669/) | Four colours: sea salt (blue), dust (pink), smoke (orange/red), sulfates (green) | A playhead sweeps across the map; each aerosol type is its own instrument |

Track 4 is a stretch goal because its source is a single still image, so it needs a second playback mode (a sweeping playhead) that the other three do not.

## Scope

**Committed**

- Three tracks (1–3), each with its own ruleset.
- Jukebox interface: track list, player, description, audio legend, "what you're hearing" panel.
- Keyboard and screen-reader support throughout.
- Public deployed site, public repository, 30-second demo video.

**Stretch, in this order**

1. Track 4 (aerosols, still-image sweep).
2. Explore mode: move a cursor over the map with arrow keys and hear the value at that spot.
3. A user control for the musical scale or mood.

**Out of scope**

- Any backend or user accounts.
- Uploading your own image or video.
- Machine-learning models.
- Reading the original science data files.

## Definition of done

- A public link opens the site with no login, and three tracks play with sound that follows the picture.
- A person using only a keyboard and a screen reader can choose a track, learn its sounds and play it.
- Each track's mapping is explained in the app and in the README.
- The submission form is complete, including NASA data links and the AI-use disclosure.
