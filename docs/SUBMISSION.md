# Earth Jukebox: Submission Checklist

Everything the Space Apps submission form asks for, and what we need to have ready for each field. Fill this in as we go so Step 7 of the build plan is mostly copy and paste.

**Deadline (local event):** `2026 Nov 15 11:59pm` — confirm on Day 1. Aim to submit one hour early.

## Form fields

| Field | Requirement | Our plan | Status |
|---|---|---|---|
| Project Name | A title that describes the project | **Earth Jukebox** (decided 2026-11-15; the form showed "Project Cosmic inflation" before) | [ ] |
| Summary | 50–200 words suggested, 1500 characters max: what we built, how it addresses the challenge, why it matters | Text below, under "Text for the form" (195 words, 1122 characters) | [ ] |
| Project Demonstration | Public link to a video of 30 seconds or less, or slides of 7 or fewer. Exceeding either limit loses Global Award eligibility. | 30-second video, since the project is sound | [ ] |
| Project | Public link, no login | Deployed site URL: `https://nyanko3434.github.io/The_Earth_Information_Jukebox/`. Put the repo link in the README and the Details text. | [ ] |
| Project Details | How it works, benefits, intended impact, tools and languages, creativity, factors considered | Text below, under "Text for the form" | [ ] |
| Use of SI | Select every AI use that applies. Not shown to judges, but AI indicators in the project are. | See "AI use" below | [ ] |
| NASA Data | Name and full URL of every NASA resource used. Required for Global Award eligibility. | See list below | [ ] |
| Space Agency Partner & Other Data | Every other resource, tool, library, font or asset used | See list below | [ ] |
| Verification | Agree to terms; confirm work is original and all external resources are listed | Tick after checking the two lists are complete | [ ] |

## Text for the form

Written on 2026-11-15 from what shipped. Paste as is.

### Summary

```text
Earth Jukebox is a web jukebox for NASA Earth Information Center visualizations: pick one and hear it. The sound is generated live in the browser from the visualization's own frames. About twenty times a second the app shrinks the current frame to a 64 by 32 grid, measures brightness, colour and change in each cell, and a small rulebook per track turns that into notes. Lightning flashes become plucked notes placed by their height and left-right position in the picture. Sea surface temperature becomes a slow six-voice chord: warm water is low and full, cold water is high and thin, and moving currents add a shimmer. Night lights become a pulse that quickens as the map brightens, with falling and rising tones for regions that lost or gained light. Each track has an audio legend of buttons that play one sound and name its meaning, a line of text that says what is being heard, and full keyboard control. Blind and low-vision visitors can follow how the planet is changing, and sighted visitors get a second sense. Nothing is pre-recorded and no AI model makes the music: the same frame always gives the same sound.
```

### Project Details

```text
WHAT IT DOES
Earth Jukebox is a static website. The visitor picks one of five clips from three Earth Information Center visualizations (lightning seen from the International Space Station, in three parts; sea surface currents and temperature; change in night lights), learns the sounds from an audio legend, and presses Play. The visitor can also choose one part of the picture, with buttons or with a square that follows the mouse, and hear only that part. The picture and a soundscape made from it run together; pausing the picture silences the sound.

HOW IT WORKS
The video is drawn to a hidden canvas of 64 by 32 cells about 20 times a second. Overlays such as dates and colour bars are blanked first. For every cell the app measures brightness, hue, saturation and change since the last frame. Each track has its own rules:
- Lightning: a cell that suddenly turns more yellow is one plucked note. Higher in the picture is a higher note, left and right in the picture are the left and right ear, a bigger flash is louder. Listening for yellow, not brightness, keeps the white orbit line, clouds and stars silent.
- Ocean: the map is split into six regions, each with one sustained voice. The water colour is read back through the picture's own colour bar: warm is low and full, cold is high and thin. West is left, east is right, and moving currents add a shimmer. Over the clip's year the northern voices sink and rise with the seasons while the southern ones do the opposite.
- Night lights: overall brightness sets how many notes a second. A note's pitch is its latitude and its ear is its longitude. In the change map, orange regions (lost light) play falling tones and purple regions (gained light) play rising tones; a zoomed view gets a short rising phrase.
All pitches come from one pentatonic scale, values are smoothed, new notes are capped at about 12 a second, and everything passes through one reverb and a limiter.

BENEFITS AND INTENDED IMPACT
The visualizations become usable without sight: an audio legend teaches each sound, a text line says what is being heard, every control has a name and works from the keyboard, and state changes are announced through one polite live region. For sighted visitors the sound adds a second channel: the seasons in the ocean track are easier to hear than to see. Because the rules read only the rendered frames, the same approach can be pointed at other visualizations by writing one small rulebook each.

TOOLS AND LANGUAGES
TypeScript, React, Vite, Tone.js (Web Audio), the Canvas 2D API, GitHub Pages and GitHub Actions. FFmpeg was used once to cut and re-encode the clips. No backend, no machine-learning model.

CREATIVITY
The music is not composed and not generated by AI. It is computed from the picture by fixed rules, in the browser, while you watch. Each legend button runs the same rule as the live sound, so the legend cannot drift from the track.

FACTORS CONSIDERED
Accessibility first (semantic HTML, keyboard, live region, contrast, no reliance on colour). Listening comfort (one scale, smoothing, a note cap, balanced levels between tracks, a limiter). Honesty about the method: the app reads the published picture, not the science data, so a note means "about this warm", not a measurement, and the site and README say so. Credits: every track shows its NASA SVS credit line and source link.

LINKS
Site: https://nyanko3434.github.io/The_Earth_Information_Jukebox/
Code: https://github.com/nyanko3434/The_Earth_Information_Jukebox
```

