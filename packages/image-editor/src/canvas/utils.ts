import type { Layer } from "../lib/types"

/** Center-crops the source so it fills the destination rect — matches the
 *  CSS `object-fit: cover` semantics used to render image layers. */
export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number
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
  ctx.drawImage(img, cropX, cropY, cropW, cropH, dx, dy, dw, dh)
}

/** Composite all visible layers onto a fresh offscreen canvas. Used by the
 *  magic-wand and eyedropper paths to read pixels without going through the
 *  full export pipeline. Pass `onlyLayerId` to restrict to a single layer
 *  (Photoshop's "Sample all layers: off"). */
export async function compositeDocToCanvas(
  layers: Layer[],
  getRasterCanvas: (id: string) => HTMLCanvasElement,
  width: number,
  height: number,
  onlyLayerId?: string | null
): Promise<HTMLCanvasElement> {
  const out = document.createElement("canvas")
  out.width = width
  out.height = height
  const ctx = out.getContext("2d")
  if (!ctx) return out
  for (const l of [...layers].reverse()) {
    if (!l.visible) continue
    if (onlyLayerId && l.id !== onlyLayerId) continue
    ctx.save()
    ctx.globalAlpha = l.opacity / 100
    const cx = l.x + l.width / 2
    const cy = l.y + l.height / 2
    ctx.translate(cx, cy)
    ctx.rotate((l.rotation * Math.PI) / 180)
    ctx.translate(-l.width / 2, -l.height / 2)
    if (l.crop) {
      ctx.beginPath()
      ctx.rect(l.crop.x, l.crop.y, l.crop.width, l.crop.height)
      ctx.clip()
    }
    if (l.kind === "image" && l.src) {
      try {
        const img = await loadImage(l.src)
        drawImageCover(ctx, img, 0, 0, l.width, l.height)
      } catch {
        // skip
      }
    } else if (l.kind === "raster") {
      const rc = getRasterCanvas(l.id)
      if (rc.width > 0 && rc.height > 0) {
        try {
          ctx.drawImage(rc, 0, 0, l.width, l.height)
        } catch {
          // ignore
        }
      }
    } else if (l.kind === "shape" && l.shape === "ellipse") {
      ctx.fillStyle = resolveCssColorToHex(l.color ?? "#000") ?? "#000"
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
    } else if (l.kind === "path" && l.path) {
      const color = resolveCssColorToHex(l.color ?? "#000") ?? "#000"
      const p = new Path2D(l.path)
      if (l.pathClosed) {
        ctx.fillStyle = color
        ctx.fill(p)
      }
      ctx.strokeStyle = color
      ctx.lineWidth = l.pathStrokeWidth ?? 2
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.stroke(p)
    } else if (l.color) {
      ctx.fillStyle = resolveCssColorToHex(l.color) ?? l.color
      ctx.fillRect(0, 0, l.width, l.height)
    }
    ctx.restore()
  }
  return out
}

export type WandMaskMode = "new" | "add" | "subtract" | "intersect"

export type WandSampleSize = 1 | 3 | 5

export type PixelMask = {
  dataUrl: string
  width: number
  height: number
  /** Number of selected pixels (alpha > 0). Used for the "N pixels selected"
   *  status line — match Photoshop's "Selection: N pixels". */
  count: number
}

/** Average the RGBA at a `size`×`size` square centered on (cx, cy), clipped
 *  to the doc bounds. Photoshop's "Sample size" — 1 means point sample. */
function sampleSeed(
  data: Uint8ClampedArray,
  cx: number,
  cy: number,
  size: number,
  W: number,
  H: number
) {
  const half = (size - 1) / 2
  const x0 = Math.max(0, Math.floor(cx - half))
  const y0 = Math.max(0, Math.floor(cy - half))
  const x1 = Math.min(W - 1, Math.floor(cx + half))
  const y1 = Math.min(H - 1, Math.floor(cy + half))
  let r = 0
  let g = 0
  let b = 0
  let a = 0
  let n = 0
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * W + x) * 4
      r += data[i]!
      g += data[i + 1]!
      b += data[i + 2]!
      a += data[i + 3]!
      n++
    }
  }
  if (n === 0) return { r: 0, g: 0, b: 0, a: 0 }
  return { r: r / n, g: g / n, b: b / n, a: a / n }
}

