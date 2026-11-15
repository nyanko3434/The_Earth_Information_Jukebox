import type { LegendItem } from '../types.ts';

interface LegendProps {
  items: LegendItem[];
  onPlay: (label: string) => void;
}

export function Legend({ items, onPlay }: LegendProps) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="legend-heading">
      <h3 id="legend-heading">Audio legend</h3>
      <ul className="legend">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => {
                item.play();
                onPlay(item.label);
              }}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
