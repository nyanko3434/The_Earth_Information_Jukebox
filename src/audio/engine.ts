// Engine: the one thing the UI shell calls. Wires
// video -> FrameSource -> Analyser -> Sonifier -> master bus.
// Usage is documented in docs/ARCHITECTURE.md ("Engine API").
import { start as startAudio } from 'tone';
import { Analyser } from '../analysis/analyser.ts';
import { FrameSource } from '../analysis/frameSource.ts';
import type { FrameFeatures, Sonifier, TrackDef } from '../types.ts';
import { getMasterBus } from './master.ts';

/** With no analysed frame for this long while playing, the sound is paused (stall, hidden tab). */
const STALL_MS = 250;

export interface Engine {
  /** Call inside the Play click handler: unlocks audio, starts the sonifier, plays the video. */
  play(): Promise<void>;
  /** Pauses the video and silences the sound. */
  pause(): void;
  /** Called with every analysed frame while the video plays. Returns an unsubscribe function. */
  onFeatures(cb: (f: FrameFeatures) => void): () => void;
  /** Call on track change or unmount. The engine cannot be used afterwards. */
  dispose(): void;
}

export interface EngineOptions {
  video: HTMLVideoElement;
  track: Pick<TrackDef, 'grid' | 'ignore' | 'createSonifier'>;
}

export function createEngine({ video, track }: EngineOptions): Engine {
  const source = new FrameSource(video, track.grid, track.ignore);
  const analyser = new Analyser(track.grid.cols, track.grid.rows);
  const subscribers = new Set<(f: FrameFeatures) => void>();
  let sonifier: Sonifier | null = null;
  let disposed = false;
  let watchdog: number | undefined;

  // Audio nodes are built here, on the first Play, never at creation.
  const unlock = async () => {
    await startAudio();
    if (disposed || sonifier) return;
    sonifier = track.createSonifier(getMasterBus());
    sonifier.start();
  };

  const silence = () => {
    window.clearTimeout(watchdog);
    sonifier?.pause();
  };

  // Covers Play pressed on the video's own controls. Stays pending, harmlessly,
  // if the browser does not count that as a gesture.
  const onVideoPlay = () => {
    unlock().catch(() => {});
  };

  source.start((pixels, time) => {
    // A frame can still arrive just after pause; it must not restart the sound.
    if (video.paused || video.ended) return;
    const features = analyser.analyse(pixels, time);
    sonifier?.update(features);
    for (const cb of subscribers) cb(features);
    window.clearTimeout(watchdog);
    watchdog = window.setTimeout(silence, STALL_MS);
  });
  video.addEventListener('play', onVideoPlay);
  video.addEventListener('pause', silence);
  video.addEventListener('ended', silence);

  return {
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
      video.removeEventListener('play', onVideoPlay);
      video.removeEventListener('pause', silence);
      video.removeEventListener('ended', silence);
      subscribers.clear();
      sonifier?.dispose();
      sonifier = null;
    },
  };
}
