import type { Layer } from "./types"
import { ensureFont, fontStack } from "../pickers/fonts"

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

const DEFAULT_DOC_W = 1200
const DEFAULT_DOC_H = 800

type ExportContext = {
  layers: Layer[]
  filename: string
  format: ExportFormat
  /** Document dimensions. Falls back to 1200×800 if omitted. */
  width?: number
  height?: number
  /** Output pixel multiplier (e.g. 2 on a Retina display). Defaults to
   *  the device pixel ratio, capped at 3 for memory sanity. The composition
   *  draws in doc-coords; the underlying canvas is allocated at
   *  width*pr × height*pr. */
  pixelRatio?: number
  /** resolves CSS variable / oklch references to a concrete CSS color string */
  resolveColor?: (raw: string) => string
  /** Resolved URL for the legacy demo "photo" layer (which has no `src`).
   *  Caller must pass this — Next.js static-import paths are hashed and
   *  unavailable from a static literal. */
  photoUrl?: string
  /** Live offscreen canvases for raster (brush/pencil/eraser) layers. When
   *  provided, raster layers draw straight from the canvas instead of
   *  re-decoding the PNG dataURL — preserves stroke fidelity. */
  getRasterCanvas?: (id: string) => HTMLCanvasElement
}

function defaultPixelRatio(): number {
  if (typeof window === "undefined") return 1
  return Math.min(Math.max(1, window.devicePixelRatio || 1), 3)
}

export async function exportComposition(ctx: ExportContext) {
  const blob = await exportToBlob(ctx)
  triggerDownload(
    blob,
    `${sanitizeFilename(ctx.filename)}.${EXPORT_FORMATS.find((f) => f.id === ctx.format)!.ext}`
  )
}

// Content-hash cache for repeated exports (e.g. share → copy as image immediately
// after a download). Keyed on (layers fingerprint + format + dims).
const EXPORT_CACHE = new Map<string, Blob>()
const EXPORT_CACHE_MAX = 4

function exportCacheKey(ctx: ExportContext): string {
  // JSON.stringify on layers gives a stable fingerprint.
  // Skip blob: URLs since they survive only this session anyway.
  const w = ctx.width ?? DEFAULT_DOC_W
  const h = ctx.height ?? DEFAULT_DOC_H
  const pr = ctx.pixelRatio ?? defaultPixelRatio()
  return `${ctx.format}::${w}x${h}@${pr}::${JSON.stringify(ctx.layers)}`
}

export async function exportToBlob(ctx: ExportContext): Promise<Blob> {
  const key = exportCacheKey(ctx)
  const hit = EXPORT_CACHE.get(key)
  if (hit) return hit
  const blob =
    ctx.format === "svg" ? await renderSvg(ctx) : await renderRaster(ctx)
  if (EXPORT_CACHE.size >= EXPORT_CACHE_MAX) {
    const firstKey = EXPORT_CACHE.keys().next().value
    if (firstKey !== undefined) EXPORT_CACHE.delete(firstKey)
  }
  EXPORT_CACHE.set(key, blob)
  return blob
}

