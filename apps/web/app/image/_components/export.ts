import type { Layer } from "./types"

export type ExportFormat = "png" | "jpeg" | "webp" | "svg"

export const EXPORT_FORMATS: {
  id: ExportFormat
  label: string
  ext: string
  mime: string
}[] = [
  { id: "png", label: "PNG", ext: "png", mime: "image/png" },
  { id: "jpeg", label: "JPEG", ext: "jpg", mime: "image/jpeg" },
  { id: "webp", label: "WebP", ext: "webp", mime: "image/webp" },
  { id: "svg", label: "SVG", ext: "svg", mime: "image/svg+xml" },
]

const DOC_W = 1200
const DOC_H = 800

type ExportContext = {
  layers: Layer[]
  filename: string
  format: ExportFormat
  /** resolves CSS variable / oklch references to a concrete CSS color string */
  resolveColor?: (raw: string) => string
}

export async function exportComposition(ctx: ExportContext) {
  const blob =
    ctx.format === "svg"
      ? await renderSvg(ctx)
      : await renderRaster(ctx)
  triggerDownload(
    blob,
    `${sanitizeFilename(ctx.filename)}.${EXPORT_FORMATS.find((f) => f.id === ctx.format)!.ext}`
  )
}

async function renderRaster({
  layers,
  format,
  resolveColor,
}: ExportContext): Promise<Blob> {
  const canvas = document.createElement("canvas")
  canvas.width = DOC_W
  canvas.height = DOC_H
  const ctx = canvas.getContext("2d")!

  if (format === "jpeg") {
    ctx.fillStyle = resolveColor?.("var(--color-background)") ?? "#ffffff"
    ctx.fillRect(0, 0, DOC_W, DOC_H)
  }

  // Bottom-up draw order: last layer in array is at bottom, first at top.
  for (const l of [...layers].reverse()) {
    if (!l.visible) continue
    ctx.save()
    ctx.globalAlpha = l.opacity / 100
    ctx.globalCompositeOperation = mapBlend(l.blendMode)
    const cx = l.x + l.width / 2
    const cy = l.y + l.height / 2
    ctx.translate(cx, cy)
    ctx.rotate((l.rotation * Math.PI) / 180)
    ctx.translate(-l.width / 2, -l.height / 2)

    if (l.kind === "image" && l.src) {
      const img = await loadImage(l.src)
      ctx.drawImage(img, 0, 0, l.width, l.height)
    } else if (l.kind === "image" && l.id === "photo") {
      try {
        const img = await loadImage("/_next/image?url=%2Fillustration.webp&w=1200&q=90")
        ctx.drawImage(img, 0, 0, l.width, l.height)
      } catch {
        // fall through if not available — skip
      }
    } else if (l.kind === "text") {
      ctx.fillStyle = resolveColor?.(l.color ?? "#000") ?? "#000"
      ctx.font = `600 56px system-ui, -apple-system, "Segoe UI", sans-serif`
      ctx.textBaseline = "middle"
      ctx.fillText("Hypersuite", 0, l.height / 2)
    } else {
      ctx.fillStyle = resolveColor?.(l.color ?? "#000") ?? "#000"
      const r = l.id === "bg" ? 0 : 8
      roundRect(ctx, 0, 0, l.width, l.height, r)
      ctx.fill()
    }
    ctx.restore()
  }

  const mime = EXPORT_FORMATS.find((f) => f.id === format)!.mime
  const quality = format === "jpeg" || format === "webp" ? 0.92 : undefined
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      mime,
      quality
    )
  )
}

async function renderSvg({ layers, resolveColor }: ExportContext): Promise<Blob> {
  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${DOC_W}" height="${DOC_H}" viewBox="0 0 ${DOC_W} ${DOC_H}">`
  )
  for (const l of [...layers].reverse()) {
    if (!l.visible) continue
    const cx = l.x + l.width / 2
    const cy = l.y + l.height / 2
    const transform = `translate(${cx} ${cy}) rotate(${l.rotation}) translate(${-l.width / 2} ${-l.height / 2})`
    const opacity = l.opacity / 100

    if (l.kind === "image" && l.src) {
      const dataUrl = await blobUrlToDataUrl(l.src)
      parts.push(
        `<g transform="${transform}" opacity="${opacity}"><image href="${escapeXml(dataUrl)}" width="${l.width}" height="${l.height}" preserveAspectRatio="xMidYMid slice"/></g>`
      )
    } else if (l.kind === "text") {
      const color = escapeXml(resolveColor?.(l.color ?? "#000") ?? "#000")
      parts.push(
        `<g transform="${transform}" opacity="${opacity}"><text x="0" y="${l.height / 2 + 18}" fill="${color}" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-weight="600" font-size="56">Hypersuite</text></g>`
      )
    } else {
      const color = escapeXml(resolveColor?.(l.color ?? "#000") ?? "#000")
      const rx = l.id === "bg" ? 0 : 8
      parts.push(
        `<g transform="${transform}" opacity="${opacity}"><rect width="${l.width}" height="${l.height}" rx="${rx}" fill="${color}"/></g>`
      )
    }
  }
  parts.push(`</svg>`)
  return new Blob([parts.join("")], { type: "image/svg+xml" })
}

function mapBlend(b: string): GlobalCompositeOperation {
  const allowed: GlobalCompositeOperation[] = [
    "source-over",
    "multiply",
    "screen",
    "overlay",
    "darken",
    "lighten",
    "color-dodge",
    "color-burn",
    "hard-light",
    "soft-light",
    "difference",
    "exclusion",
    "hue",
    "saturation",
    "color",
    "luminosity",
  ]
  if (b === "normal") return "source-over"
  return (allowed as string[]).includes(b)
    ? (b as GlobalCompositeOperation)
    : "source-over"
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

async function blobUrlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (r <= 0) {
    ctx.rect(x, y, w, h)
    return
  }
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function sanitizeFilename(name: string) {
  const trimmed = name.trim() || "Untitled"
  return trimmed.replace(/[\\/:*?"<>|]+/g, "-")
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

/** Resolve a CSS color expression (vars, oklch, hex) to a concrete sRGB string */
export function makeColorResolver(): (raw: string) => string {
  const probe = document.createElement("span")
  probe.style.position = "absolute"
  probe.style.visibility = "hidden"
  document.body.appendChild(probe)
  return (raw: string) => {
    probe.style.color = ""
    probe.style.color = raw
    const computed = getComputedStyle(probe).color || raw
    return computed
  }
}