/** Mark boundary pixels (those that border an unselected pixel) with a
 *  reduced alpha so the overlay edge looks soft. Mirrors Photoshop's
 *  "Anti-alias" toggle on the wand. */
function antiAliasMask(mask: Uint8Array, W: number, H: number) {
  const out = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      if (!mask[i]) continue
      const top = y > 0 ? mask[(y - 1) * W + x] : 0
      const bot = y < H - 1 ? mask[(y + 1) * W + x] : 0
      const left = x > 0 ? mask[i - 1] : 0
      const right = x < W - 1 ? mask[i + 1] : 0
      out[i] = top && bot && left && right ? 2 : 1
    }
  }
  return out
}

/** Magic-wand selection. Composites the doc (or just the active layer when
 *  `sampleAllLayers` is false), samples the seed color (averaged over a
 *  `sampleSize`×`sampleSize` neighborhood), then either flood-fills
 *  contiguous pixels within `tolerance` (Euclidean RGBA distance) or — when
 *  `contiguous` is false — selects every pixel in the doc within tolerance.
 *  Returns a translucent-blue overlay PNG of the masked region. */
export async function floodFillMask(
  layers: Layer[],
  getRasterCanvas: (id: string) => HTMLCanvasElement,
  startX: number,
  startY: number,
  tolerance: number,
  DOC_W: number,
  DOC_H: number,
  opts: {
    sampleSize?: WandSampleSize
    contiguous?: boolean
    antiAlias?: boolean
    sampleAllLayers?: boolean
    activeLayerId?: string | null
  } = {}
): Promise<PixelMask | null> {
  const sampleSize = opts.sampleSize ?? 1
  const contiguous = opts.contiguous ?? true
  const antiAlias = opts.antiAlias ?? true
  const sampleAllLayers = opts.sampleAllLayers ?? true

  const composite = await compositeDocToCanvas(
    layers,
    getRasterCanvas,
    DOC_W,
    DOC_H,
    sampleAllLayers ? null : opts.activeLayerId
  )
  const ctx = composite.getContext("2d", { willReadFrequently: true })
  if (!ctx) return null
  let img: ImageData
  try {
    img = ctx.getImageData(0, 0, DOC_W, DOC_H)
  } catch {
    return null
  }
  const data = img.data
  if (startX < 0 || startX >= DOC_W || startY < 0 || startY >= DOC_H)
    return null
  const seed = sampleSeed(data, startX, startY, sampleSize, DOC_W, DOC_H)
  const r0 = seed.r
  const g0 = seed.g
  const b0 = seed.b
  const a0 = seed.a
  const tol2 = tolerance * tolerance
  const mask = new Uint8Array(DOC_W * DOC_H)
  // Compare alpha as a 4th channel so transparent regions only match other
  // transparent regions (and don't bleed across an image's alpha boundary
  // because the underlying RGB happens to match).
  const near = (x: number, y: number) => {
    const idx = (y * DOC_W + x) * 4
    const dr = data[idx]! - r0
    const dg = data[idx + 1]! - g0
    const db = data[idx + 2]! - b0
    const da = data[idx + 3]! - a0
    return dr * dr + dg * dg + db * db + da * da <= tol2
  }
  if (contiguous) {
    const stack: number[] = [startX, startY]
    while (stack.length) {
      const y = stack.pop()!
      const x = stack.pop()!
      let lx = x
      while (lx >= 0 && !mask[y * DOC_W + lx] && near(lx, y)) lx--
      lx++
      let rx = x
      while (rx < DOC_W && !mask[y * DOC_W + rx] && near(rx, y)) rx++
      rx--
      for (let i = lx; i <= rx; i++) {
        mask[y * DOC_W + i] = 1
      }
      for (const yy of [y - 1, y + 1]) {
        if (yy < 0 || yy >= DOC_H) continue
        let i = lx
        while (i <= rx) {
          while (i <= rx && (mask[yy * DOC_W + i] || !near(i, yy))) i++
          if (i > rx) break
          const segStart = i
          while (i <= rx && !mask[yy * DOC_W + i] && near(i, yy)) i++
          stack.push(segStart, yy)
        }
      }
    }
  } else {
    // Photoshop "Contiguous: off" — match every pixel in the doc within
    // tolerance, regardless of adjacency.
    for (let y = 0; y < DOC_H; y++) {
      for (let x = 0; x < DOC_W; x++) {
        if (near(x, y)) mask[y * DOC_W + x] = 1
      }
    }
  }
  const edges = antiAlias ? antiAliasMask(mask, DOC_W, DOC_H) : null
  const out = document.createElement("canvas")
  out.width = DOC_W
  out.height = DOC_H
  const oc = out.getContext("2d")
  if (!oc) return null
  const overlay = oc.createImageData(DOC_W, DOC_H)
  let count = 0
  for (let i = 0; i < DOC_W * DOC_H; i++) {
    if (!mask[i]) continue
    count++
    overlay.data[i * 4] = 79
    overlay.data[i * 4 + 1] = 122
    overlay.data[i * 4 + 2] = 255
    // edges flag: 2 = interior (full alpha), 1 = boundary (half alpha)
    const soft = edges ? edges[i] === 1 : false
    overlay.data[i * 4 + 3] = soft ? 55 : 110
  }
  oc.putImageData(overlay, 0, 0)
  return {
    dataUrl: out.toDataURL("image/png"),
    width: DOC_W,
    height: DOC_H,
    count,
  }
}

