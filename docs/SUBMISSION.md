# Earth Jukebox: Submission Checklist

Everything the Space Apps submission form asks for, and what we need to have ready for each field. Fill this in as we go so Step 7 of the build plan is mostly copy and paste.

**Deadline (local event):** `__________` — confirm on Day 1. Aim to submit one hour early.

## Form fields

| Field | Requirement | Our plan | Status |
|---|---|---|---|
| Project Name | A title that describes the project | Open. The form currently shows "Project Cosmic inflation"; decide whether that stays or becomes something that says what the project does. | [ ] |
| Summary | 50–200 words suggested, 1500 characters max: what we built, how it addresses the challenge, why it matters | Write on Day 2 from what actually shipped | [ ] |
| Project Demonstration | Public link to a video of 30 seconds or less, or slides of 7 or fewer. Exceeding either limit loses Global Award eligibility. | 30-second video, since the project is sound | [ ] |
| Project | Public link, no login | Deployed site URL. Put the repo link in the README and the Details text. | [ ] |
| Project Details | How it works, benefits, intended impact, tools and languages, creativity, factors considered | Adapt from VISION.md and the README mapping table | [ ] |
| Use of SI | Select every AI use that applies. Not shown to judges, but AI indicators in the project are. | See "AI use" below | [ ] |
| NASA Data | Name and full URL of every NASA resource used. Required for Global Award eligibility. | See list below | [ ] |
| Space Agency Partner & Other Data | Every other resource, tool, library, font or asset used | See list below | [ ] |
| Verification | Agree to terms; confirm work is original and all external resources are listed | Tick after checking the two lists are complete | [ ] |

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

## NASA data and resources

List only what we actually use in the final project.

| Link text | URL | Used |
|---|---|---|
| Earth Information Center (EIC) Content Database | https://svs.gsfc.nasa.gov/gallery/earth-information-center/ | [ ] |
| Lightning Events Detected from the ISS 2017-2023 | https://svs.gsfc.nasa.gov/5011/ | [ ] |
| Global Sea Surface Currents and Temperature | https://svs.gsfc.nasa.gov/3912/ | [ ] |
| Change in Night Lights between 2012 and 2023 - EIC Version | https://svs.gsfc.nasa.gov/5313/ | [ ] |
| GEOS Aerosols (only if Track 4 ships) | https://svs.gsfc.nasa.gov/5669/ | [ ] |
| Data Sonification: Caldwell 73 (method reference) | https://svs.gsfc.nasa.gov/13786/ | [ ] |

## Other resources and tools

| Link text | URL | Used |
|---|---|---|
| Tone.js | https://tonejs.github.io/ | [ ] |
| React | https://react.dev/ | [ ] |
| Vite | https://vite.dev/ | [ ] |
| FFmpeg | https://ffmpeg.org/ | [ ] |
| Any font, icon set or other asset | add here | [ ] |

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
