// FrameSource: draws the current video frame to a small hidden canvas and hands
// the pixels to a callback about 20 times per second.
import type { Rect } from '../types.ts';

/** Largest analysis canvas allowed (ARCHITECTURE, "Analysis rules"). */
const MAX_WIDTH = 96;
const MAX_HEIGHT = 48;
/** Target gap between analysed frames: 50 ms is 20 Hz. */
const FRAME_INTERVAL_MS = 50;
/** Frame timestamps jitter by a millisecond or two; without slack a frame that is due gets skipped. */
const SLACK_MS = 4;

const hasVideoFrameCallback =
  typeof HTMLVideoElement !== 'undefined' &&
  'requestVideoFrameCallback' in HTMLVideoElement.prototype;

export type FrameHandler = (pixels: ImageData, time: number) => void;

export class FrameSource {
  /** Never attached to the document. `cols * scale` by `rows * scale` pixels. */
  readonly canvas: HTMLCanvasElement;
  /** Canvas pixels per grid cell along each axis. The Analyser averages each block. */
  readonly scale: number;

  private readonly video: HTMLVideoElement;
  private readonly ignore: Rect[];
  private readonly ctx: CanvasRenderingContext2D;
  private handler: FrameHandler | null = null;
  private handle = 0;
  private nextDue = 0;

  constructor(
    video: HTMLVideoElement,
    grid: { cols: number; rows: number },
    ignore: Rect[] = [],
  ) {
    const { cols, rows } = grid;
    if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 1 || rows < 1) {
      throw new Error(`FrameSource: grid must be whole numbers of at least 1, got ${cols}x${rows}`);
    }
    if (cols > MAX_WIDTH || rows > MAX_HEIGHT) {
      throw new Error(`FrameSource: grid ${cols}x${rows} is larger than ${MAX_WIDTH}x${MAX_HEIGHT}`);
    }
    this.video = video;
    this.ignore = ignore;
    this.scale = Math.min(Math.floor(MAX_WIDTH / cols), Math.floor(MAX_HEIGHT / rows));

    this.canvas = document.createElement('canvas');
    this.canvas.width = cols * this.scale;
    this.canvas.height = rows * this.scale;
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('FrameSource: 2D canvas context is not available');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#000';
    this.ctx = ctx;
  }

  /**
   * Draws the current frame, blanks the ignore rectangles to black, and returns
   * the pixels. Returns null while the video has no frame to draw.
   */
  capture(): ImageData | null {
    if (this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;
    const { width, height } = this.canvas;
    this.ctx.drawImage(this.video, 0, 0, width, height);
    for (const r of this.ignore) {
      const x0 = Math.floor(r.x * width);
      const y0 = Math.floor(r.y * height);
      const x1 = Math.ceil((r.x + r.w) * width);
      const y1 = Math.ceil((r.y + r.h) * height);
      this.ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
    return this.ctx.getImageData(0, 0, width, height);
  }

  /** Starts the frame loop. `time` passed to the handler is seconds into the media. */
  start(handler: FrameHandler): void {
    if (this.handler) return;
    this.handler = handler;
    this.nextDue = 0;
    this.schedule();
  }

  stop(): void {
    if (!this.handler) return;
    this.handler = null;
    if (hasVideoFrameCallback) this.video.cancelVideoFrameCallback(this.handle);
    else cancelAnimationFrame(this.handle);
  }

  private schedule(): void {
    if (hasVideoFrameCallback) {
      // Fires once per frame the video presents, so it is idle while paused.
      this.handle = this.video.requestVideoFrameCallback((now, meta) => {
        this.tick(now, meta.mediaTime);
      });
    } else {
      this.handle = requestAnimationFrame((now) => {
        if (this.video.paused || this.video.ended) this.schedule();
        else this.tick(now, this.video.currentTime);
      });
    }
  }

  private tick(now: number, time: number): void {
    if (!this.handler) return;
    this.schedule();
    if (now + SLACK_MS < this.nextDue) return;
    // Keep to a 50 ms grid so a 30 fps clip averages 20 Hz (two frames in
    // three) instead of 15. Re-anchor after a gap, such as a pause.
    this.nextDue =
      now - this.nextDue > FRAME_INTERVAL_MS ? now + FRAME_INTERVAL_MS : this.nextDue + FRAME_INTERVAL_MS;
    const pixels = this.capture();
    if (pixels) this.handler(pixels, time);
  }
}
