// Shared interfaces. The contract between the sound half and the UI half.
// Mirrors docs/ARCHITECTURE.md; change only by agreement between both teammates.
import type { ToneAudioNode } from 'tone';

export type MediaDef =
  | { kind: 'video'; src: string; poster: string }
  | { kind: 'image'; src: string; scanSeconds: number }; // playhead sweeps left to right

export interface Rect { x: number; y: number; w: number; h: number } // all 0..1

export interface FrameFeatures {
  time: number;             // seconds into the track
  cols: number;
  rows: number;
  luma: Float32Array;       // per cell, 0..1, row-major, row 0 = top
  hue: Float32Array;        // per cell, 0..360
  sat: Float32Array;        // per cell, 0..1
  deltaLuma: Float32Array;  // per cell, change since previous frame (signed)
  meanLuma: number;         // 0..1
  motion: number;           // mean absolute deltaLuma, 0..1
  scanX?: number;           // 0..1, only for still images
}

export interface LegendItem {
  id: string;
  label: string;            // "Lightning in the far north"
  play(): void;             // plays that sound once
}

export interface Sonifier {
  start(): void;                   // build and connect nodes; called after the audio context is unlocked
  update(f: FrameFeatures): void;  // called for every analysed frame
  pause(): void;                   // release everything quickly
  dispose(): void;
  legend: LegendItem[];
  describeNow?(f: FrameFeatures): string; // one short sentence for the NowHearing panel
}

export interface TrackDef {
  id: string;
  title: string;
  media: MediaDef;
  credit: string;            // credit line as given on the SVS page
  sourceUrl: string;         // SVS page URL
  description: string;       // plain language, what the visualization shows
  listenFor: string[];       // 2-4 bullets on how to read the sound
  grid: { cols: number; rows: number };
  ignore?: Rect[];           // overlays to blank out before analysis (dates, colorbars, captions)
  createSonifier(output: ToneAudioNode): Sonifier; // import type { ToneAudioNode } from 'tone'
}