/** Combine an existing pixel mask with a freshly-flooded mask using
 *  Photoshop's selection-mode operators. `new` replaces, `add` is union,
 *  `subtract` is set difference, `intersect` is intersection.
 *
 *  We rasterize both masks to alpha buffers and walk pixels in JS rather
 *  than rely on canvas composite ops — the masks have semi-transparent
 *  edges (~110/255 alpha for the body, ~55 for anti-aliased rims), so
 *  `destination-out` would only partially erase. Treating each pixel as
 *  binary (alpha > 0 = selected) gives the user the set-theoretic result
 *  Photoshop ships. */
export async function combineMasks(
  prev: PixelMask | null,
  next: PixelMask | null,
  mode: WandMaskMode
): Promise<PixelMask | null> {
  if (mode === "new") return next
  if (!prev) return mode === "subtract" || mode === "intersect" ? null : next
  if (!next) return mode === "intersect" ? null : prev
  const W = next.width
  const H = next.height
  const c = document.createElement("canvas")
  c.width = W
  c.height = H
  const ctx = c.getContext("2d", { willReadFrequently: true })
  if (!ctx) return prev
  const [pImg, nImg] = await Promise.all([
    loadImage(prev.dataUrl),
    loadImage(next.dataUrl),
  ])
  ctx.drawImage(pImg, 0, 0, W, H)
  let pData: ImageData
  try {
    pData = ctx.getImageData(0, 0, W, H)
  } catch {
    return prev
  }
  ctx.clearRect(0, 0, W, H)
  ctx.drawImage(nImg, 0, 0, W, H)
  let nData: ImageData
  try {
    nData = ctx.getImageData(0, 0, W, H)
  } catch {
    return prev
  }
  const out = ctx.createImageData(W, H)
  let count = 0
  for (let i = 0; i < W * H; i++) {
    const pa = pData.data[i * 4 + 3]!
    const na = nData.data[i * 4 + 3]!
    let selected: boolean
    if (mode === "add") selected = pa > 0 || na > 0
    else if (mode === "subtract") selected = pa > 0 && na === 0
    else selected = pa > 0 && na > 0
    if (!selected) continue
    // Soft (anti-aliased) rim if either source had a soft pixel here.
    const soft = (pa > 0 && pa < 100) || (na > 0 && na < 100)
    out.data[i * 4] = 79
    out.data[i * 4 + 1] = 122
    out.data[i * 4 + 2] = 255
    out.data[i * 4 + 3] = soft ? 55 : 110
    count++
  }
  ctx.clearRect(0, 0, W, H)
  ctx.putImageData(out, 0, 0)
  return { dataUrl: c.toDataURL("image/png"), width: W, height: H, count }
}

/** Invert a wand-mask overlay PNG: pixels currently masked become unmasked
 *  and vice versa. Used for "select inverse" on the magic-wand selection. */
