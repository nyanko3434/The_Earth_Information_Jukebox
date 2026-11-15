import type { LegendItem } from '../types.ts';

interface LegendProps {
  /** `engine.legend`: one item per sound, playable before Play has been pressed. */
  items: LegendItem[];
}

/**
 * The audio legend: one button per sound, named by what the sound means.
 * A press is not announced: the engine pauses the picture, the shell announces
 * that pause as usual, and more speech would cover the example.
 */
export function Legend({ items }: LegendProps) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="legend-heading">
      <h3 id="legend-heading">Audio legend</h3>
      <p id="legend-hint">Each button plays one sound on its own. If the picture is playing, it pauses first.</p>
      <ul className="legend" aria-describedby="legend-hint">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              // Called directly in the click: the press is the gesture that unlocks audio.
              onClick={() => item.play()}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
