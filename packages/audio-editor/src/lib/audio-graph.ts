import { dbToGain } from "./geometry"
import type { Clip, Track } from "./types"

export type ScheduleHandle = {
  stop: () => void
  duration: number
}

export type EngineState = {
  context: AudioContext
  master: GainNode
}

let sharedContext: AudioContext | null = null
let sharedMaster: GainNode | null = null

export function getEngine(): EngineState {
  if (!sharedContext) {
    sharedContext = new AudioContext()
    sharedMaster = sharedContext.createGain()
    sharedMaster.connect(sharedContext.destination)
  }
  return { context: sharedContext, master: sharedMaster! }
}

export function setMasterGain(db: number) {
  const { master, context } = getEngine()
  master.gain.setTargetAtTime(dbToGain(db), context.currentTime, 0.01)
}

export async function ensureRunning(): Promise<void> {
  const { context } = getEngine()
  if (context.state === "suspended") await context.resume()
}

type BuildOpts = {
  context: AudioContext | OfflineAudioContext
  destination: AudioNode
  tracks: Track[]
  clips: Clip[]
  buffers: Map<string, AudioBuffer>
  startTimeSec: number // playhead offset on timeline
  contextStart?: number // when in context.currentTime to start
}

/**
 * Build the graph and schedule sources. Returns a stop callback and the
 * total duration scheduled (max clip end - playhead).
 */
export function scheduleGraph(opts: BuildOpts): ScheduleHandle {
  const {
    context,
    destination,
    tracks,
    clips,
    buffers,
    startTimeSec,
    contextStart = (context as AudioContext).currentTime ?? 0,
  } = opts

  const anySolo = tracks.some((t) => t.soloed)
  const trackById = new Map(tracks.map((t) => [t.id, t]))

  const trackGains = new Map<string, GainNode>()
  for (const t of tracks) {
    const g = context.createGain()
    const audible = anySolo ? t.soloed : !t.muted
    g.gain.value = audible ? dbToGain(t.gainDb) : 0
    g.connect(destination)
    trackGains.set(t.id, g)
  }

  const sources: AudioBufferSourceNode[] = []
  let scheduledEnd = 0

  for (const clip of clips) {
    const buf = buffers.get(clip.bufferRef)
    if (!buf) continue
    const track = trackById.get(clip.trackId)
    if (!track) continue
    const trackGain = trackGains.get(track.id)
    if (!trackGain) continue

    const clipEndOnTimeline = clip.start + clip.duration
    if (clipEndOnTimeline <= startTimeSec) continue

    const clipStartInPlayback = Math.max(0, clip.start - startTimeSec)
    const skipIntoClip = Math.max(0, startTimeSec - clip.start)
    const playDuration = Math.min(
      clip.duration - skipIntoClip,
      buf.duration - (clip.offset + skipIntoClip)
    )
    if (playDuration <= 0) continue

    const src = context.createBufferSource()
    src.buffer = buf

    const gain = context.createGain()
    const baseGain = dbToGain(clip.gainDb)
    const fadeIn = Math.max(0, clip.fadeInSec - skipIntoClip)
    const fadeOut = Math.max(
      0,
      Math.min(clip.fadeOutSec, clip.duration - skipIntoClip)
    )

    const startCtx = contextStart + clipStartInPlayback
    const endCtx = startCtx + playDuration

    if (fadeIn > 0) {
      gain.gain.setValueAtTime(0, startCtx)
      gain.gain.linearRampToValueAtTime(baseGain, startCtx + fadeIn)
    } else {
      gain.gain.setValueAtTime(baseGain, startCtx)
    }
    if (fadeOut > 0) {
      gain.gain.setValueAtTime(baseGain, endCtx - fadeOut)
      gain.gain.linearRampToValueAtTime(0, endCtx)
    }

    src.connect(gain)
    gain.connect(trackGain)

    src.start(startCtx, clip.offset + skipIntoClip, playDuration)
    src.stop(endCtx + 0.05)
    sources.push(src)

    if (clipEndOnTimeline - startTimeSec > scheduledEnd) {
      scheduledEnd = clipEndOnTimeline - startTimeSec
    }
  }

  return {
    duration: scheduledEnd,
    stop: () => {
      for (const s of sources) {
        try {
          s.stop()
        } catch {}
      }
      for (const g of trackGains.values()) {
        try {
          g.disconnect()
        } catch {}
      }
    },
  }
}
