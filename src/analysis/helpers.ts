// Values derived from FrameFeatures. They live here, not in FrameFeatures, so
// the shared type stays small. Only the helpers a track already uses exist:
// findFlashes (lightning), hueToValue and regionValue (ocean).
import type { FrameFeatures, Rect } from '../types.ts';

/** One point on a visualization's colorbar: the hue drawn there and the value it stands for. */
export interface ColorbarStop {
  /**
   * Degrees. Along the bar the hues must run one way only, so a bar that
   * crosses red continues past 0 or 360 (..., 31, 12, -7) instead of wrapping.
   */
  hue: number;
  value: number;
}

/** Stops in order along the bar, at least two, spanning less than a full turn of hue. */
export type Colorbar = readonly ColorbarStop[];

/**
 * Reads a hue back off a colorbar: the value at that hue, interpolated between
 * the two stops around it. A hue the bar does not contain gives the value at
 * whichever end of the bar is nearer round the colour wheel.
 */
export function hueToValue(hue: number, colorbar: Colorbar): number {
  const first = colorbar[0];
  const last = colorbar[colorbar.length - 1];
  const [low, high] = first.hue <= last.hue ? [first, last] : [last, first];
  // The same hue, written as the one number in low.hue .. low.hue + 360.
  const h = hue - 360 * Math.floor((hue - low.hue) / 360);
  if (h > high.hue) {
    return h - high.hue <= low.hue + 360 - h ? high.value : low.value;
  }
  for (let i = 1; i < colorbar.length; i++) {
    const a = colorbar[i - 1];
    const b = colorbar[i];
    if ((h - a.hue) * (h - b.hue) <= 0) {
      return a.hue === b.hue ? a.value : a.value + ((b.value - a.value) * (h - a.hue)) / (b.hue - a.hue);
    }
  }
  return last.value;
}

/** Which cells carry the visualization's colour: not grey (land, captions) and not black (blanked, background). */
export interface ColourMask {
  minSat: number;
  minLuma: number;
}

export interface RegionValue {
  /** Mean colorbar value of the region's coloured cells. 0 when there are none. */
  value: number;
  /** Fraction of the region's cells that are coloured, 0..1. */
  coverage: number;
  /** Mean absolute deltaLuma of the coloured cells, per analysed frame. */
  motion: number;
}

/**
 * What one rectangle of the frame shows: its colour read through the colorbar,
 * how much of it is coloured at all, and how much that part is changing. Each
 * cell is read off the colorbar first and the values are averaged, because
 * averaging hues directly is wrong (hue is circular).
 */
export function regionValue(f: FrameFeatures, rect: Rect, colorbar: Colorbar, mask: ColourMask): RegionValue {
  const { cols, rows } = f;
  const col0 = Math.max(0, Math.round(rect.x * cols));
  const col1 = Math.min(cols, Math.round((rect.x + rect.w) * cols));
  const row0 = Math.max(0, Math.round(rect.y * rows));
  const row1 = Math.min(rows, Math.round((rect.y + rect.h) * rows));
  let coloured = 0;
  let valueSum = 0;
  let motionSum = 0;
  for (let row = row0; row < row1; row++) {
    for (let col = col0; col < col1; col++) {
      const cell = row * cols + col;
      if (f.sat[cell] < mask.minSat || f.luma[cell] < mask.minLuma) continue;
      coloured++;
      valueSum += hueToValue(f.hue[cell], colorbar);
      motionSum += Math.abs(f.deltaLuma[cell]);
    }
  }
  const total = Math.max(0, col1 - col0) * Math.max(0, row1 - row0);
  if (coloured === 0 || total === 0) return { value: 0, coverage: 0, motion: 0 };
  return { value: valueSum / coloured, coverage: coloured / total, motion: motionSum / coloured };
}

export interface Flash {
  /** Centre of the cell, 0..1 from the left edge. */
  x: number;
  /** Centre of the cell, 0..1 from the top edge. */
  y: number;
  col: number;
  row: number;
  /**
   * Total rise in luma over the cell and its eight neighbours. 1 is one cell
   * going from black to white; a flash covering the whole 3x3 block reaches 9.
   */
  strength: number;
}

/**
 * Cells whose luma rose by more than `threshold` since the previous frame, one
 * result per blob: a cell counts only if none of its neighbours rose more.
 * Strongest first. Luma that falls (a flash fading) is ignored.
 */
export function findFlashes(f: FrameFeatures, threshold: number): Flash[] {
  const { cols, rows, deltaLuma } = f;
  const flashes: Flash[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = row * cols + col;
      const rise = deltaLuma[cell];
      if (rise <= threshold) continue;

      let isPeak = true;
      let strength = 0;
      for (let dy = -1; dy <= 1 && isPeak; dy++) {
        const r = row + dy;
        if (r < 0 || r >= rows) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const c = col + dx;
          if (c < 0 || c >= cols) continue;
          const other = r * cols + c;
          const d = deltaLuma[other];
          // On an exact tie the earlier cell wins, so a flat blob gives one flash.
          if (d > rise || (d === rise && other < cell)) {
            isPeak = false;
            break;
          }
          if (d > 0) strength += d;
        }
      }
      if (isPeak) {
        flashes.push({ x: (col + 0.5) / cols, y: (row + 0.5) / rows, col, row, strength });
      }
    }
  }
  return flashes.sort((a, b) => b.strength - a.strength);
}
