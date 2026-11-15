# Earth Jukebox: How the Picture Becomes Sound

A plain-language explanation of what the app listens to in each visualization and what sound it makes from it. Use it when explaining the project to someone, and as the source for the README's mapping table. The technical contract is in ARCHITECTURE.md; the exact numbers are the constants at the top of each `sonifier.ts`.

## The short version

The app watches the video the way a person would, but very coarsely: about 20 times a second it shrinks the current frame to a tiny grid and measures how bright each square is, what colour it is, and how much it has just changed. A small set of rules, different for each visualization, turns those measurements into notes. Nothing is recorded in advance, and no AI model writes the music. Pause the picture and the sound stops, because there is nothing new to measure.

## From picture to sound, step by step

1. **Shrink the frame.** The current video frame is drawn onto a hidden canvas 64 squares wide and 32 tall. That is 2,048 squares for the whole world map, so one square covers a large patch of the Earth.
2. **Cover what is not the map.** Anything printed on top of the picture, such as a colour bar or a date, is painted black first, so it cannot turn into sound.
3. **Measure each square.** Four numbers per square:

   | Measurement | In plain words |
   | --- | --- |
   | Brightness | How light or dark the square is |
   | Colour (hue) | Which colour it is: red, yellow, green, blue |
   | Colour strength (saturation) | Vivid colour or grey |
   | Change | How much brighter or darker it is than a moment ago |

4. **Apply the track's rules.** Each visualization has its own small rulebook that says which measurement drives which part of the sound. The two written so far are described below.
5. **Play it.** The notes are made by synthesizers in the browser and pass through a little reverb and a limiter, which keeps the volume safe.

## Rules shared by every track

- **Left and right in the picture are left and right in your ears.** On a world map that means west is in the left ear and east is in the right.
- **Only notes from one musical scale are used** (a pentatonic scale, five notes per octave). Any two of those notes sound fine together, so the result is music and not noise.
- **Nothing jumps.** Values are smoothed, and there is a limit of about 12 new notes per second.
- **Sound follows the picture.** Pausing silences it within a fifth of a second. Jumping to another point in the video plays what is there.
- **Each track has a legend.** It is a row of buttons, and each one plays a single example and names what it means. A legend button works before Play has been pressed. If the picture is playing, pressing one pauses it, so the example is heard on its own. The examples are made by the same rules as the track, so a legend sound is exactly what that thing sounds like when the picture plays.

## Track 1: Lightning

The picture is a world map on which lightning appears as sudden bright spots. The app looks for squares that have just become much brighter. Each new flash plays one short plucked note.

| In the picture | In the sound | How to say it |
| --- | --- | --- |
| A square suddenly gets brighter | One short plucked note | "Every pluck is a new flash of lightning." |
| How far up the map the flash is | Pitch: higher up is a higher note (C3 to C6) | "High notes are in the north, low notes in the south." |
| How far left or right it is | Which ear: left side of the map in the left ear | "Flashes over the Americas are on your left, Asia on your right." |
| How big and bright the jump is | Loudness | "A louder pluck is a bigger flash." |
| Many flashes at once | At most about 10 notes a second, the biggest flashes first | "In a storm you hear the strongest strikes, not a blur." |

A flash that keeps glowing for a moment is still one note, not several. A spot that fades makes no sound; only getting brighter counts.

**Legend.** Six buttons, one pluck each:

| Button | What it plays |
| --- | --- |
| Lightning in the north | A high note, in the middle |
| Lightning in the south | A low note, in the middle |
| Lightning in the west | A middle note in the left ear |
| Lightning in the east | The same note in the right ear |
| A small flash | The middle note, quiet |
| A big flash | The middle note, loud |

## Track 2: Sea surface currents and temperature

The picture is a world map where the colour of the water shows its temperature: blue is cold, green and yellow are mild, red is warm. Thin moving lines show the currents. Land is grey.

Instead of single notes, this track holds one slow chord made of six voices. The map is divided into six regions, and each region has its own voice:

```text
            west half (left ear)     east half (right ear)
north       voice 1                  voice 2
tropics     voice 3                  voice 4
south       voice 5                  voice 6
```

For each region the app looks only at the water (grey land is skipped), finds its average colour, and looks that colour up on the picture's own colour bar to get a position between "cold end" and "warm end".

| In the picture | In the sound | How to say it |
| --- | --- | --- |
| The region's water colour, from blue (cold) to red (warm) | Pitch: warm water is a low note, cold water is a high note (A2 to A5) | "Low notes are warm water. High notes are cold water." |
| The same colour | Fullness: warm is louder and richer, cold is quieter and thinner, close to a pure tone | "Warm water sounds full, cold water sounds thin." |
| West or east half of the map | Which ear | "The Americas and the eastern Pacific are on your left; Africa, the Indian Ocean and the western Pacific are on your right." |
| How much of the region is water | How loud that voice is; a region with no water is silent | "A region that is mostly land is quieter." |
| How much the currents are moving in the region | A high, fluttering shimmer on top of that voice's note | "The shimmer is moving water." |

Every 4 seconds the chord is played again: each voice dips, slides to its new note if the water has changed, and swells back, north first, then the tropics, then the south. Notes change only at those moments, which is why it sounds like slow chords and not a siren.

**Legend.** Three buttons, each a single voice that swells in, holds for a second and fades:

| Button | What it plays |
| --- | --- |
| Warm water | A low, full note, the one the tropics hold |
| Cold water | A high, thin note, as cold as any region of this clip gets |
| Moving water | A note in between, with the shimmer at its strongest on top |

**What you hear in this clip.** The clip covers one year. The two tropical voices stay low the whole time, because the tropics stay warm. The two northern voices start high (northern winter), sink as the north warms towards summer in the middle of the clip, and climb back. The two southern voices do the opposite, because the seasons are reversed there. The shimmer is steady and a little stronger in the tropics, because the currents in the picture move at a steady rate.

**One difference from lightning.** In lightning, pitch tells you how far north the flash is. Here pitch tells you temperature, so north and south are told apart by which voice is playing, not by pitch.

## Track 3: Night lights

Not written yet. The plan (VISION.md): the brighter the map, the denser and faster the pattern of notes, with rising or falling tones where a region gained or lost light.

## What it does not do

- **It reads the picture, not the science data.** The sound comes from the colours and brightness of the published video. A note is "about this warm", not a measured temperature.
- **It is coarse.** One square is a large area, and the ocean track averages a whole region into one note. It shows the big pattern, not a single storm or eddy.
- **It is not AI-generated music.** The same frame always gives the same sound, by fixed rules written in this repository.

## If you have 30 seconds

"We shrink each video frame to a tiny grid and measure brightness, colour and change in every square, twenty times a second. Then simple rules turn that into music. For lightning, every new flash is a plucked note: higher on the map is a higher note, left on the map is your left ear, a bigger flash is louder. For the ocean, six slow voices cover six parts of the map: warm water is low and full, cold water is high and thin, and moving currents add a shimmer. Over the clip you can hear the north warm up and cool down again while the south does the opposite. It is all made live in the browser from the picture itself."
