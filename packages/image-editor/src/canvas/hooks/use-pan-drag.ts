"use client"

import { useCallback, useEffect, useState } from "react"

import type { PanState } from "../types"

/** Spacebar / pan-tool drag — translates the pan offset by the pointer
 *  delta from the drag start. Pointer is captured globally so the drag
 *  follows the cursor even when it leaves the container. */
export function usePanDrag(opts: {
  panX: number
  panY: number
  setPan: (x: number, y: number) => void
}) {
  const { panX, panY, setPan } = opts
  const [pan, setPanState] = useState<PanState | null>(null)

  useEffect(() => {
    if (!pan) return
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pan.pointerId) return
      setPan(
        pan.startPanX + (e.clientX - pan.startClientX),
        pan.startPanY + (e.clientY - pan.startClientY)
      )
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pan.pointerId) return
      setPanState(null)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
    }
  }, [pan, setPan])

  const startPan = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      setPanState({
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPanX: panX,
        startPanY: panY,
      })
    },
    [panX, panY]
  )

  return { pan, startPan }
}
