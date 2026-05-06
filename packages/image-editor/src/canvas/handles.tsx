"use client"

import { type Rect, type ResizeHandle } from "../lib/geometry"

const HANDLES: {
  id: ResizeHandle
  left: string
  top: string
  cursor: string
}[] = [
  { id: "nw", left: "0%", top: "0%", cursor: "nwse-resize" },
  { id: "n", left: "50%", top: "0%", cursor: "ns-resize" },
  { id: "ne", left: "100%", top: "0%", cursor: "nesw-resize" },
  { id: "e", left: "100%", top: "50%", cursor: "ew-resize" },
  { id: "se", left: "100%", top: "100%", cursor: "nwse-resize" },
  { id: "s", left: "50%", top: "100%", cursor: "ns-resize" },
  { id: "sw", left: "0%", top: "100%", cursor: "nesw-resize" },
  { id: "w", left: "0%", top: "50%", cursor: "ew-resize" },
]

/** Single-layer transform handles: 8 resize squares + a circular rotate
 *  handle 22px above the top edge. Sized in screen-pixels (inverse-scaled
 *  so they stay visually consistent regardless of zoom). */
export function SelectionHandles({
  scale,
  onResize,
  onRotate,
}: {
  scale: number
  onResize: (e: React.PointerEvent, handle: ResizeHandle) => void
  onRotate: (e: React.PointerEvent) => void
}) {
  const inv = 1 / Math.max(scale, 0.001)
  const handlePx = 9
  const rotateOffset = 22
  return (
    <div className="pointer-events-none absolute inset-0">
      {HANDLES.map((h) => (
        <div
          key={h.id}
          onPointerDown={(e) => onResize(e, h.id)}
          className="pointer-events-auto absolute"
          style={{
            left: h.left,
            top: h.top,
            width: handlePx,
            height: handlePx,
            transform: `translate(-50%, -50%) scale(${inv})`,
            background: "var(--color-background)",
            border: "1.5px solid var(--color-primary)",
            borderRadius: 2,
            cursor: h.cursor,
            touchAction: "none",
            zIndex: 10,
          }}
        />
      ))}
      <div
        aria-hidden
        className="absolute"
        style={{
          left: "50%",
          top: 0,
          width: 0,
          height: rotateOffset * inv,
          borderLeft: "1px solid var(--color-primary)",
          transform: `translate(-50%, -100%)`,
          pointerEvents: "none",
        }}
      />
      <div
        onPointerDown={onRotate}
        className="pointer-events-auto absolute"
        style={{
          left: "50%",
          top: 0,
          width: handlePx + 3,
          height: handlePx + 3,
          transform: `translate(-50%, calc(-${rotateOffset}px * ${inv} - 50%)) scale(${inv})`,
          background: "var(--color-background)",
          border: "1.5px solid var(--color-primary)",
          borderRadius: "50%",
          cursor: "alias",
          touchAction: "none",
          zIndex: 10,
        }}
      />
    </div>
  )
}

/** Same handles, but anchored to a multi-selection bounding rect. Computes
 *  the pivot (opposite corner/edge) in client coords so the parent's
 *  resize math can use it directly. */
export function MultiSelectionHandles({
  bounds,
  scale,
  onResizeStart,
  onRotateStart,
}: {
  bounds: Rect
  scale: number
  onResizeStart: (
    e: React.PointerEvent,
    handle: ResizeHandle,
    pivotClient: { x: number; y: number }
  ) => void
  onRotateStart: (
    e: React.PointerEvent,
    centerClient: { x: number; y: number }
  ) => void
}) {
  const inv = 1 / Math.max(scale, 0.001)
  const handlePx = 9
  const rotateOffset = 22
  const lineWidth = 1 / Math.max(scale, 0.001)

  const oppositeForHandle = (
    handle: ResizeHandle
  ): { x: number; y: number } => {
    let x = bounds.x + bounds.width / 2
    let y = bounds.y + bounds.height / 2
    if (handle === "e" || handle === "ne" || handle === "se") x = bounds.x
    if (handle === "w" || handle === "nw" || handle === "sw")
      x = bounds.x + bounds.width
    if (handle === "s" || handle === "se" || handle === "sw") y = bounds.y
    if (handle === "n" || handle === "ne" || handle === "nw")
      y = bounds.y + bounds.height
    return { x, y }
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          outline: `${lineWidth}px solid var(--color-primary)`,
        }}
      />
      {HANDLES.map((h) => (
        <div
          key={h.id}
          onPointerDown={(e) => {
            const docEl = (e.currentTarget as HTMLDivElement).closest(
              "[data-doc-surface='true']"
            ) as HTMLElement | null
            if (!docEl) return
            const docRect = docEl.getBoundingClientRect()
            const pivot = oppositeForHandle(h.id)
            onResizeStart(e, h.id, {
              x: docRect.left + pivot.x * scale,
              y: docRect.top + pivot.y * scale,
            })
          }}
          className="pointer-events-auto absolute"
          style={{
            left: h.left,
            top: h.top,
            width: handlePx,
            height: handlePx,
            transform: `translate(-50%, -50%) scale(${inv})`,
            background: "var(--color-background)",
            border: "1.5px solid var(--color-primary)",
            borderRadius: 2,
            cursor: h.cursor,
            touchAction: "none",
            zIndex: 10,
          }}
        />
      ))}
      <div
        aria-hidden
        className="absolute"
        style={{
          left: "50%",
          top: 0,
          width: 0,
          height: rotateOffset * inv,
          borderLeft: "1px solid var(--color-primary)",
          transform: `translate(-50%, -100%)`,
          pointerEvents: "none",
        }}
      />
      <div
        onPointerDown={(e) => {
          const docEl = (e.currentTarget as HTMLDivElement).closest(
            "[data-doc-surface='true']"
          ) as HTMLElement | null
          if (!docEl) return
          const docRect = docEl.getBoundingClientRect()
          onRotateStart(e, {
            x: docRect.left + (bounds.x + bounds.width / 2) * scale,
            y: docRect.top + (bounds.y + bounds.height / 2) * scale,
          })
        }}
        className="pointer-events-auto absolute"
        style={{
          left: "50%",
          top: 0,
          width: handlePx + 3,
          height: handlePx + 3,
          transform: `translate(-50%, calc(-${rotateOffset}px * ${inv} - 50%)) scale(${inv})`,
          background: "var(--color-background)",
          border: "1.5px solid var(--color-primary)",
          borderRadius: "50%",
          cursor: "alias",
          touchAction: "none",
          zIndex: 10,
        }}
      />
    </div>
  )
}
