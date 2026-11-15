import { useCallback, useEffect, useRef, useState } from 'react'
import { createEngine } from '../audio/engine.ts'
import type { Engine } from '../audio/engine.ts'
import type { Rect, TrackDef } from '../types.ts'
import { Announcer } from '../a11y/Announcer.tsx'
import { Legend } from './Legend.tsx'
import { NowHearing } from './NowHearing.tsx'
import { Player } from './Player.tsx'
import { RegionPicker } from './RegionPicker.tsx'
import { CUSTOM_REGION, REGION_PRESETS, regionPhrase } from './regions.ts'
import type { RegionPreset } from './regions.ts'
import { TrackList } from './TrackList.tsx'

interface JukeboxProps {
  tracks: TrackDef[]
}

const DESCRIPTION_ID = 'track-description'
/** The "what you are hearing" sentence changes at most this often, so it can be read. */
const HEARING_INTERVAL_MS = 500

export function Jukebox({ tracks }: JukeboxProps) {
  const [selectedId, setSelectedId] = useState(tracks[0]?.id ?? '')
  const [isPlaying, setIsPlaying] = useState(false)
  const [message, setMessage] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const engineRef = useRef<Engine | null>(null)
  // Also in state, so the legend (fixed for the life of an engine) renders once the engine exists.
  const [engine, setEngine] = useState<Engine | null>(null)
  const [hearing, setHearing] = useState('')
  // The part of the picture that is turned into sound: a preset, or a rectangle drawn on the picture.
  const [regionId, setRegionId] = useState(REGION_PRESETS[0].id)
  const [drawnRegion, setDrawnRegion] = useState<Rect | null>(null)
  const region =
    regionId === CUSTOM_REGION
      ? drawnRegion
      : (REGION_PRESETS.find((preset) => preset.id === regionId)?.rect ?? null)

  const track = tracks.find((candidate) => candidate.id === selectedId) ?? tracks[0]

  useEffect(() => {
    const video = videoRef.current
    if (!video || !track) return

    const engine = createEngine({ video, track })
    engineRef.current = engine
    setEngine(engine)
    setIsPlaying(false)
    setHearing('')

    let lastHearing = 0
    const stopFeatures = engine.onFeatures((features) => {
      const at = performance.now()
      if (at - lastHearing < HEARING_INTERVAL_MS) return
      lastHearing = at
      setHearing(engine.describeNow(features) ?? '')
    })

    const syncPlayState = () => {
      const playing = !video.paused && !video.ended
      setIsPlaying(playing)
      if (!playing) setHearing('')
      setMessage(`${track.title}: ${playing ? 'playing' : 'paused'}`)
    }

    video.addEventListener('play', syncPlayState)
    video.addEventListener('pause', syncPlayState)
    video.addEventListener('ended', syncPlayState)

    return () => {
      video.removeEventListener('play', syncPlayState)
      video.removeEventListener('pause', syncPlayState)
      video.removeEventListener('ended', syncPlayState)
      stopFeatures()
      engine.dispose()
      engineRef.current = null
      setEngine(null)
    }
  }, [track])

  // A new engine (new track) listens to the whole picture until told otherwise.
  useEffect(() => {
    engine?.setRegion(region)
  }, [engine, region])

  const choosePreset = useCallback((preset: RegionPreset) => {
    setRegionId(preset.id)
    setMessage(`Listening to ${preset.phrase}`)
  }, [])

  const drawRegion = useCallback((rect: Rect) => {
    setDrawnRegion(rect)
    setRegionId(CUSTOM_REGION)
    setMessage(`Listening to ${regionPhrase(CUSTOM_REGION)}`)
  }, [])

  const toggle = useCallback(() => {
    const engine = engineRef.current
    const video = videoRef.current
    if (!engine || !video) return
    if (video.paused || video.ended) {
      if (video.ended) video.currentTime = 0
      engine.play().catch(() => {})
    } else {
      engine.pause()
    }
  }, [])

  const select = useCallback(
    (id: string) => {
      if (id === selectedId) return
      engineRef.current?.pause()
      setSelectedId(id)
      setRegionId(REGION_PRESETS[0].id)
      const next = tracks.find((candidate) => candidate.id === id)
      if (next) setMessage(`Track changed to ${next.title}`)
    },
    [selectedId, tracks],
  )

  const step = useCallback(
    (direction: number) => {
      const index = tracks.findIndex((candidate) => candidate.id === selectedId)
      const next = tracks[(index + direction + tracks.length) % tracks.length]
      if (next) select(next.id)
    },
    [selectedId, tracks, select],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return
      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) {
        return
      }

      if (event.key === ' ' || event.code === 'Space') {
        if (tag === 'BUTTON' || tag === 'A') return
        event.preventDefault()
        toggle()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        step(-1)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        step(1)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [step, toggle])

  if (!track) return null

  return (
    <section aria-label="Jukebox">
      <TrackList tracks={tracks} selectedId={track.id} onSelect={select} />

      <section aria-labelledby="track-heading">
        <h2 id="track-heading">{track.title}</h2>
        <Player
          track={track}
          videoRef={videoRef}
          isPlaying={isPlaying}
          onToggle={toggle}
          descriptionId={DESCRIPTION_ID}
          region={region}
          onRegionDrawn={drawRegion}
        />
        <NowHearing text={hearing} />
        <p id={DESCRIPTION_ID}>{track.description}</p>
        <h3>Listen for</h3>
        <ul className="listen-for">
          {track.listenFor.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <Legend items={engine?.legend ?? []} />
        <RegionPicker selectedId={regionId} onSelect={choosePreset} />
        <p className="credit">{track.credit}</p>
        <p>
          <a href={track.sourceUrl} target="_blank" rel="noreferrer">
            Source: NASA Scientific Visualization Studio
          </a>
        </p>
      </section>

      <Announcer message={message} />
    </section>
  )
}
