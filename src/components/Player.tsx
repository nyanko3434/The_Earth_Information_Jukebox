import { useEffect, useRef } from 'react'
import type { PointerEvent, RefObject } from 'react'
import type { Rect, TrackDef } from '../types.ts'

interface PlayerProps {
  track: TrackDef
  videoRef: RefObject<HTMLVideoElement | null>
  isPlaying: boolean
  onToggle: () => void
  descriptionId: string
  /** The part of the picture being listened to, drawn as an outline; null is the whole picture. */
  region: Rect | null
  /** Whether the square that follows the pointer is on. */
  squareOn: boolean
  /** A click on the picture: the square to turn on, or null to turn it off. */
  onSquareToggle: (rect: Rect | null) => void
  /** The square has moved or changed size. Called on every pointer move while it is on. */
  onSquareChange: (rect: Rect) => void
  /** The square is never narrower than this fraction of the picture's width. 0 for no such limit. */
  minSquareWidth: number
}

/** The square's side as a fraction of the picture's height, when first turned on. */
const START_SIDE = 0.4
/** Smallest side, as a fraction of the picture's height: about five rows of a 32-row grid. */
const MIN_SIDE = 0.15
/** One notch of the wheel changes the side by this factor. */
const WHEEL_STEP = 1.1
/** A press and release within this many pixels is a click; farther is a drag. */
const CLICK_SLOP_PX = 6

const percent = (value: number) => `${value * 100}%`
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

export function Player({
  track,
  videoRef,
  isPlaying,
  onToggle,
  descriptionId,
  region,
  squareOn,
  onSquareToggle,
  onSquareChange,
  minSquareWidth,
}: PlayerProps) {
  const poster = track.media.kind === 'video' ? track.media.poster : undefined
  const pictureRef = useRef<HTMLDivElement>(null)
  // The square: its centre in 0..1 of the picture, and its side as a fraction of the height.
  const centreRef = useRef({ x: 0.5, y: 0.5 })
  const sideRef = useRef(START_SIDE)
  // Where a press began, to tell a click from a drag.
  const downRef = useRef<{ x: number; y: number } | null>(null)

  /** The square as a rectangle in 0..1, a true square on screen, kept inside the picture. */
  const squareRect = (): Rect | null => {
    const box = pictureRef.current?.getBoundingClientRect()
    if (!box || box.width === 0 || box.height === 0) return null
    const aspect = box.width / box.height
    const largest = Math.min(1, aspect)
    const smallest = Math.min(largest, Math.max(MIN_SIDE, minSquareWidth * aspect))
    const h = clamp(sideRef.current, smallest, largest)
    sideRef.current = h
    const w = h / aspect
    return {
      x: clamp(centreRef.current.x - w / 2, 0, 1 - w),
      y: clamp(centreRef.current.y - h / 2, 0, 1 - h),
      w,
      h,
    }
  }

  /** Moves the square's centre to the pointer. */
  const follow = (event: PointerEvent) => {
    const box = pictureRef.current?.getBoundingClientRect()
    if (!box || box.width === 0 || box.height === 0) return
    centreRef.current = {
      x: clamp((event.clientX - box.left) / box.width, 0, 1),
      y: clamp((event.clientY - box.top) / box.height, 0, 1),
    }
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    downRef.current = { x: event.clientX, y: event.clientY }
    // A finger moves the square by dragging, also past the picture's edge.
    if (squareOn) event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!squareOn) return
    // A mouse moves it by hovering; a finger or pen only while it is down.
    if (event.pointerType !== 'mouse' && !downRef.current) return
    follow(event)
    const rect = squareRect()
    if (rect) onSquareChange(rect)
  }

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const down = downRef.current
    downRef.current = null
    if (!down) return
    if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > CLICK_SLOP_PX) return
    if (squareOn) {
      onSquareToggle(null)
      return
    }
    follow(event)
    const rect = squareRect()
    if (rect) onSquareToggle(rect)
  }

  // The wheel changes the square's size. A native listener, because it has to
  // stop the page from scrolling and React's wheel handler is not allowed to.
  // Only attached while the square is on, so the page scrolls as usual otherwise.
  useEffect(() => {
    const picture = pictureRef.current
    if (!squareOn || !picture) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      if (event.deltaY === 0) return
      sideRef.current *= event.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP
      const rect = squareRect()
      if (rect) onSquareChange(rect)
    }
    picture.addEventListener('wheel', onWheel, { passive: false })
    return () => picture.removeEventListener('wheel', onWheel)
    // squareRect reads only refs and minSquareWidth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [squareOn, onSquareChange, minSquareWidth])

  return (
    <div className="player">
      <div
        ref={pictureRef}
        className={squareOn ? 'player-picture player-picture-square' : 'player-picture'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          downRef.current = null
        }}
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
        {region && (
          // Decoration only: the chosen area is named in text by the RegionPicker.
          <div
            className="region-outline"
            aria-hidden="true"
            style={{
              left: percent(region.x),
              top: percent(region.y),
              width: percent(region.w),
              height: percent(region.h),
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
