"use client"

import { useCallback, useEffect, useState, type RefObject } from "react"

import { rotateVec, type Rect, type ResizeHandle } from "../../lib/geometry"
import type { Layer } from "../../lib/types"
import type {
  MultiResizeState,
  MultiRotateState,
  MultiTransformStart,
} from "../types"

/** Multi-selection scale + rotate. Both pivot around a stable point
 *  (resize: corner opposite the dragged handle; rotate: selection center)
 *  and patch every selected, non-locked layer's x/y/width/height/rotation
 *  in lockstep. They share enough math to live in one file. */
export function useMultiTransform(opts: {
  docRef: RefObject<HTMLDivElement | null>
  scale: number
  layers: Layer[]
  selectedIds: string[]
  patchMany: (ids: string[], updater: (l: Layer) => Partial<Layer>) => void
  commit: () => void
}) {
  const { docRef, scale, layers, selectedIds, patchMany, commit } = opts
  const [multiResize, setMultiResize] = useState<MultiResizeState | null>(null)
  const [multiRotate, setMultiRotate] = useState<MultiRotateState | null>(null)

  // Multi-resize
  useEffect(() => {
    if (!multiResize) return

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== multiResize.pointerId) return
      const dx = (e.clientX - multiResize.startClientX) / scale
      const dy = (e.clientY - multiResize.startClientY) / scale
      const moved = multiResize.moved || Math.hypot(dx, dy) > 1
      if (moved && !multiResize.committed) {
        commit()
        setMultiResize((s) => (s ? { ...s, committed: true, moved: true } : s))
      } else if (moved && !multiResize.moved) {
        setMultiResize((s) => (s ? { ...s, moved: true } : s))
      }

      const b = multiResize.bounds
      const h = multiResize.handle
      let newW = b.width
      let newH = b.height
      if (h === "e" || h === "ne" || h === "se") newW = b.width + dx
      if (h === "w" || h === "nw" || h === "sw") newW = b.width - dx
      if (h === "s" || h === "se" || h === "sw") newH = b.height + dy
      if (h === "n" || h === "ne" || h === "nw") newH = b.height - dy

      // Shift = uniform scale on corners
      const isCorner = h === "nw" || h === "ne" || h === "sw" || h === "se"
      if (e.shiftKey && isCorner) {
        const sx = newW / b.width
        const sy = newH / b.height
        const s = Math.abs(sx) > Math.abs(sy) ? sx : sy
        newW = b.width * s
        newH = b.height * s
      }

      newW = Math.max(1, newW)
      newH = Math.max(1, newH)

      const sx = newW / Math.max(1, b.width)
      const sy = newH / Math.max(1, b.height)
      const px = multiResize.pivot.x
      const py = multiResize.pivot.y

      patchMany(
        multiResize.starts.map((s) => s.id),
        (l) => {
          const start = multiResize.starts.find((s) => s.id === l.id)
          if (!start) return {}
          const cx = start.x + start.width / 2
          const cy = start.y + start.height / 2
          const newCx = px + (cx - px) * sx
          const newCy = py + (cy - py) * sy
          const w = Math.max(1, start.width * sx)
          const h2 = Math.max(1, start.height * sy)
          const p: Partial<Layer> = {
            x: Math.round(newCx - w / 2),
            y: Math.round(newCy - h2 / 2),
            width: Math.round(w),
            height: Math.round(h2),
          }
          if (start.fontSize)
            p.fontSize = Math.max(
              4,
              Math.round(start.fontSize * Math.min(sx, sy))
            )
          return p
        }
      )
    }

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== multiResize.pointerId) return
      setMultiResize(null)
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
    }
  }, [multiResize, scale, commit, patchMany])

  // Multi-rotate
  useEffect(() => {
    if (!multiRotate) return

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== multiRotate.pointerId) return
      if (!multiRotate.committed) {
        commit()
        setMultiRotate((s) => (s ? { ...s, committed: true } : s))
      }
      const angle = Math.atan2(
        e.clientY - multiRotate.cy,
        e.clientX - multiRotate.cx
      )
      let deltaDeg = ((angle - multiRotate.startAngle) * 180) / Math.PI
      if (e.shiftKey) deltaDeg = Math.round(deltaDeg / 15) * 15

      const docEl = docRef.current
      if (!docEl) return
      const docRect = docEl.getBoundingClientRect()
      const pivotDoc = {
        x: (multiRotate.cx - docRect.left) / scale,
        y: (multiRotate.cy - docRect.top) / scale,
      }

      patchMany(
        multiRotate.starts.map((s) => s.id),
        (l) => {
          const start = multiRotate.starts.find((s) => s.id === l.id)
          if (!start) return {}
          const cx = start.x + start.width / 2
          const cy = start.y + start.height / 2
          const offset = { x: cx - pivotDoc.x, y: cy - pivotDoc.y }
          const rotated = rotateVec(offset, deltaDeg)
          const newCx = pivotDoc.x + rotated.x
          const newCy = pivotDoc.y + rotated.y
          return {
            x: Math.round(newCx - start.width / 2),
            y: Math.round(newCy - start.height / 2),
            rotation: Math.round(start.rotation + deltaDeg),
          }
        }
      )
    }

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== multiRotate.pointerId) return
      setMultiRotate(null)
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
    }
  }, [multiRotate, scale, commit, patchMany, docRef])

  const startMultiResize = useCallback(
    (
      e: React.PointerEvent,
      handle: ResizeHandle,
      bounds: Rect,
      pivotClient: { x: number; y: number }
    ) => {
      if (e.button !== 0) return
      e.stopPropagation()
      e.preventDefault()
      const docEl = docRef.current
      if (!docEl) return
      const docRect = docEl.getBoundingClientRect()
      const pivotDoc = {
        x: (pivotClient.x - docRect.left) / scale,
        y: (pivotClient.y - docRect.top) / scale,
      }
      const sel = layers.filter((l) => selectedIds.includes(l.id) && !l.locked)
      const starts: MultiTransformStart[] = sel.map((l) => ({
        id: l.id,
        x: l.x,
        y: l.y,
        width: l.width,
        height: l.height,
        rotation: l.rotation,
        fontSize: l.fontSize,
      }))
      setMultiResize({
        pointerId: e.pointerId,
        handle,
        startClientX: e.clientX,
        startClientY: e.clientY,
        bounds,
        pivot: pivotDoc,
        starts,
        committed: false,
        moved: false,
      })
    },
    [scale, layers, selectedIds, docRef]
  )

  const startMultiRotate = useCallback(
    (e: React.PointerEvent, centerClient: { x: number; y: number }) => {
      if (e.button !== 0) return
      e.stopPropagation()
      e.preventDefault()
      const sel = layers.filter((l) => selectedIds.includes(l.id) && !l.locked)
      const starts: MultiTransformStart[] = sel.map((l) => ({
        id: l.id,
        x: l.x,
        y: l.y,
        width: l.width,
        height: l.height,
        rotation: l.rotation,
      }))
      setMultiRotate({
        pointerId: e.pointerId,
        cx: centerClient.x,
        cy: centerClient.y,
        startAngle: Math.atan2(
          e.clientY - centerClient.y,
          e.clientX - centerClient.x
        ),
        starts,
        committed: false,
      })
    },
    [layers, selectedIds]
  )

  return {
    multiResize,
    multiRotate,
    startMultiResize,
    startMultiRotate,
  }
}
