// Engine: the one thing the UI shell calls. Wires
// video -> FrameSource -> Analyser -> Sonifier -> master bus.
// Usage is documented in docs/ARCHITECTURE.md ("Engine API").
import { start as startAudio } from 'tone';
import { Analyser } from '../analysis/analyser.ts';
import { FrameSource } from '../analysis/frameSource.ts';
import type { FrameFeatures, LegendItem, TrackDef } from '../types.ts';
import { getMasterBus, setMasterAudible } from './master.ts';

/** With no analysed frame for this long while playing, the sound is paused (stall, hidden tab). */
const STALL_MS = 250;
/**
 * After a legend button is pressed the master bus stays open this long, whether
 * or not the picture is playing. A legend sound is over within 2 s; the rest is
 * for its reverb tail.
 */
const LEGEND_HOLD_MS = 3000;

export interface Engine {
  /** Call inside the Play click handler: unlocks audio, starts the sonifier, plays the video. */
  play(): Promise<void>;
  /** Pauses the video and silences the sound. */
  pause(): void;
  /** Called with every analysed frame while the video plays. Returns an unsubscribe function. */
  onFeatures(cb: (f: FrameFeatures) => void): () => void;
  /** Call on track change or unmount. The engine cannot be used afterwards. */
  dispose(): void;
  /**
   * The track's audio legend, ready to list before Play has been pressed. Call
   * an item's `play()` directly inside its button's click handler: it pauses
   * the picture, unlocks audio if needed and plays that one sound.
   */
  readonly legend: LegendItem[];
}

export interface EngineOptions {
  video: HTMLVideoElement;
  track: Pick<TrackDef, 'grid' | 'ignore' | 'createSonifier'>;
}

export function createEngine({ video, track }: EngineOptions): Engine {
  const source = new FrameSource(video, track.grid, track.ignore);
  const analyser = new Analyser(track.grid.cols, track.grid.rows);
  const subscribers = new Set<(f: FrameFeatures) => void>();
  // The sonifier object exists from the start, so that its legend can be listed
  // before Play. Its audio nodes are built in start(), on the first gesture.
  const sonifier = track.createSonifier(getMasterBus());
  let started = false;
  let disposed = false;
  let watchdog: number | undefined;
  // Whether this engine has opened the master bus for the picture. Closed on
  // every pause, so a reverb tail cannot outlast the picture.
  let audible = false;
  // Set while a legend sound has the bus open.
  let legendHold: number | undefined;

  const unlock = async () => {
    await startAudio();
    if (disposed || started) return;
    started = true;
    sonifier.start();
  };

  const silence = () => {
    window.clearTimeout(watchdog);
    if (started) sonifier.pause();
    audible = false;
    // A legend sound in progress keeps the bus open; the end of its hold closes it.
    if (legendHold === undefined) setMasterAudible(false);
  };

  // Covers Play pressed on the video's own controls. Stays pending, harmlessly,
  // if the browser does not count that as a gesture.
  const onVideoPlay = () => {
    unlock().catch(() => {});
  };

  const legend: LegendItem[] = sonifier.legend.map((item) => ({
    id: item.id,
    label: item.label,
    play() {
      if (disposed) return;
      // The hold starts first, so that pausing the picture does not close the bus.
      window.clearTimeout(legendHold);
      const hold = window.setTimeout(() => {
        legendHold = undefined;
        if (!audible) setMasterAudible(false);
      }, LEGEND_HOLD_MS);
      legendHold = hold;
      // The example is heard alone, not over the track.
      if (!video.paused) {
        silence();
        video.pause();
      }
      // Still synchronous inside the click, so this counts as the gesture.
      unlock()
        .then(() => {
          // Not an answer to this click any more if its hold has ended or a later press has taken over.
          if (disposed || legendHold !== hold) return;
          setMasterAudible(true);
          item.play();
        })
        .catch(() => {});
    },
  }));

  source.start((pixels, time) => {
    // A frame can still arrive just after pause; it must not restart the sound.
    if (video.paused || video.ended) return;
    const features = analyser.analyse(pixels, time);
    if (started) {
      if (!audible) {
        setMasterAudible(true);
        audible = true;
      }
      sonifier.update(features);
    }
    for (const cb of subscribers) cb(features);
    window.clearTimeout(watchdog);
    watchdog = window.setTimeout(silence, STALL_MS);
  });
  video.addEventListener('play', onVideoPlay);
  video.addEventListener('pause', silence);
  video.addEventListener('ended', silence);

  return {
    legend,

    async play() {
      if (disposed) return;
      // Both calls are made synchronously, while the click still counts as a gesture.
      await Promise.all([unlock(), video.play()]);
    },

    pause() {
      silence();
      video.pause();
    },

    onFeatures(cb) {
      subscribers.add(cb);
      return () => {
        subscribers.delete(cb);
      };
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      source.stop();
      window.clearTimeout(watchdog);
      window.clearTimeout(legendHold);
      legendHold = undefined;
      video.removeEventListener('play', onVideoPlay);
      video.removeEventListener('pause', silence);
      video.removeEventListener('ended', silence);
      subscribers.clear();
      setMasterAudible(false);
      sonifier.dispose();
    },
  };
}
