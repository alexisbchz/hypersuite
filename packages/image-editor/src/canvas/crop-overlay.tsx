"use client"

import { useRef } from "react"

import type { Layer } from "../lib/types"
import type { CropHandle } from "./types"

/** Photoshop-style crop handle overlay rendered over a single image layer.
 *  Drags either the framed region (move) or one of the 8 handles to resize.
 *  Calls onCommit once at the start of a drag, then onCropChange repeatedly
 *  with the new rectangle so the editor can show a live preview without
 *  pushing every intermediate state onto the undo stack. */
export function CropOverlay({
  layer,
  scale,
  onCropChange,
  onCommit,
}: {
  layer: Layer
  scale: number
  onCropChange: (
    crop: { x: number; y: number; width: number; height: number } | null
  ) => void
  onCommit: () => void
}) {
  const crop = layer.crop ?? {
    x: 0,
    y: 0,
    width: layer.width,
    height: layer.height,
  }
  const inv = 1 / Math.max(scale, 0.001)
  const handlePx = 9
  const committedRef = useRef(false)

  const startDrag = (handle: CropHandle) => (e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    committedRef.current = false
    const startClientX = e.clientX
    const startClientY = e.clientY
    const start = { ...crop }

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startClientX) / scale
      const dy = (ev.clientY - startClientY) / scale
      let nx = start.x
      let ny = start.y
      let nw = start.width
      let nh = start.height

      if (handle === "move") {
        nx = start.x + dx
        ny = start.y + dy
        // Keep the crop fully inside the layer bounds while panning.
        nx = Math.max(0, Math.min(layer.width - start.width, nx))
        ny = Math.max(0, Math.min(layer.height - start.height, ny))
      } else {
        const east = handle === "e" || handle === "ne" || handle === "se"
        const west = handle === "w" || handle === "nw" || handle === "sw"
        const south = handle === "s" || handle === "se" || handle === "sw"
        const north = handle === "n" || handle === "ne" || handle === "nw"

        if (east) nw = start.width + dx
        if (west) {
          nw = start.width - dx
          nx = start.x + dx
        }
        if (south) nh = start.height + dy
        if (north) {
          nh = start.height - dy
          ny = start.y + dy
        }

        nx = Math.max(0, Math.min(layer.width - 1, nx))
        ny = Math.max(0, Math.min(layer.height - 1, ny))
        nw = Math.max(1, Math.min(layer.width - nx, nw))
        nh = Math.max(1, Math.min(layer.height - ny, nh))
      }

      if (!committedRef.current) {
        onCommit()
        committedRef.current = true
      }
      onCropChange({
        x: Math.round(nx),
        y: Math.round(ny),
        width: Math.round(nw),
        height: Math.round(nh),
      })
    }
    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }

  const dim: React.CSSProperties = {
    position: "absolute",
    background: "rgba(0,0,0,0.5)",
    pointerEvents: "none",
  }

  const corners: CropHandle[] = ["nw", "ne", "sw", "se"]
  const edges: CropHandle[] = ["n", "s", "e", "w"]

  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        style={{
          ...dim,
          left: 0,
          top: 0,
          width: layer.width,
          height: crop.y,
        }}
      />
      <div
        style={{
          ...dim,
          left: 0,
          top: crop.y + crop.height,
          width: layer.width,
          height: layer.height - crop.y - crop.height,
        }}
      />
      <div
        style={{
          ...dim,
          left: 0,
          top: crop.y,
          width: crop.x,
          height: crop.height,
        }}
      />
      <div
        style={{
          ...dim,
          left: crop.x + crop.width,
          top: crop.y,
          width: layer.width - crop.x - crop.width,
          height: crop.height,
        }}
      />
      <div
        onPointerDown={startDrag("move")}
        className="pointer-events-auto absolute"
        style={{
          left: crop.x,
          top: crop.y,
          width: crop.width,
          height: crop.height,
          cursor: "move",
          touchAction: "none",
          outline: `${1 * inv}px solid var(--color-primary)`,
        }}
      />
      {edges.map((h) => {
        const isHorizontal = h === "n" || h === "s"
        const left = isHorizontal
          ? crop.x + crop.width / 2
          : h === "e"
            ? crop.x + crop.width
            : crop.x
        const top = !isHorizontal
          ? crop.y + crop.height / 2
          : h === "s"
            ? crop.y + crop.height
            : crop.y
        return (
          <div
            key={h}
            onPointerDown={startDrag(h)}
            className="pointer-events-auto absolute"
            style={{
              left,
              top,
              width: isHorizontal ? handlePx * 2 : handlePx,
              height: isHorizontal ? handlePx : handlePx * 2,
              transform: `translate(-50%, -50%) scale(${inv})`,
              background: "var(--color-background)",
              border: "1.5px solid var(--color-primary)",
              borderRadius: 2,
              cursor: isHorizontal ? "ns-resize" : "ew-resize",
              touchAction: "none",
            }}
          />
        )
      })}
      {corners.map((c) => {
        const cx = c.includes("e") ? crop.x + crop.width : crop.x
        const cy = c.includes("s") ? crop.y + crop.height : crop.y
        return (
          <div
            key={c}
            onPointerDown={startDrag(c)}
            className="pointer-events-auto absolute"
            style={{
              left: cx,
              top: cy,
              width: handlePx,
              height: handlePx,
              transform: `translate(-50%, -50%) scale(${inv})`,
              background: "var(--color-background)",
              border: "1.5px solid var(--color-primary)",
              borderRadius: 2,
              cursor: c === "nw" || c === "se" ? "nwse-resize" : "nesw-resize",
              touchAction: "none",
            }}
          />
        )
      })}
    </div>
  )
}