### Use of AI (boxes to select)

Select every option that covers these, in the form's own wording: AI used to write code (Claude Code), and AI used to write planning and documentation text (Claude). Do not select audio, image or video generation: the sound is synthesised by the project's own rules, and the demo is a screen recording.

## Demo video plan (30 seconds maximum)

Screen recording of the deployed site with system audio. Keep the final file at 29 seconds to be safe.

| Time | Content |
|---|---|
| 0–4 s | Title card: project name and one line on the problem |
| 4–12 s | Lightning track playing |
| 12–19 s | Ocean track playing |
| 19–25 s | Night lights track playing |
| 25–29 s | Keyboard and screen-reader use, then the site URL |

Upload to YouTube (unlisted is fine) or Google Drive with "anyone with the link". Test the link in a private window.

### Recording it (Hyprland, PipeWire)

There is no title card image: the site's own heading and intro line are the title, so nothing has to be drawn or generated. Rehearse once, then:

```bash
# 1. Record the monitor the browser is on, with what the speakers play. Stop with Ctrl+C.
#    Monitor names: hyprctl monitors. Audio: the ".monitor" source of the output in use (pactl list short sources).
wf-recorder -o HDMI-A-1 --audio=alsa_output.pci-0000_01_00.1.hdmi-stereo.monitor -f ~/demo-raw.mp4

# 2. Cut 29 seconds starting where the take begins (here 3 s in), H.264 and AAC so it plays everywhere.
ffmpeg -ss 3 -t 29 -i ~/demo-raw.mp4 -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart ~/earth-jukebox-demo.mp4

# 3. Confirm the length is under 30 s.
ffprobe -v error -show_entries format=duration -of csv=p=0 ~/earth-jukebox-demo.mp4
```

Shot list for the take, on the deployed site at browser zoom that shows the heading, the player and the legend: 0–3 s the page as it loads (heading and intro); 3–11 s Lightning, Play; 11–18 s Right arrow to the ocean track, Space; 18–24 s Right arrow to night lights, Space; 24–29 s Tab to a legend button and press it, so keyboard use and the legend are both on screen with the address bar visible.

## NASA data and resources

List only what we actually use in the final project.

| Link text | URL | Used |
|---|---|---|
| Earth Information Center (EIC) Content Database | https://svs.gsfc.nasa.gov/gallery/earth-information-center/ | [x] |
| Lightning Events Detected from the ISS 2017-2023 | https://svs.gsfc.nasa.gov/5011/ | [x] |
| Global Sea Surface Currents and Temperature | https://svs.gsfc.nasa.gov/3912/ | [x] |
| Change in Night Lights between 2012 and 2023 - EIC Version | https://svs.gsfc.nasa.gov/5313/ | [x] |
| GEOS Aerosols (only if Track 4 ships) | https://svs.gsfc.nasa.gov/5669/ | not used: Track 4 was not built, leave it out of the form |
| Data Sonification: Caldwell 73 (method reference) | https://svs.gsfc.nasa.gov/13786/ | [ ] list it only if one of you actually consulted it |

## Other resources and tools

| Link text | URL | Used |
|---|---|---|
| Tone.js | https://tonejs.github.io/ | [x] |
| React | https://react.dev/ | [x] |
| Vite | https://vite.dev/ | [x] |
| TypeScript | https://www.typescriptlang.org/ | [x] |
| Oxlint (linter) | https://oxc.rs/ | [x] |
| GitHub Pages and GitHub Actions (hosting and deploy) | https://pages.github.com/ | [x] |
| FFmpeg (cutting and re-encoding the clips, trimming the demo) | https://ffmpeg.org/ | [x] |
| Node.js and npm | https://nodejs.org/ | [x] |
| Google Chrome (headless, for measuring the sound and checking the page) | https://www.google.com/chrome/ | [x] |
| wf-recorder (screen recording of the demo) | https://github.com/ammen99/wf-recorder | [ ] tick if the demo was recorded with it |
| Claude and Claude Code (Anthropic), see "AI use" | https://www.anthropic.com/claude | [x] |
| Fonts, icon sets, other assets | none: the page uses system fonts and its own favicon | n/a |

Add anything else the moment it enters the repo. The originality confirmation covers every external resource, including open-source ones.

## AI use

We use Claude for planning and Claude Code for writing code. The form's rules for this:

| Rule | What we do |
|---|---|
| Code must acknowledge AI generation in descriptive text and metadata | "Use of AI tools" section in the README; keep the Claude co-author trailer on commits |
| Audio must acknowledge AI generation in descriptive text and metadata | Our audio is synthesised by our own rules at run time, not by a generative AI model. Say this in the README and the About section, and note that the code doing it was written with AI assistance. |
| AI-generated images and videos need a visible watermark | Avoid AI-generated images and video entirely. The demo is a screen recording. |
| No NASA branding in generated content | No NASA logo, flag or mission insignia in the app, repo or demo |

In the form, select every option that matches how we actually used AI. Code written with Claude Code and planning text written with Claude both count.

## Credits

- Show each visualization's credit line, as given on its SVS page, next to the track in the app and in the README.
- Link each track to its SVS source page.

## Final check before submitting

- [ ] Site opens in a private window with no login, and all tracks play
- [ ] Repo is public
- [ ] Demo link opens in a private window and is 30 seconds or less
- [ ] All URLs in the form are complete, starting with `https://`
- [ ] NASA and other resource lists match what is in the repo
- [ ] README has the mapping table, credits and AI-use section
- [ ] No NASA logo anywhere
