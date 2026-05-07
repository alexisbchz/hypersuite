import { scheduleGraph } from "./audio-graph"
import { dbToGain } from "./geometry"
import type { Clip, Track } from "./types"

export type ExportOptions = {
  sampleRate: number
  bitDepth: 16 | 24 | 32
  masterGainDb: number
  tracks: Track[]
  clips: Clip[]
  buffers: Map<string, AudioBuffer>
}

export async function renderMixdown(
  opts: ExportOptions
): Promise<AudioBuffer> {
  const totalDuration = opts.clips.reduce(
    (m, c) => Math.max(m, c.start + c.duration),
    0
  )
  if (totalDuration <= 0) throw new Error("Project is empty")

  const ctx = new OfflineAudioContext(
    2,
    Math.ceil(totalDuration * opts.sampleRate),
    opts.sampleRate
  )
  const master = ctx.createGain()
  master.gain.value = dbToGain(opts.masterGainDb)
  master.connect(ctx.destination)

  scheduleGraph({
    context: ctx,
    destination: master,
    tracks: opts.tracks,
    clips: opts.clips,
    buffers: opts.buffers,
    startTimeSec: 0,
    contextStart: 0,
  })

  return await ctx.startRendering()
}

export function audioBufferToWav(
  buffer: AudioBuffer,
  bitDepth: 16 | 24 | 32 = 16
): Blob {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const length = buffer.length
  const bytesPerSample = bitDepth / 8
  const dataSize = length * numChannels * bytesPerSample
  const headerSize = 44
  const arr = new ArrayBuffer(headerSize + dataSize)
  const view = new DataView(arr)

  writeString(view, 0, "RIFF")
  view.setUint32(4, 36 + dataSize, true)
  writeString(view, 8, "WAVE")
  writeString(view, 12, "fmt ")
  view.setUint32(16, 16, true)
  // format: 1 = PCM, 3 = float
  view.setUint16(20, bitDepth === 32 ? 3 : 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true)
  view.setUint16(32, numChannels * bytesPerSample, true)
  view.setUint16(34, bitDepth, true)
  writeString(view, 36, "data")
  view.setUint32(40, dataSize, true)

  const channels: Float32Array[] = []
  for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c))

  let offset = 44
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c]![i]!))
      if (bitDepth === 16) {
        const v = sample < 0 ? sample * 0x8000 : sample * 0x7fff
        view.setInt16(offset, v, true)
        offset += 2
      } else if (bitDepth === 24) {
        const v = Math.round(
          sample < 0 ? sample * 0x800000 : sample * 0x7fffff
        )
        view.setUint8(offset, v & 0xff)
        view.setUint8(offset + 1, (v >> 8) & 0xff)
        view.setUint8(offset + 2, (v >> 16) & 0xff)
        offset += 3
      } else {
        view.setFloat32(offset, sample, true)
        offset += 4
      }
    }
  }
  return new Blob([arr], { type: "audio/wav" })
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