export async function invertMaskOverlay(
  mask: PixelMask
): Promise<PixelMask | null> {
  const img = await loadImage(mask.dataUrl)
  const canvas = document.createElement("canvas")
  canvas.width = mask.width
  canvas.height = mask.height
  const ctx = canvas.getContext("2d")
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, mask.width, mask.height)
  let pix: ImageData
  try {
    pix = ctx.getImageData(0, 0, mask.width, mask.height)
  } catch {
    return null
  }
  const data = pix.data
  let count = 0
  for (let i = 0; i < mask.width * mask.height; i++) {
    const a = data[i * 4 + 3]!
    if (a > 0) {
      data[i * 4 + 3] = 0
    } else {
      data[i * 4] = 79
      data[i * 4 + 1] = 122
      data[i * 4 + 2] = 255
      data[i * 4 + 3] = 110
      count++
    }
  }
  ctx.putImageData(pix, 0, 0)
  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: mask.width,
    height: mask.height,
    count,
  }
}

/** Promote the mask overlay to a binary alpha buffer: every selected pixel
 *  (alpha > 0) becomes fully opaque, everything else is fully transparent.
 *  The wand stores its overlay with alpha 110 for the body and 55 for the
 *  anti-aliased rim so it renders as a translucent blue selection — but
 *  feeding that directly into a `destination-out` erase only partially
 *  removes pixels (the rim drops to ~78% alpha, the body to ~57%). Erase /
 *  cut paths binarize first so a selected pixel is removed entirely. */
export async function binarizeMaskCanvas(
  mask: PixelMask
): Promise<HTMLCanvasElement | null> {
  const img = await loadImage(mask.dataUrl)
  const canvas = document.createElement("canvas")
  canvas.width = mask.width
  canvas.height = mask.height
  const ctx = canvas.getContext("2d")
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, mask.width, mask.height)
  let pix: ImageData
  try {
    pix = ctx.getImageData(0, 0, mask.width, mask.height)
  } catch {
    return null
  }
  const data = pix.data
  for (let i = 0; i < mask.width * mask.height; i++) {
    data[i * 4 + 3] = data[i * 4 + 3]! > 0 ? 255 : 0
  }
  ctx.putImageData(pix, 0, 0)
  return canvas
}

/** Composite all visible layers, then keep only pixels under the wand mask
 *  (alpha > 0). Returns a PNG dataURL sized to the doc, suitable for the
 *  rasterDataUrl of a new raster layer. */
export async function extractUnderMask(
  layers: Layer[],
  getRasterCanvas: (id: string) => HTMLCanvasElement,
  mask: PixelMask,
  DOC_W: number,
  DOC_H: number
): Promise<string | null> {
  const composite = await compositeDocToCanvas(
    layers,
    getRasterCanvas,
    DOC_W,
    DOC_H
  )
  const out = document.createElement("canvas")
  out.width = DOC_W
  out.height = DOC_H
  const ctx = out.getContext("2d")
  if (!ctx) return null
  ctx.drawImage(composite, 0, 0)
  const maskImg = await loadImage(mask.dataUrl)
  ctx.save()
  ctx.globalCompositeOperation = "destination-in"
  ctx.drawImage(maskImg, 0, 0, DOC_W, DOC_H)
  ctx.restore()
  try {
    return out.toDataURL("image/png")
  } catch {
    return null
  }
}

/** Compose a masked raster: paint `source` then keep only pixels under
 *  the white/opaque region of `mask`. The output is what the user
 *  perceives as "the layer pixels"; we cache it on the layer's offscreen
 *  canvas so wand / export / eyedropper read the composed result without
 *  knowing about the mask. */
export function composeMasked(
  source: CanvasImageSource,
  mask: CanvasImageSource,
  width: number,
  height: number,
  out?: HTMLCanvasElement
): HTMLCanvasElement {
  const c = out ?? document.createElement("canvas")
  c.width = width
  c.height = height
  const ctx = c.getContext("2d")
  if (!ctx) return c
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(source, 0, 0, width, height)
  ctx.globalCompositeOperation = "destination-in"
  ctx.drawImage(mask, 0, 0, width, height)
  ctx.globalCompositeOperation = "source-over"
  return c
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`image load failed: ${src}`))
    img.src = src
  })
}

