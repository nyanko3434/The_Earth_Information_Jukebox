# Earth Jukebox

A web jukebox for NASA Earth Information Center visualizations: pick one and hear it. The sound is made live in your browser from the visualization's own frames, so the changing Earth can be listened to as well as seen.

**Try it:** <https://nyanko3434.github.io/The_Earth_Information_Jukebox/> (no login, headphones recommended)

Built for the NASA Space Apps Challenge 2026, challenge "The Earth Information Jukebox".

## Why

Earth Information Center visualizations show how the planet is changing, but only to people who can see them. Blind and low-vision people are left out, and everyone else gets one sense where two would carry more. Earth Jukebox gives each visualization a soundscape that follows the picture, and a way to learn what each sound means.

## Using it

1. Pick one of the three tracks.
2. Read what it shows and the "Listen for" notes.
3. Press the buttons of the **audio legend**. Each plays one sound on its own and names what it means ("Lightning in the north", "Warm water", "A region that lost light"). They work before Play.
4. Press **Play**. The line under the player, "What you are hearing", says in words what the sound is doing now.

Keyboard: Tab reaches every control, Space plays and pauses, Left and Right change track. Play state and track changes are announced through one polite live region.

## How it works

```text
video -> tiny canvas (64x32 cells) -> measurements per cell -> the track's rules -> Tone.js synths -> reverb -> limiter
         about 20 times a second       brightness, colour,      one small rulebook
                                       saturation, change       per visualization
```

- About twenty times a second the current video frame is shrunk to a small grid. Anything printed over the picture (a date, a colour bar) is blanked first, so it cannot become sound.
- For each cell the app measures brightness, hue, saturation and how much the brightness has just changed.
- Each track has its own rules that turn those measurements into notes. Every pitch comes from one pentatonic scale, values are smoothed, and there are never more than about 12 new notes a second.
- The sound follows the picture. Pausing silences it within a fifth of a second; jumping to another point plays what is there.
- Nothing is pre-recorded, there is no backend, and no AI model makes the music. The same frame always gives the same sound.

A longer plain-language explanation is in [`docs/PICTURE_TO_SOUND.md`](docs/PICTURE_TO_SOUND.md); the technical contract is [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## What you hear: the mappings

### Track 1: Lightning from the ISS

The picture is the Earth seen from space, turning slowly, with lightning as small yellow dots. The app listens for cells that have just become more yellow (not just brighter: the white orbit line, clouds and stars stay silent).

| In the picture | In the sound |
| --- | --- |
| A cell suddenly gets more yellow | One short plucked note |
| How far up the picture the flash is (north is up) | Pitch: higher up is a higher note (C3 to C6) |
| How far left or right it is | Left or right ear |
| How big the jump in yellow is | Loudness |
| Many flashes at once | At most about 10 notes a second, the biggest first |

Legend: lightning in the north, in the south, on the left of the picture, on the right of the picture, a small flash, a big flash.

### Track 2: Sea surface currents and temperature

A flat world map where the colour of the water is its temperature. The map is divided into six regions (north, tropics and south, each split into west and east), and each region has one sustained voice.

| In the picture | In the sound |
| --- | --- |
| The region's water colour, read off the picture's own colour bar | Pitch: warm water is low, cold water is high (A2 to A5) |
| The same colour | Fullness: warm is louder and richer, cold is quieter and close to a pure tone |
| West or east half of the map | Left or right ear |
| How much of the region is water | How loud that voice is; a region of land is silent |
| How much the currents are moving | A high, fluttering shimmer on that voice's note |

The chord is struck again every 4 seconds, north first. Over the clip's one year you can hear the north warm up and cool down while the south does the opposite. Legend: warm water, cold water, moving water.

### Track 3: Night lights 2012–2023

A flat world map of the Earth's lights at night: yearly averages, then a change map (orange for regions that lost light, purple for regions that gained it), then zoomed views.

| In the picture | In the sound |
| --- | --- |
| How bright the map is overall | How many notes a second (about 3 to 8), and how loud |
| How far up or down a lit cell is | Pitch: north is high (C4 to C6) |
| How far left or right it is | Left or right ear |
| An orange cell in the change map | A falling tone: that region lost light |
| A purple cell in the change map | A rising tone: that region gained light |
| A zoomed-in view | A short rising three-note phrase |

Legend: a light in the north, a light in the south, a region that lost light, a region that gained light, a zoomed-in view.

## Limits, stated plainly

- **It reads the picture, not the science data.** The sound comes from the colours and brightness of the published videos. A note means "about this warm", not a measured temperature.
- **It is coarse.** One cell covers a large area, and the ocean track averages a whole region into one note. You hear the large pattern, not a single storm.
- **Lightning's left and right are the picture's**, not west and east on a map, because that visualization is a turning globe.
- **Testing.** Built and checked in Chrome on Linux, by measurement in headless Chrome and by ear. Firefox, phones and screen readers have not been tested by us. The page was checked for accessible names on every control, one `main` landmark, one live region, heading order and text contrast (lowest 6.2:1), and for keyboard use.

## Run it locally

Needs Node.js and npm.

```bash
npm install
npm run dev      # dev server at http://localhost:5173/The_Earth_Information_Jukebox/
npm run build    # type-check and build to dist/
npm run preview  # serve the built site
npm run lint     # oxlint
```

A dev-only page for the sound pipeline is at `/The_Earth_Information_Jukebox/src/analysis/dev/harness.html` while `npm run dev` runs (see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), "Dev harness").

