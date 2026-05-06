"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { ImageIcon } from "@hugeicons/core-free-icons"

import type { MarqueeState, ZoomDragState } from "./types"

/** Translucent rect rendered while the user drags the zoom-rect tool. */
export function ZoomRect({
  drag,
  scale,
}: {
  drag: ZoomDragState
  scale: number
}) {
  const x = Math.min(drag.startDocX, drag.curDocX)
  const y = Math.min(drag.startDocY, drag.curDocY)
  const w = Math.abs(drag.curDocX - drag.startDocX)
  const h = Math.abs(drag.curDocY - drag.startDocY)
  if (w < 1 && h < 1) return null
  const lineWidth = 1 / Math.max(scale, 0.001)
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        outline: `${lineWidth}px dashed var(--color-primary)`,
        background:
          "color-mix(in oklch, var(--color-primary), transparent 90%)",
      }}
    />
  )
}

/** Translucent rect rendered while the user drags a marquee selection. */
export function MarqueeRect({
  marquee,
  scale,
}: {
  marquee: MarqueeState
  scale: number
}) {
  const x = Math.min(marquee.startDocX, marquee.curDocX)
  const y = Math.min(marquee.startDocY, marquee.curDocY)
  const w = Math.abs(marquee.curDocX - marquee.startDocX)
  const h = Math.abs(marquee.curDocY - marquee.startDocY)
  if (w < 1 && h < 1) return null
  const lineWidth = 1 / Math.max(scale, 0.001)
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        background:
          "color-mix(in oklch, var(--color-primary), transparent 85%)",
        outline: `${lineWidth}px solid var(--color-primary)`,
      }}
    />
  )
}

/** Smart-snapping guides rendered when a layer aligns with another's edge
 *  during a drag. `v` are vertical lines (x positions); `h` are horizontal. */
export function Guides({
  v,
  h,
  scale,
  docW,
  docH,
}: {
  v: number[]
  h: number[]
  scale: number
  docW: number
  docH: number
}) {
  if (v.length === 0 && h.length === 0) return null
  const lineWidth = 1 / Math.max(scale, 0.001)
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{ overflow: "visible" }}
    >
      {v.map((x, i) => (
        <div
          key={`v-${i}-${x}`}
          className="absolute"
          style={{
            left: x,
            top: -docH,
            width: lineWidth,
            height: docH * 3,
            background: "var(--color-primary)",
          }}
        />
      ))}
      {h.map((y, i) => (
        <div
          key={`h-${i}-${y}`}
          className="absolute"
          style={{
            top: y,
            left: -docW,
            height: lineWidth,
            width: docW * 3,
            background: "var(--color-primary)",
          }}
        />
      ))}
    </div>
  )
}

/** Top-and-left rulers around the canvas, with major (100 doc-px) and
 *  minor (10 doc-px) ticks rendered as repeating linear-gradients. */
export function Rulers({
  docW,
  docH,
  scale,
  panX,
  panY,
}: {
  docW: number
  docH: number
  scale: number
  panX: number
  panY: number
}) {
  const majorPx = 100 * scale
  const minorPx = 10 * scale
  const docLeft = `calc(50% - ${docW / 2}px * ${scale} + ${panX}px)`
  const docTop = `calc(50% - ${docH / 2}px * ${scale} + ${panY}px)`
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-4 border-b border-border bg-background/90 backdrop-blur"
        style={{
          backgroundImage: `linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to right, color-mix(in oklch, var(--color-border), transparent 50%) 1px, transparent 1px)`,
          backgroundSize: `${majorPx}px 100%, ${minorPx}px 100%`,
          backgroundPosition: `${docLeft} 0, ${docLeft} 0`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 start-0 top-4 z-10 w-4 border-e border-border bg-background/90 backdrop-blur"
        style={{
          backgroundImage: `linear-gradient(to bottom, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklch, var(--color-border), transparent 50%) 1px, transparent 1px)`,
          backgroundSize: `100% ${majorPx}px, 100% ${minorPx}px`,
          backgroundPosition: `0 ${docTop}, 0 ${docTop}`,
        }}
      />
    </>
  )
}

/** Dropzone hint shown when the user drags a file over the canvas. */
export function DropOverlay() {
  return (
    <div className="pointer-events-none absolute inset-3 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary bg-primary/5 text-primary">
      <HugeiconsIcon icon={ImageIcon} className="size-6" />
      <p className="text-sm font-medium">Drop image to add as a layer</p>
    </div>
  )
}

/** Subtle dot pattern rendered behind the document — the "workspace"
 *  background. Distinct from the transparency checker on the doc surface. */
export function CheckerBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage:
          "radial-gradient(circle, color-mix(in oklch, var(--color-foreground), transparent 88%) 1px, transparent 1px)",
        backgroundSize: "16px 16px",
      }}
    />
  )
}

/** Bottom-left HUD: doc dimensions, zoom %, and live cursor position. */
export function RulerBadge({
  zoom,
  cursor,
  docW,
  docH,
}: {
  zoom: number
  cursor: { x: number; y: number } | null
  docW: number
  docH: number
}) {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-md bg-background/80 px-2 py-1 text-xs text-muted-foreground shadow-sm ring-1 ring-border backdrop-blur">
      <span className="font-mono">
        {docW} × {docH}
      </span>
      <span className="text-foreground/40">·</span>
      <span className="font-mono">{Math.round(zoom)}%</span>
      {cursor && (
        <>
          <span className="text-foreground/40">·</span>
          <span className="font-mono">
            {Math.round(cursor.x)}, {Math.round(cursor.y)}
          </span>
        </>
      )}
    </div>
  )
}
