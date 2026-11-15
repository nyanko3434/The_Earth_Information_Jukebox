export function About() {
  return (
    <section aria-labelledby="about-heading">
      <h2 id="about-heading">About Earth Jukebox</h2>
      <p>
        Earth Jukebox turns NASA Earth Information Center visualizations into sound, live in your
        browser. Pick a track, read what it shows, learn its sounds from the legend, then press play.
      </p>

      <h3>How the sound is made</h3>
      <p>
        Each visualization is drawn frame by frame to a small hidden canvas. We read the pixels of
        that image and turn them into notes: brightness, colour and movement become pitch, harmony
        and rhythm. Nothing is pre-recorded. Pause the picture and the sound stops; the sound and
        the picture always run together. You can also listen to one part of the picture: choose an
        area under the legend, or click the picture and move the square that appears.
      </p>
      <p>
        We sonify the rendered pixels of the visualization, not the original science data. The
        mapping for each track is written down in the app and in the project README.
      </p>

      <h3>Credits</h3>
      <p>
        Visualizations are from NASA&rsquo;s Scientific Visualization Studio: Lightning Events
        Detected from the International Space Station 2017&ndash;2023 (SVS 5011), Global Sea Surface
        Currents and Temperature (SVS 3912), and Change in Night Lights 2012&ndash;2023 (SVS 5313).
        Each track shows its own credit line and a link to its source page.
      </p>
    </section>
  );
}