/** Paint a stroke (pencil / brush / eraser) onto a 2d context. The eraser
 *  uses destination-out compositing; brush adds shadow blur for soft edges. */
export function applyStroke(
  ctx: CanvasRenderingContext2D,
  mode: "pencil" | "brush" | "eraser",
  color: string,
  size: number,
  hardness: number,
  pts: { x: number; y: number }[]
) {
  ctx.save()
  if (mode === "eraser") {
    ctx.globalCompositeOperation = "destination-out"
    ctx.strokeStyle = "rgba(0,0,0,1)"
  } else {
    ctx.globalCompositeOperation = "source-over"
    ctx.strokeStyle = color
  }
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.lineWidth = Math.max(1, size)
  if (mode === "brush") {
    ctx.shadowColor = color
    ctx.shadowBlur = Math.max(0, (1 - hardness) * size)
  }
  ctx.beginPath()
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!
    if (i === 0) ctx.moveTo(p.x, p.y)
    else ctx.lineTo(p.x, p.y)
  }
  ctx.stroke()
  ctx.restore()
}

/** Eyedropper: prefer the native EyeDropper API; fall back to compositing
 *  the layers under the point and reading a 1×1 image data. */
export async function sampleColorAt(
  docX: number,
  docY: number,
  layers: Layer[],
  getRasterCanvas: (id: string) => HTMLCanvasElement
): Promise<string | null> {
  const Eye = (
    window as unknown as {
      EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> }
    }
  ).EyeDropper
  if (Eye) {
    try {
      const ed = new Eye()
      const r = await ed.open()
      return r.sRGBHex
    } catch {
      // user cancelled — fall through
    }
  }
  const probe = document.createElement("canvas")
  probe.width = 1
  probe.height = 1
  const ctx = probe.getContext("2d", { willReadFrequently: true })
  if (!ctx) return null
  ctx.fillStyle = "white"
  ctx.fillRect(0, 0, 1, 1)
  for (const l of [...layers].reverse()) {
    if (!l.visible) continue
    if (docX < l.x || docX > l.x + l.width) continue
    if (docY < l.y || docY > l.y + l.height) continue
    ctx.save()
    ctx.globalAlpha = l.opacity / 100
    if (l.kind === "raster") {
      const c = getRasterCanvas(l.id)
      const sx = ((docX - l.x) / l.width) * c.width
      const sy = ((docY - l.y) / l.height) * c.height
      try {
        ctx.drawImage(c, sx, sy, 1, 1, 0, 0, 1, 1)
      } catch {
        // ignore
      }
    } else if (l.kind === "image") {
      // Skip images we can't easily sample without async load
    } else if (l.color) {
      const resolved = resolveCssColorToHex(l.color) ?? l.color
      ctx.fillStyle = resolved
      ctx.fillRect(0, 0, 1, 1)
    }
    ctx.restore()
  }
  const data = ctx.getImageData(0, 0, 1, 1).data
  return rgbToHex(data[0]!, data[1]!, data[2]!)
}

/** Resolve a CSS color expression (vars, oklch, named, hex) to a #rrggbb
 *  hex string by piggy-backing on the browser's getComputedStyle. */
export function resolveCssColorToHex(raw: string): string | null {
  if (typeof window === "undefined") return null
  const probe = document.createElement("span")
  probe.style.position = "absolute"
  probe.style.visibility = "hidden"
  probe.style.color = ""
  probe.style.color = raw
  document.body.appendChild(probe)
  const computed = window.getComputedStyle(probe).color
  document.body.removeChild(probe)
  const m = computed.match(/rgba?\(([^)]+)\)/)
  if (!m) return null
  const parts = m[1]!.split(",").map((s) => parseFloat(s.trim()))
  if (parts.length < 3) return null
  return rgbToHex(parts[0]!, parts[1]!, parts[2]!)
}

export function rgbToHex(r: number, g: number, b: number) {
  const c = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0")
  return `#${c(r)}${c(g)}${c(b)}`
}

/** True if the dragenter/dragover event carries any files (vs. a layer
 *  drag inside the editor). */
export function hasFiles(e: React.DragEvent) {
  const types = e.dataTransfer?.types
  if (!types) return false
  for (let i = 0; i < types.length; i++) {
    if (types[i] === "Files") return true
  }
  return false
}
