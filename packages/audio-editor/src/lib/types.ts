export type ToolId = "select" | "split" | "trim" | "draw" | "zoom" | "pan"

export type Track = {
  id: string
  name: string
  muted: boolean
  soloed: boolean
  gainDb: number
  pan: number
  height: number
  color: string
}

export type Clip = {
  id: string
  trackId: string
  name: string
  bufferRef: string
  start: number
  offset: number
  duration: number
  gainDb: number
  fadeInSec: number
  fadeOutSec: number
}

export type Selection =
  | { kind: "clips"; clipIds: string[] }
  | { kind: "region"; start: number; end: number; trackIds: string[] }
  | null

export type Project = {
  id: string
  name: string
  sampleRate: number
  bitDepth: 16 | 24 | 32
  tracks: Track[]
  clips: Clip[]
  pxPerSec: number
  scrollX: number
  playhead: number
  selection: Selection
  masterGainDb: number
  loop: { enabled: boolean; start: number; end: number } | null
}

export type WaveformPeaks = {
  bucketSize: number
  channelCount: number
  mins: Float32Array
  maxs: Float32Array
}

export type ClipboardEntry = {
  clip: Omit<Clip, "id" | "trackId" | "start">
  blob: Blob
}
