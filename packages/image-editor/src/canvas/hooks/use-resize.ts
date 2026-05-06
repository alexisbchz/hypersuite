"use client"

import { useCallback, useEffect, useState } from "react"

import type { Layer } from "../../lib/types"
import {
  computeSnap,
  edgesForHandle,
  resizeRotatedRect,
  toLocal,
  type Rect,
  type ResizeHandle,
} from "../../lib/geometry"
import type { ResizeState } from "../types"

/** Single-layer resize via the 8 handles on the selection box.
 *  Rotation-aware: the dragged handle's pointer delta is converted to the
 *  layer's local axis frame so the opposite handle stays world-anchored.
 *  Edge snapping is applied for axis-aligned (rotation === 0) layers. */
export function useResize(opts: {
  layers: Layer[]
  scale: number
  snapPx: number
  snappingOn: boolean
  docW: number
  docH: number
  patch: (id: string, p: Partial<Layer>) => void
  commit: () => void
  setGuides: (g: { v: number[]; h: number[] }) => void
}) {
  const {
    layers,
    scale,
    snapPx,
    snappingOn,
    docW,
    docH,
    patch,
    commit,
    setGuides,
  } = opts
  const [resize, setResize] = useState<ResizeState | null>(null)

  useEffect(() => {
    if (!resize) return
    const layer = layers.find((l) => l.id === resize.id)

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== resize.pointerId) return
      const dx = (e.clientX - resize.startClientX) / scale
      const dy = (e.clientY - resize.startClientY) / scale
      const moved = resize.moved || Math.hypot(dx, dy) > 1
      if (moved && !resize.committed) {
        commit()
        setResize((r) => (r ? { ...r, committed: true, moved: true } : r))
      } else if (moved && !resize.moved) {
        setResize((r) => (r ? { ...r, moved: true } : r))
      }

      const rotation = layer?.rotation ?? 0
      const local = toLocal(dx, dy, rotation)
      const start: Rect = {
        x: resize.startX,
        y: resize.startY,
        width: resize.startW,
        height: resize.startH,
      }
      const next = resizeRotatedRect(
        start,
        resize.handle,
        local,
        rotation,
        e.shiftKey
      )

      let snapDx = 0
      let snapDy = 0
      if (!e.altKey && snappingOn && rotation === 0) {
        const candidates: Rect[] = [
          { x: 0, y: 0, width: docW, height: docH },
        ]
        for (const l of layers) {
          if (l.id === resize.id || !l.visible) continue
          candidates.push({
            x: l.x,
            y: l.y,
            width: l.width,
            height: l.height,
          })
        }
        const snap = computeSnap(
          next,
          candidates,
          snapPx,
          edgesForHandle(resize.handle)
        )
        snapDx = snap.dx
        snapDy = snap.dy
        setGuides({ v: snap.vGuides, h: snap.hGuides })
      } else {
        setGuides({ v: [], h: [] })
      }

      let final = next
      if (snapDx !== 0 || snapDy !== 0) {
        const snappedLocal = toLocal(dx + snapDx, dy + snapDy, rotation)
        final = resizeRotatedRect(
          start,
          resize.handle,
          snappedLocal,
          rotation,
          e.shiftKey
        )
      }

      patch(resize.id, {
        x: Math.round(final.x),
        y: Math.round(final.y),
        width: Math.round(final.width),
        height: Math.round(final.height),
      })
    }

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== resize.pointerId) return
      setResize(null)
      setGuides({ v: [], h: [] })
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
    }
  }, [
    resize,
    patch,
    scale,
    commit,
    layers,
    snapPx,
    snappingOn,
    docW,
    docH,
    setGuides,
  ])

  const startResize = useCallback(
    (e: React.PointerEvent, layer: Layer, handle: ResizeHandle) => {
      if (layer.locked) return
      if (e.button !== 0) return
      e.stopPropagation()
      e.preventDefault()
      setResize({
        id: layer.id,
        handle,
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: layer.x,
        startY: layer.y,
        startW: layer.width,
        startH: layer.height,
        ratio: layer.height > 0 ? layer.width / layer.height : 1,
        committed: false,
        moved: false,
      })
    },
    []
  )

  return { resize, startResize }
}
