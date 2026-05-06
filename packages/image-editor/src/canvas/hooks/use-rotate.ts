"use client"

import { useCallback, useEffect, useState, type RefObject } from "react"

import type { Layer } from "../../lib/types"
import type { RotateState } from "../types"

/** Single-layer rotate handle: drag the circular handle above the
 *  selection box. Angle is measured from the layer center in client coords;
 *  shift snaps to 15° increments. */
export function useRotate(opts: {
  docRef: RefObject<HTMLDivElement | null>
  scale: number
  patch: (id: string, p: Partial<Layer>) => void
  commit: () => void
}) {
  const { docRef, scale, patch, commit } = opts
  const [rotate, setRotate] = useState<RotateState | null>(null)

  useEffect(() => {
    if (!rotate) return

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== rotate.pointerId) return
      if (!rotate.committed) {
        commit()
        setRotate((r) => (r ? { ...r, committed: true } : r))
      }
      const angle = Math.atan2(e.clientY - rotate.cy, e.clientX - rotate.cx)
      const deltaDeg = ((angle - rotate.startAngle) * 180) / Math.PI
      let next = rotate.startRotation + deltaDeg
      if (e.shiftKey) next = Math.round(next / 15) * 15
      patch(rotate.id, { rotation: Math.round(next) })
    }

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== rotate.pointerId) return
      setRotate(null)
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
    }
  }, [rotate, patch, commit])

  const startRotate = useCallback(
    (e: React.PointerEvent, layer: Layer) => {
      if (layer.locked) return
      if (e.button !== 0) return
      e.stopPropagation()
      e.preventDefault()
      const docEl = docRef.current
      if (!docEl) return
      const rect = docEl.getBoundingClientRect()
      const cx = rect.left + (layer.x + layer.width / 2) * scale
      const cy = rect.top + (layer.y + layer.height / 2) * scale
      const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx)
      setRotate({
        id: layer.id,
        pointerId: e.pointerId,
        cx,
        cy,
        startAngle,
        startRotation: layer.rotation,
        committed: false,
      })
    },
    [scale, docRef]
  )

  return { rotate, startRotate }
}
