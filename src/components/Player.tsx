import { useRef, useState } from 'react'
import type { PointerEvent, RefObject } from 'react'
import type { Rect, TrackDef } from '../types.ts'

interface PlayerProps {
  track: TrackDef
  videoRef: RefObject<HTMLVideoElement | null>
  isPlaying: boolean
  onToggle: () => void
  descriptionId: string
  /** The part of the picture being listened to; null is the whole picture. */
  region: Rect | null
  /** Called when the visitor has drawn a rectangle on the picture. */
  onRegionDrawn: (rect: Rect) => void
}

/**
 * A drawn rectangle smaller than this is taken for a slip of the hand and
 * ignored. The width is also kept above the span the night lights sonifier
 * reads as a zoomed view (0.15 of the picture).
 */
const MIN_WIDTH = 0.16
const MIN_HEIGHT = 0.1

const percent = (value: number) => `${value * 100}%`

export function Player({
  track,
  videoRef,
  isPlaying,
  onToggle,
  descriptionId,
  region,
  onRegionDrawn,
}: PlayerProps) {
  const poster = track.media.kind === 'video' ? track.media.poster : undefined
  const pictureRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const [drawing, setDrawing] = useState<Rect | null>(null)

  /** Where the pointer is, as 0..1 of the picture's width and height. */
  const place = (event: PointerEvent) => {
    const box = pictureRef.current?.getBoundingClientRect()
    if (!box || box.width === 0 || box.height === 0) return null
    return {
      x: Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)),
      y: Math.min(1, Math.max(0, (event.clientY - box.top) / box.height)),
    }
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const at = place(event)
    if (!at) return
    startRef.current = at
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  /** The rectangle from where the drag began to where the pointer is now. */
  const drawnTo = (event: PointerEvent): Rect | null => {
    const start = startRef.current
    const at = place(event)
    if (!start || !at) return null
    return {
      x: Math.min(start.x, at.x),
      y: Math.min(start.y, at.y),
      w: Math.abs(at.x - start.x),
      h: Math.abs(at.y - start.y),
    }
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = drawnTo(event)
    if (rect) setDrawing(rect)
  }

  // Measured from the release itself: the last move may not have been drawn yet.
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const rect = drawnTo(event)
    if (rect && rect.w >= MIN_WIDTH && rect.h >= MIN_HEIGHT) onRegionDrawn(rect)
    cancel()
  }

  const cancel = () => {
    startRef.current = null
    setDrawing(null)
  }

  const shown = drawing ?? region

  return (
    <div className="player">
      <div
        ref={pictureRef}
        className="player-picture"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={cancel}
      >
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
        {shown && (
          // Decoration only: the chosen area is named in text by the RegionPicker.
          <div
            className="region-outline"
            aria-hidden="true"
            style={{
              left: percent(shown.x),
              top: percent(shown.y),
              width: percent(shown.w),
              height: percent(shown.h),
            }}
          />
        )}
      </div>
      <button type="button" onClick={onToggle}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
    </div>
  )
}
