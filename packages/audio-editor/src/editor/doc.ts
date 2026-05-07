import type { Project, Track } from "../lib/types"

export const DEFAULT_SAMPLE_RATE = 48000

export const TRACK_COLORS = [
  "oklch(70% 0.14 250)",
  "oklch(72% 0.14 150)",
  "oklch(74% 0.14 60)",
  "oklch(70% 0.16 350)",
  "oklch(72% 0.14 200)",
  "oklch(72% 0.14 100)",
]

export const DEFAULT_TRACK_HEIGHT = 96

export function makeDefaultTrack(index: number): Track {
  return {
    id: crypto.randomUUID(),
    name: `Track ${index + 1}`,
    muted: false,
    soloed: false,
    gainDb: 0,
    pan: 0,
    height: DEFAULT_TRACK_HEIGHT,
    color: TRACK_COLORS[index % TRACK_COLORS.length]!,
  }
}

export function makeDefaultProject(): Project {
  return {
    id: crypto.randomUUID(),
    name: "Untitled project",
    sampleRate: DEFAULT_SAMPLE_RATE,
    bitDepth: 16,
    tracks: [makeDefaultTrack(0), makeDefaultTrack(1)],
    clips: [],
    pxPerSec: 80,
    scrollX: 0,
    playhead: 0,
    selection: null,
    masterGainDb: 0,
    loop: null,
  }
}

export type Prefs = {
  defaultVoice: string
  masterGainDb: number
  showStatusBar: boolean
}

export const DEFAULT_PREFS: Prefs = {
  defaultVoice: "azelma",
  masterGainDb: 0,
  showStatusBar: true,
}

export const PX_PER_SEC_MIN = 8
export const PX_PER_SEC_MAX = 800
export const HISTORY_LIMIT = 100
