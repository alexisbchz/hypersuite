"use client"

import { useCallback, useEffect, useRef, useState, type RefObject } from "react"

import type { Layer } from "../../lib/types"
import type { ShapeDrawState } from "../types"

/** Shape tool: pointer-down creates a 1×1 layer, pointer-move expands it
 *  (Shift constrains to a square / circle), pointer-up commits. The
 *  in-flight layer id is held in a ref so we can patch it on every move
 *  without re-rendering for state changes. */
export function useShapeDraw(opts: {
  docRef: RefObject<HTMLDivElement | null>
  scale: number
  patch: (id: string, p: Partial<Layer>) => void
}) {
  const { docRef, scale, patch } = opts
  const [shapeDraw, setShapeDraw] = useState<ShapeDrawState | null>(null)
  const shapeDrawIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!shapeDraw) return
    const id = shapeDrawIdRef.current
    if (!id) return
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== shapeDraw.pointerId) return
      const docEl = docRef.current
      if (!docEl) return
      const rect = docEl.getBoundingClientRect()
      const x = (e.clientX - rect.left) / scale
      const y = (e.clientY - rect.top) / scale
      let dx = x - shapeDraw.startDocX
      let dy = y - shapeDraw.startDocY
      if (e.shiftKey) {
        const m = Math.max(Math.abs(dx), Math.abs(dy))
        dx = Math.sign(dx) * m || m
        dy = Math.sign(dy) * m || m
      }
      patch(id, {
        x: Math.round(dx < 0 ? shapeDraw.startDocX + dx : shapeDraw.startDocX),
        y: Math.round(dy < 0 ? shapeDraw.startDocY + dy : shapeDraw.startDocY),
        width: Math.max(1, Math.round(Math.abs(dx))),
        height: Math.max(1, Math.round(Math.abs(dy))),
      })
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== shapeDraw.pointerId) return
      setShapeDraw(null)
      shapeDrawIdRef.current = null
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
    }
  }, [shapeDraw, patch, scale, docRef])

  const startShapeDraw = useCallback(
    (state: ShapeDrawState, layerId: string) => {
      shapeDrawIdRef.current = layerId
      setShapeDraw(state)
    },
    []
  )

  return { shapeDraw, startShapeDraw }
}
