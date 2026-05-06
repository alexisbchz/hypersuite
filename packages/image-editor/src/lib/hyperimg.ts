import JSZip from "jszip"
import type { Layer } from "./types"
import { DEFAULT_DOC_SETTINGS, type DocSettings } from "../editor/doc"

export const HYPERIMG_VERSION = 1

export type HyperimgManifest = {
  version: number
  doc: DocSettings
  layers: Layer[]
  savedAt: number
}

export type HyperimgSnapshot = {
  layers: Layer[]
  doc: DocSettings
}

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg"
  if (mime === "image/png") return "png"
  if (mime === "image/webp") return "webp"
  if (mime === "image/svg+xml") return "svg"
  if (mime === "image/gif") return "gif"
  return "bin"
}

async function srcToBlob(src: string): Promise<{ blob: Blob; mime: string }> {
  // Handles blob:, data:, and same-origin http(s):
  const res = await fetch(src)
  const blob = await res.blob()
  return { blob, mime: blob.type || "application/octet-stream" }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(",")
  const mime = /data:([^;]+)/.exec(meta ?? "")?.[1] ?? "image/png"
  const bin = atob(b64 ?? "")
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

/** Build a .hyperimg zip blob from current editor state. */
export async function saveHyperimg(opts: {
  layers: Layer[]
  doc: DocSettings
}): Promise<Blob> {
  const zip = new JSZip()
  const manifestLayers: Layer[] = []
  const imagesFolder = zip.folder("images")!
  const assetsFolder = zip.folder("assets")!

  for (const layer of opts.layers) {
    const stripped: Layer = { ...layer }
    if (layer.kind === "image" && layer.src) {
      try {
        const { blob, mime } = await srcToBlob(layer.src)
        const name = `${layer.id}.${extFromMime(mime)}`
        imagesFolder.file(name, blob)
        stripped.src = `images/${name}`
      } catch {
        // Drop broken sources rather than fail the whole save.
        stripped.src = undefined
      }
    }
    if (layer.rasterDataUrl && layer.rasterDataUrl.startsWith("data:")) {
      const blob = dataUrlToBlob(layer.rasterDataUrl)
      const name = `${layer.id}.png`
      assetsFolder.file(name, blob)
      stripped.rasterDataUrl = `assets/${name}`
    }
    manifestLayers.push(stripped)
  }

  const manifest: HyperimgManifest = {
    version: HYPERIMG_VERSION,
    doc: opts.doc,
    layers: manifestLayers,
    savedAt: Date.now(),
  }
  zip.file("manifest.json", JSON.stringify(manifest, null, 2))
  return zip.generateAsync({ type: "blob" })
}

/** Parse a .hyperimg file and return a snapshot ready for replaceDoc(). */
export async function loadHyperimg(file: File): Promise<HyperimgSnapshot> {
  const zip = await JSZip.loadAsync(file)
  const manifestEntry = zip.file("manifest.json")
  if (!manifestEntry) throw new Error("manifest.json not found in archive")
  const raw = await manifestEntry.async("string")
  const manifest = JSON.parse(raw) as HyperimgManifest
  if (manifest.version !== HYPERIMG_VERSION) {
    // Forward-compat: try to load anyway but warn.
    // eslint-disable-next-line no-console
    console.warn("hyperimg version mismatch", manifest.version)
  }

  const layers: Layer[] = []
  for (const l of manifest.layers) {
    const next: Layer = { ...l }
    if (
      l.kind === "image" &&
      typeof l.src === "string" &&
      l.src.startsWith("images/")
    ) {
      const entry = zip.file(l.src)
      if (entry) {
        const blob = await entry.async("blob")
        next.src = URL.createObjectURL(blob)
      }
    }
    if (
      typeof l.rasterDataUrl === "string" &&
      l.rasterDataUrl.startsWith("assets/")
    ) {
      const entry = zip.file(l.rasterDataUrl)
      if (entry) {
        const blob = await entry.async("blob")
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const r = new FileReader()
          r.onload = () => resolve(String(r.result))
          r.onerror = () => reject(new Error("read failed"))
          r.readAsDataURL(blob)
        })
        next.rasterDataUrl = dataUrl
      }
    }
    layers.push(next)
  }

  return {
    layers,
    doc: { ...DEFAULT_DOC_SETTINGS, ...manifest.doc },
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
