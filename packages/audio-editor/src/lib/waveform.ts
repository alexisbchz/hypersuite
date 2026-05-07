import type { WaveformPeaks } from "./types"

export const WAVEFORM_BUCKET_SIZE = 256

export function computePeaks(
  buffer: AudioBuffer,
  bucketSize = WAVEFORM_BUCKET_SIZE
): WaveformPeaks {
  const channelCount = Math.min(buffer.numberOfChannels, 2)
  const length = buffer.length
  const buckets = Math.ceil(length / bucketSize)
  const mins = new Float32Array(buckets)
  const maxs = new Float32Array(buckets)

  // Mix down to mono peaks (averaging channels) for rendering simplicity.
  const channels: Float32Array[] = []
  for (let c = 0; c < channelCount; c++) channels.push(buffer.getChannelData(c))

  for (let b = 0; b < buckets; b++) {
    const start = b * bucketSize
    const end = Math.min(start + bucketSize, length)
    let mn = 1
    let mx = -1
    for (let i = start; i < end; i++) {
      let sum = 0
      for (let c = 0; c < channels.length; c++) sum += channels[c]![i]!
      const v = sum / channels.length
      if (v < mn) mn = v
      if (v > mx) mx = v
    }
    mins[b] = mn
    maxs[b] = mx
  }

  return { bucketSize, channelCount, mins, maxs }
}

export function drawPeaks(
  ctx: CanvasRenderingContext2D,
  peaks: WaveformPeaks,
  opts: {
    sampleRate: number
    offsetSec: number
    durationSec: number
    width: number
    height: number
    color: string
    devicePixelRatio?: number
  }
) {
  const dpr = opts.devicePixelRatio ?? 1
  const width = opts.width * dpr
  const height = opts.height * dpr
  ctx.clearRect(0, 0, width, height)

  const startSample = Math.max(0, Math.floor(opts.offsetSec * opts.sampleRate))
  const endSample = Math.min(
    peaks.mins.length * peaks.bucketSize,
    Math.floor((opts.offsetSec + opts.durationSec) * opts.sampleRate)
  )
  const startBucket = Math.floor(startSample / peaks.bucketSize)
  const endBucket = Math.ceil(endSample / peaks.bucketSize)
  const visibleBuckets = Math.max(1, endBucket - startBucket)

  ctx.fillStyle = opts.color
  ctx.beginPath()

  const halfH = height / 2
  for (let x = 0; x < width; x++) {
    const t = x / width
    const bIdx = startBucket + Math.floor(t * visibleBuckets)
    const bIdxEnd = startBucket + Math.floor(((x + 1) / width) * visibleBuckets)
    let mn = 1
    let mx = -1
    for (let i = bIdx; i <= bIdxEnd && i < peaks.mins.length; i++) {
      const lo = peaks.mins[i]!
      const hi = peaks.maxs[i]!
      if (lo < mn) mn = lo
      if (hi > mx) mx = hi
    }
    if (mn > mx) {
      mn = 0
      mx = 0
    }
    const yMin = halfH - mx * halfH
    const yMax = halfH - mn * halfH
    ctx.rect(x, yMin, 1, Math.max(1, yMax - yMin))
  }
  ctx.fill()
}

export async function decodeBlobToAudioBuffer(
  ctx: AudioContext | OfflineAudioContext,
  blob: Blob
): Promise<AudioBuffer> {
  const arr = await blob.arrayBuffer()
  return await ctx.decodeAudioData(arr.slice(0))
}
