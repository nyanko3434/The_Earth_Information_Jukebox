// Analyser: canvas pixels -> FrameFeatures.
import type { FrameFeatures } from '../types.ts';

/** A jump in media time larger than this (or any jump backwards) is a seek or a loop. */
const MAX_FRAME_GAP_SECONDS = 1;

export class Analyser {
  private readonly cols: number;
  private readonly rows: number;
  private prevLuma: Float32Array | null = null;
  private prevTime = 0;

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
  }

  /** Forget the previous frame, so the next one reports no change. */
  reset(): void {
    this.prevLuma = null;
  }

  /**
   * `pixels` must be a whole multiple of the grid in both directions; each
   * block of pixels is averaged into one cell.
   *
   * - luma: Rec. 709 weights on the 0..1 sRGB values (not linearised).
   * - hue, sat: HSV. Hue is meaningless where sat or luma is near 0.
   * - deltaLuma: against the previous call. All zeros on the first frame and on
   *   the first frame after a seek or loop, so a jump is not read as a flash.
   * - Cells under an ignore rectangle arrive black, and count as black in meanLuma.
   *
   * Every call returns fresh arrays, so a caller may keep the result.
   */
  analyse(pixels: ImageData, time: number): FrameFeatures {
    const { cols, rows } = this;
    const { data, width, height } = pixels;
    const k = width / cols;
    if (!Number.isInteger(k) || height !== rows * k) {
      throw new Error(`Analyser: ${width}x${height} pixels do not fit a ${cols}x${rows} grid`);
    }

    const cells = cols * rows;
    const luma = new Float32Array(cells);
    const hue = new Float32Array(cells);
    const sat = new Float32Array(cells);
    const deltaLuma = new Float32Array(cells);
    const perChannel = 1 / (k * k * 255);

    let lumaSum = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Average RGB over the block first; averaging hue directly would be
        // wrong because hue is circular.
        let r = 0;
        let g = 0;
        let b = 0;
        for (let dy = 0; dy < k; dy++) {
          let i = ((row * k + dy) * width + col * k) * 4;
          for (let dx = 0; dx < k; dx++, i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
          }
        }
        r *= perChannel;
        g *= perChannel;
        b *= perChannel;

        const cell = row * cols + col;
        const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        luma[cell] = y;
        lumaSum += y;

        const max = Math.max(r, g, b);
        const range = max - Math.min(r, g, b);
        sat[cell] = max === 0 ? 0 : range / max;
        if (range > 0) {
          let h: number;
          if (max === r) h = ((g - b) / range) % 6;
          else if (max === g) h = (b - r) / range + 2;
          else h = (r - g) / range + 4;
          hue[cell] = (h * 60 + 360) % 360;
        }
      }
    }

    let motionSum = 0;
    const prev = this.prevLuma;
    const gap = time - this.prevTime;
    if (prev && gap >= 0 && gap <= MAX_FRAME_GAP_SECONDS) {
      for (let cell = 0; cell < cells; cell++) {
        const d = luma[cell] - prev[cell];
        deltaLuma[cell] = d;
        motionSum += Math.abs(d);
      }
    }
    this.prevLuma = luma;
    this.prevTime = time;

    return {
      time,
      cols,
      rows,
      luma,
      hue,
      sat,
      deltaLuma,
      meanLuma: lumaSum / cells,
      motion: motionSum / cells,
    };
  }
}