async function renderRaster({
  layers,
  format,
  width,
  height,
  pixelRatio,
  resolveColor,
  photoUrl,
  getRasterCanvas,
}: ExportContext): Promise<Blob> {
  const docW = width ?? DEFAULT_DOC_W
  const docH = height ?? DEFAULT_DOC_H
  const pr = pixelRatio ?? defaultPixelRatio()
  // Smart preload: ensure every Google Font referenced by a text layer is
  // loaded before drawing, otherwise canvas falls back to system UI.
  const families = new Set<string>()
  for (const l of layers) {
    if (l.kind === "text" && l.fontFamily) families.add(l.fontFamily)
  }
  await Promise.all([...families].map((f) => ensureFont(f)))

  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(docW * pr))
  canvas.height = Math.max(1, Math.round(docH * pr))
  const ctx = canvas.getContext("2d")!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  // Draw everything in doc-coords; the canvas backs at higher density.
  ctx.scale(pr, pr)

  if (format === "jpeg") {
    ctx.fillStyle = resolveColor?.("var(--color-background)") ?? "#ffffff"
    ctx.fillRect(0, 0, docW, docH)
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

    const fx = l.effects ?? {}
    const filterParts: string[] = []
    const adj = l.adjustments
    if (adj?.brightness)
      filterParts.push(`brightness(${1 + adj.brightness / 100})`)
    if (adj?.contrast) filterParts.push(`contrast(${1 + adj.contrast / 100})`)
    if (adj?.saturation)
      filterParts.push(`saturate(${1 + adj.saturation / 100})`)
    if (adj?.hue) filterParts.push(`hue-rotate(${adj.hue}deg)`)
    if (fx.blur) filterParts.push(`blur(${fx.blur}px)`)
    if (filterParts.length) ctx.filter = filterParts.join(" ")
    // Drop-shadow runs through native canvas shadow APIs rather than
    // ctx.filter — the filter pipeline rasterizes layers softer than
    // CSS drop-shadow does in the editor. shadow* are in canvas pixels
    // and ignore the current transform, so we multiply by pr to match
    // doc-coords once the canvas is upscaled.
    if (fx.shadow) {
      ctx.shadowColor = resolveColor?.(fx.shadow.color) ?? fx.shadow.color
      ctx.shadowOffsetX = fx.shadow.x * pr
      ctx.shadowOffsetY = fx.shadow.y * pr
      ctx.shadowBlur = fx.shadow.blur * pr
    }

    if (l.crop) {
      ctx.beginPath()
      ctx.rect(l.crop.x, l.crop.y, l.crop.width, l.crop.height)
      ctx.clip()
    }

    if (l.kind === "image" && l.src) {
      const img = await loadImage(l.src)
      drawImageCover(ctx, img, 0, 0, l.width, l.height)
    } else if (l.kind === "image" && l.id === "photo" && photoUrl) {
      try {
        const img = await loadImage(photoUrl)
        drawImageCover(ctx, img, 0, 0, l.width, l.height)
      } catch {
        // fall through if not available — skip
      }
    } else if (l.kind === "text") {
      const content =
        l.text ?? (l.id === "title" ? "Hypersuite" : l.name)
      const size = l.fontSize ?? 56
      const weight = l.fontWeight ?? 600
      ctx.fillStyle = resolveColor?.(l.color ?? "#000") ?? "#000"
      ctx.font = `${weight} ${size}px ${fontStack(l.fontFamily)}`
      ctx.textBaseline = "middle"
      ctx.fillText(content, 0, l.height / 2)
    } else if (l.kind === "raster") {
      // Prefer drawing from the live offscreen canvas when the caller
      // provides one; falling back to the dataURL avoids a PNG round-trip.
      const rc = getRasterCanvas?.(l.id)
      if (rc && rc.width > 0 && rc.height > 0) {
        drawDownscaled(ctx, rc, 0, 0, rc.width, rc.height, 0, 0, l.width, l.height)
      } else if (l.rasterDataUrl) {
        try {
          const img = await loadImage(l.rasterDataUrl)
          ctx.drawImage(img, 0, 0, l.width, l.height)
        } catch {
          // skip
        }
      }
    } else if (l.kind === "path" && l.path) {
      const p = new Path2D(l.path)
      const color = resolveColor?.(l.color ?? "#000") ?? "#000"
      if (l.pathClosed) {
        ctx.fillStyle = color
        ctx.fill(p)
      }
      ctx.strokeStyle = color
      ctx.lineWidth = l.pathStrokeWidth ?? 2
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.stroke(p)
    } else if (l.kind === "shape" && l.shape === "ellipse") {
      ctx.fillStyle = resolveColor?.(l.color ?? "#000") ?? "#000"
      ctx.beginPath()
      ctx.ellipse(
        l.width / 2,
        l.height / 2,
        l.width / 2,
        l.height / 2,
        0,
        0,
        Math.PI * 2
      )
      ctx.fill()
    } else {
      ctx.fillStyle = resolveColor?.(l.color ?? "#000") ?? "#000"
      const r = l.id === "bg" ? 0 : 8
      roundRect(ctx, 0, 0, l.width, l.height, r)
      ctx.fill()
    }

    // Clear the layer-level drop-shadow before stroke / innerShadow so they
    // don't inherit it. (innerShadow still uses ctx.save/restore inside its
    // own block, so this is mostly defensive.)
    ctx.shadowColor = "rgba(0,0,0,0)"
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0

    if (fx.stroke && fx.stroke.width > 0) {
      ctx.filter = "none"
      ctx.strokeStyle = resolveColor?.(fx.stroke.color) ?? fx.stroke.color
      ctx.lineWidth = fx.stroke.width
      ctx.strokeRect(0, 0, l.width, l.height)
    }
    if (fx.innerShadow) {
      // Approximate inner shadow: draw an inverted shadow clipped to layer alpha.
      ctx.save()
      ctx.filter = "none"
      ctx.beginPath()
      ctx.rect(0, 0, l.width, l.height)
      ctx.clip()
      const c = resolveColor?.(fx.innerShadow.color) ?? fx.innerShadow.color
      ctx.shadowColor = c
      ctx.shadowBlur = fx.innerShadow.blur * pr
      ctx.shadowOffsetX = -fx.innerShadow.x * pr
      ctx.shadowOffsetY = -fx.innerShadow.y * pr
      ctx.lineWidth = Math.max(2, fx.innerShadow.blur)
      ctx.strokeStyle = "rgba(0,0,0,0)"
      ctx.strokeRect(
        -fx.innerShadow.blur,
        -fx.innerShadow.blur,
        l.width + fx.innerShadow.blur * 2,
        l.height + fx.innerShadow.blur * 2
      )
      ctx.restore()
    }
    ctx.restore()
  }

  const mime = EXPORT_FORMATS.find((f) => f.id === format)!.mime
  // PNG ignores quality (lossless). JPEG/WebP get a high quality factor.
  const quality = format === "jpeg" || format === "webp" ? 0.95 : undefined
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      mime,
      quality
    )
  )
}

