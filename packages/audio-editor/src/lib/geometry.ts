import type { Clip } from "./types"

export const timeToPx = (sec: number, pxPerSec: number) => sec * pxPerSec
export const pxToTime = (px: number, pxPerSec: number) => px / pxPerSec

export function clampClipFade(clip: Clip): Clip {
  const maxFade = clip.duration / 2
  const fadeIn = Math.max(0, Math.min(maxFade, clip.fadeInSec))
  const fadeOut = Math.max(0, Math.min(maxFade, clip.fadeOutSec))
  if (fadeIn === clip.fadeInSec && fadeOut === clip.fadeOutSec) return clip
  return { ...clip, fadeInSec: fadeIn, fadeOutSec: fadeOut }
}

export function projectDuration(clips: Clip[]): number {
  let max = 0
  for (const c of clips) {
    const end = c.start + c.duration
    if (end > max) max = end
  }
  return max
}

export function dbToGain(db: number): number {
  return Math.pow(10, db / 20)
}

export function gainToDb(gain: number): number {
  if (gain <= 0) return -Infinity
  return 20 * Math.log10(gain)
}

export function formatTime(sec: number, includeMs = false): string {
  if (!isFinite(sec) || sec < 0) sec = 0
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  const ms = Math.floor((sec - Math.floor(sec)) * 1000)
  const base = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  return includeMs ? `${base}.${ms.toString().padStart(3, "0")}` : base
}
