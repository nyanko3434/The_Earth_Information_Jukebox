// The named parts of the picture the visitor can listen to, shared by the Jukebox and the RegionPicker.
import type { Rect } from '../types.ts'

/** A named part of the picture. `rect` null is the whole picture. */
export interface RegionPreset {
  id: string
  label: string
  /** Completes "Listening to …". */
  phrase: string
  rect: Rect | null
}

export const REGION_PRESETS: RegionPreset[] = [
  { id: 'whole', label: 'Whole picture', phrase: 'the whole picture', rect: null },
  { id: 'west', label: 'Left half', phrase: 'the left half of the picture', rect: { x: 0, y: 0, w: 0.5, h: 1 } },
  { id: 'east', label: 'Right half', phrase: 'the right half of the picture', rect: { x: 0.5, y: 0, w: 0.5, h: 1 } },
  { id: 'north', label: 'Top half', phrase: 'the top half of the picture', rect: { x: 0, y: 0, w: 1, h: 0.5 } },
  { id: 'south', label: 'Bottom half', phrase: 'the bottom half of the picture', rect: { x: 0, y: 0.5, w: 1, h: 0.5 } },
  { id: 'centre', label: 'Centre', phrase: 'the centre of the picture', rect: { x: 0.25, y: 0.25, w: 0.5, h: 0.5 } },
]

/**
 * Tracks on which the square must keep a minimum width, as a fraction of the
 * picture's width, by track id. The night lights sonifier takes bright cells
 * within less than 0.15 of the width for a zoomed view, and a narrower square
 * would set that off.
 */
export const MIN_SQUARE_WIDTH: Record<string, number> = { nightlights: 0.16 }

/** Stands for the square that follows the pointer over the picture. */
export const CUSTOM_REGION = 'custom'

/** "Listening to …" for a preset id or the square. */
export function regionPhrase(id: string): string {
  return REGION_PRESETS.find((preset) => preset.id === id)?.phrase ?? 'a square on the picture'
}
