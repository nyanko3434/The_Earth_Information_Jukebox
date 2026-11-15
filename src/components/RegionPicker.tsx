import { REGION_PRESETS, regionPhrase } from './regions.ts'
import type { RegionPreset } from './regions.ts'

interface RegionPickerProps {
  /** A preset id, or CUSTOM_REGION. */
  selectedId: string
  onSelect: (preset: RegionPreset) => void
}

/**
 * Chooses which part of the picture is turned into sound. The buttons are the
 * keyboard and screen reader route; the square that follows the pointer over
 * the picture (Player) is an extra for pointer users.
 */
export function RegionPicker({ selectedId, onSelect }: RegionPickerProps) {
  return (
    <section aria-labelledby="region-heading" className="region-picker">
      <h3 id="region-heading">Listen to part of the picture</h3>
      <p id="region-hint">
        Choose an area here, or click the picture to listen through a square: move the pointer to
        move it, scroll to change its size, click again to turn it off. Only what is inside the
        area is turned into sound.
      </p>
      <ul className="legend" aria-describedby="region-hint">
        {REGION_PRESETS.map((preset) => (
          <li key={preset.id}>
            <button
              type="button"
              aria-pressed={selectedId === preset.id}
              onClick={() => onSelect(preset)}
            >
              {preset.label}
            </button>
          </li>
        ))}
      </ul>
      <p className="region-now">Listening to {regionPhrase(selectedId)}.</p>
    </section>
  )
}
