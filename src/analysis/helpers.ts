// Values derived from FrameFeatures. They live here, not in FrameFeatures, so
// the shared type stays small. Only the helpers a track already uses exist.
import type { FrameFeatures } from '../types.ts';

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
