import type { TrackDef } from '../types.ts';

interface TrackListProps {
  tracks: TrackDef[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function TrackList({ tracks, selectedId, onSelect }: TrackListProps) {
  return (
    <nav aria-label="Tracks">
      <ul>
        {tracks.map((track) => (
          <li key={track.id}>
            <button
              type="button"
              aria-current={track.id === selectedId ? 'true' : undefined}
              onClick={() => onSelect(track.id)}
            >
              {track.title}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