## Where things are

| Path | What |
| --- | --- |
| `src/analysis/` | Frame to grid to measurements |
| `src/audio/` | The engine the page calls, the master bus, the scale |
| `src/tracks/<id>/` | Per track: `track.ts` (text, credit, source) and `sonifier.ts` (the rules) |
| `src/components/`, `src/a11y/` | The page: track list, player, legend, "What you are hearing", About, live region |
| `public/media/` | The three clips and their poster frames |
| `docs/` | Vision, architecture, build plan, project log, submission notes |

## Credits

The visualizations are from NASA's Scientific Visualization Studio, found through the [Earth Information Center content database](https://svs.gsfc.nasa.gov/gallery/earth-information-center/). The clips were cut and re-encoded with FFmpeg; the pictures are otherwise unchanged.

| Track | Source | Credit |
| --- | --- | --- |
| Lightning from the ISS | [Lightning Events Detected from the ISS 2017-2023, SVS 5011](https://svs.gsfc.nasa.gov/5011/) | NASA's Scientific Visualization Studio — visualizers Michala Garrison (SSAI), Greg Shirah (NASA/GSFC), Kel Elkins (USRA) and Alex Kekesi (Global Science and Technology, Inc.) |
| Sea surface currents and temperature | [Global Sea Surface Currents and Temperature, SVS 3912](https://svs.gsfc.nasa.gov/3912/) | NASA/Goddard Space Flight Center Scientific Visualization Studio — animators Greg Shirah and Horace Mitchell (NASA/GSFC) and Eric Sokolowsky (Global Science and Technology, Inc.); producer Michael Starobin (HTSI); scientists Hong Zhang (UCLA) and Dimitris Menemenlis (NASA/JPL CalTech) |
| Night lights 2012–2023 | [Change in Night Lights between 2012 and 2023 - EIC Version, SVS 5313](https://svs.gsfc.nasa.gov/5313/) | NASA's Scientific Visualization Studio — visualizer Kel Elkins (USRA); scientists Zhuosen Wang (University of Maryland), Miguel Román (Leidos), Ranjay Shrestha (SSAI), Srija Chakraborty (USRA) and Virginia Kalb (NASA) |

Built with [Tone.js](https://tonejs.github.io/), [React](https://react.dev/), [Vite](https://vite.dev/), [TypeScript](https://www.typescriptlang.org/) and [Oxlint](https://oxc.rs/), and hosted on [GitHub Pages](https://pages.github.com/).

This project is not affiliated with or endorsed by NASA.

## Use of AI tools

- Planning documents were written with the help of Claude (Anthropic).
- Code in this repository was written with the help of Claude Code. Commits containing AI-written code carry a `Co-Authored-By: Claude` trailer.
- The sound is synthesised at run time by rules written in this repository. It is not produced by a generative AI model, and no audio is pre-recorded.
- No AI-generated images or video are used. The demo is a screen recording of the site.

## Licence

MIT. See [`LICENSE`](LICENSE).
