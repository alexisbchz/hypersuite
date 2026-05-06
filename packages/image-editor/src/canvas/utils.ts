import type { Layer } from "../lib/types"

/** Composite all visible layers onto a fresh offscreen canvas. Used by the
 *  magic-wand and eyedropper paths to read pixels without going through the
 *  full export pipeline. */
export function compositeDocToCanvas(
  layers: Layer[],
  getRasterCanvas: (id: string) => HTMLCanvasElement,
  width: number,
  height: number
): HTMLCanvasElement {
  const out = document.createElement("canvas")
  out.width = width
  out.height = height
  const ctx = out.getContext("2d")
  if (!ctx) return out
  for (const l of [...layers].reverse()) {
    if (!l.visible) continue
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
    if (l.kind === "raster") {
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

/** Magic-wand flood fill. Composites the doc, samples the start pixel, then
 *  scan-line floods all pixels within `tolerance` (Euclidean RGB distance).
 *  Returns a translucent-blue overlay PNG of the masked region. */
export function floodFillMask(
  layers: Layer[],
  getRasterCanvas: (id: string) => HTMLCanvasElement,
  startX: number,
  startY: number,
  tolerance: number,
  DOC_W: number,
  DOC_H: number
): { dataUrl: string; width: number; height: number } | null {
  const composite = compositeDocToCanvas(layers, getRasterCanvas, DOC_W, DOC_H)
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
  const idx0 = (startY * DOC_W + startX) * 4
  const r0 = data[idx0]!
  const g0 = data[idx0 + 1]!
  const b0 = data[idx0 + 2]!
  const tol2 = tolerance * tolerance
  const mask = new Uint8Array(DOC_W * DOC_H)
  const near = (
    d: Uint8ClampedArray,
    x: number,
    y: number,
    rr: number,
    gg: number,
    bb: number
  ) => {
    const idx = (y * DOC_W + x) * 4
    const dr = d[idx]! - rr
    const dg = d[idx + 1]! - gg
    const db = d[idx + 2]! - bb
    return dr * dr + dg * dg + db * db <= tol2
  }
  const stack: number[] = [startX, startY]
  while (stack.length) {
    const y = stack.pop()!
    const x = stack.pop()!
    let lx = x
    while (lx >= 0 && !mask[y * DOC_W + lx] && near(data, lx, y, r0, g0, b0))
      lx--
    lx++
    let rx = x
    while (rx < DOC_W && !mask[y * DOC_W + rx] && near(data, rx, y, r0, g0, b0))
      rx++
    rx--
    for (let i = lx; i <= rx; i++) {
      mask[y * DOC_W + i] = 1
    }
    for (const yy of [y - 1, y + 1]) {
      if (yy < 0 || yy >= DOC_H) continue
      let i = lx
      while (i <= rx) {
        while (
          i <= rx &&
          (mask[yy * DOC_W + i] || !near(data, i, yy, r0, g0, b0))
        )
          i++
        if (i > rx) break
        const segStart = i
        while (
          i <= rx &&
          !mask[yy * DOC_W + i] &&
          near(data, i, yy, r0, g0, b0)
        )
          i++
        stack.push(segStart, yy)
      }
    }
  }
  const out = document.createElement("canvas")
  out.width = DOC_W
  out.height = DOC_H
  const oc = out.getContext("2d")
  if (!oc) return null
  const overlay = oc.createImageData(DOC_W, DOC_H)
  for (let i = 0; i < DOC_W * DOC_H; i++) {
    if (mask[i]) {
      overlay.data[i * 4] = 79
      overlay.data[i * 4 + 1] = 122
      overlay.data[i * 4 + 2] = 255
      overlay.data[i * 4 + 3] = 110
    }
  }
  oc.putImageData(overlay, 0, 0)
  return {
    dataUrl: out.toDataURL("image/png"),
    width: DOC_W,
    height: DOC_H,
  }
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
