import type { RefObject } from 'react'
import type { TrackDef } from '../types.ts'

interface PlayerProps {
  track: TrackDef
  videoRef: RefObject<HTMLVideoElement | null>
  isPlaying: boolean
  onToggle: () => void
  descriptionId: string
}

export function Player({ track, videoRef, isPlaying, onToggle, descriptionId }: PlayerProps) {
  const poster = track.media.kind === 'video' ? track.media.poster : undefined

  return (
    <div className="player">
      <video
        ref={videoRef}
        src={track.media.src}
        poster={poster}
        muted
        playsInline
        preload="metadata"
        aria-label={`Visualization: ${track.title}`}
        aria-describedby={descriptionId}
      />
      <button type="button" onClick={onToggle}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
    </div>
  )
}
