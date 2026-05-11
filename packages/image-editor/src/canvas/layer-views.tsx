"use client"

import { useEffect, useRef } from "react"

import { useEditor } from "../editor"
import type { Layer } from "../lib/types"
import type { SpacingGuides } from "../lib/geometry"
import { composeMasked } from "./utils"

/** Hosts the offscreen canvas backing a raster (brush/pencil) layer.
 *  Re-attaches the live canvas element to the host div whenever the layer
 *  changes, and repaints from `layer.rasterDataUrl` when undo/redo or
 *  hydration leave the canvas pixels out of sync. */
export function RasterLayerView({
  layer,
  common,
  children,
}: {
  layer: Layer
  common: {
    className: string
    style: React.CSSProperties
    onPointerDown: (e: React.PointerEvent) => void
    onMouseDown: (e: React.MouseEvent) => void
  }
  children: React.ReactNode
}) {
  const { getRasterCanvas } = useEditor()
  const hostRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const canvas = getRasterCanvas(layer.id)
    if (canvas.width === 0)
      canvas.width = layer.rasterWidth ?? layer.width ?? 1200
    if (canvas.height === 0)
      canvas.height = layer.rasterHeight ?? layer.height ?? 800
    canvas.style.width = "100%"
    canvas.style.height = "100%"
    canvas.style.display = "block"
    canvas.style.pointerEvents = "none"
    const host = hostRef.current
    if (host && canvas.parentElement !== host) {
      host.replaceChildren(canvas)
    }
    // For non-destructively-masked rasters (Remove background → refine
    // flow), the live canvas pixels are `source × mask`. The cache key is
    // the union of both fields so a stroke that only touches the mask
    // still triggers a recompose.
    const isMasked =
      typeof layer.sourceDataUrl === "string" &&
      typeof layer.maskDataUrl === "string"
    const applied = (canvas as unknown as { __applied?: string }).__applied
    const target = isMasked
      ? `${layer.sourceDataUrl}|${layer.maskDataUrl}`
      : (layer.rasterDataUrl ?? "")
    if (applied !== target) {
      const ctx = canvas.getContext("2d")
      if (ctx) {
        if (!target) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ;(canvas as unknown as { __applied?: string }).__applied = ""
        } else if (isMasked) {
          let cancelled = false
          const sImg = new window.Image()
          const mImg = new window.Image()
          let loaded = 0
          const tryDraw = () => {
            if (cancelled) return
            loaded++
            if (loaded < 2) return
            composeMasked(sImg, mImg, canvas.width, canvas.height, canvas)
            ;(canvas as unknown as { __applied?: string }).__applied = target
          }
          sImg.onload = tryDraw
          mImg.onload = tryDraw
          sImg.src = layer.sourceDataUrl!
          mImg.src = layer.maskDataUrl!
          return () => {
            cancelled = true
          }
        } else {
          const img = new window.Image()
          img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(img, 0, 0)
            ;(canvas as unknown as { __applied?: string }).__applied = target
          }
          img.src = target
        }
      }
    }
  }, [
    layer.id,
    layer.rasterDataUrl,
    layer.sourceDataUrl,
    layer.maskDataUrl,
    layer.rasterWidth,
    layer.rasterHeight,
    layer.width,
    layer.height,
    getRasterCanvas,
  ])
  return (
    <div {...common}>
      <div ref={hostRef} className="size-full" />
      {children}
    </div>
  )
}

/** contentEditable text editor used when the user double-clicks a text
 *  layer. Selects all on mount so typing replaces; commits on blur or
 *  Enter; cancels on Escape. */
export function TextEditor({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string
  onCommit: (text: string) => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLSpanElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }, [])
  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onBlur={(e) => onCommit(e.currentTarget.textContent ?? "")}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === "Escape") {
          e.preventDefault()
          onCancel()
        } else if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          onCommit((e.currentTarget as HTMLElement).textContent ?? "")
        }
      }}
      className="min-w-[1ch] ring-1 ring-primary outline-none"
      style={{ caretColor: "var(--color-primary)" }}
    >
      {initial}
    </span>
  )
}

/** Smart-spacing distance indicators rendered while dragging — shows the
 *  gap between the moving layer and its equally-spaced neighbors with
 *  dashed brackets and a numeric label. */
export function SpacingGuidesOverlay({
  guides,
  scale,
}: {
  guides: SpacingGuides[]
  scale: number
}) {
  if (!guides.length) return null
  const lineWidth = 1 / Math.max(scale, 0.001)
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{ overflow: "visible" }}
    >
      {guides.map((g, gi) =>
        g.spans.map((s, si) => {
          if (g.axis === "x") {
            return (
              <div key={`${gi}-${si}-x`}>
                <div
                  className="absolute"
                  style={{
                    left: s.a,
                    top: s.cross - 4,
                    width: s.b - s.a,
                    height: 8,
                    borderTop: `${lineWidth}px dashed var(--color-primary)`,
                    borderBottom: `${lineWidth}px dashed var(--color-primary)`,
                    opacity: 0.7,
                  }}
                />
                <div
                  className="absolute font-mono text-[10px] text-primary"
                  style={{
                    left: (s.a + s.b) / 2,
                    top: s.cross - 12,
                    transform: `translate(-50%, -100%) scale(${1 / Math.max(scale, 0.001)})`,
                    transformOrigin: "center bottom",
                  }}
                >
                  {Math.round(s.gap)}
                </div>
              </div>
            )
          }
          return (
            <div key={`${gi}-${si}-y`}>
              <div
                className="absolute"
                style={{
                  left: s.cross - 4,
                  top: s.a,
                  width: 8,
                  height: s.b - s.a,
                  borderLeft: `${lineWidth}px dashed var(--color-primary)`,
                  borderRight: `${lineWidth}px dashed var(--color-primary)`,
                  opacity: 0.7,
                }}
              />
              <div
                className="absolute font-mono text-[10px] text-primary"
                style={{
                  left: s.cross + 8,
                  top: (s.a + s.b) / 2,
                  transform: `translate(0, -50%) scale(${1 / Math.max(scale, 0.001)})`,
                  transformOrigin: "left center",
                }}
              >
                {Math.round(s.gap)}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