async function renderSvg({
  layers,
  width,
  height,
  resolveColor,
}: ExportContext): Promise<Blob> {
  const docW = width ?? DEFAULT_DOC_W
  const docH = height ?? DEFAULT_DOC_H
  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${docW}" height="${docH}" viewBox="0 0 ${docW} ${docH}">`
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
      const content = escapeXml(
        l.text ?? (l.id === "title" ? "Hypersuite" : l.name)
      )
      const size = l.fontSize ?? 56
      const weight = l.fontWeight ?? 600
      const family = escapeXml(fontStack(l.fontFamily))
      parts.push(
        `<g transform="${transform}" opacity="${opacity}"><text x="0" y="${l.height / 2 + size / 3}" fill="${color}" font-family="${family}" font-weight="${weight}" font-size="${size}">${content}</text></g>`
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

/** Replicates CSS `object-fit: cover` — center-crops the source image so
 *  it fills the destination rect without distortion. */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const sw = img.naturalWidth || img.width
  const sh = img.naturalHeight || img.height
  if (!sw || !sh) {
    ctx.drawImage(img, dx, dy, dw, dh)
    return
  }
  const destRatio = dw / dh
  const srcRatio = sw / sh
  let cropW: number
  let cropH: number
  if (srcRatio > destRatio) {
    cropH = sh
    cropW = sh * destRatio
  } else {
    cropW = sw
    cropH = sw / destRatio
  }
  const cropX = (sw - cropW) / 2
  const cropY = (sh - cropH) / 2
  drawDownscaled(ctx, img, cropX, cropY, cropW, cropH, dx, dy, dw, dh)
}

/** High-quality downscale via progressive 2× halving. Single-pass
 *  Canvas2D drawImage looks blurry/aliased when shrinking by more than ~2×;
 *  halving step-by-step (each step ≤2× shrink) yields much sharper results.
 *  When the shrink ratio is already ≤2×, falls back to direct drawImage. */
function drawDownscaled(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLCanvasElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  // For moderate downscales the browser's native bicubic in a single
  // drawImage produces sharper results than progressive halving through
  // intermediate canvases. Only fall back to halving for >3× shrinks.
  if (sw <= dw * 3 && sh <= dh * 3) {
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
    return
  }
  let curW = Math.max(Math.round(sw / 2), Math.round(dw))
  let curH = Math.max(Math.round(sh / 2), Math.round(dh))
  let cur: HTMLCanvasElement = document.createElement("canvas")
  cur.width = curW
  cur.height = curH
  let cctx = cur.getContext("2d")!
  cctx.imageSmoothingEnabled = true
  cctx.imageSmoothingQuality = "high"
  cctx.drawImage(img, sx, sy, sw, sh, 0, 0, curW, curH)
  while (curW > dw * 2 && curH > dh * 2) {
    const nextW = Math.max(Math.round(curW / 2), Math.round(dw))
    const nextH = Math.max(Math.round(curH / 2), Math.round(dh))
    const next = document.createElement("canvas")
    next.width = nextW
    next.height = nextH
    const nctx = next.getContext("2d")!
    nctx.imageSmoothingEnabled = true
    nctx.imageSmoothingQuality = "high"
    nctx.drawImage(cur, 0, 0, curW, curH, 0, 0, nextW, nextH)
    cur = next
    cctx = nctx
    curW = nextW
    curH = nextH
  }
  ctx.drawImage(cur, 0, 0, curW, curH, dx, dy, dw, dh)
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
