"use client"

import { useCallback, useEffect, useState, type RefObject } from "react"

import type { Layer } from "../../lib/types"
import type { StrokeState } from "../types"
import { applyStroke } from "../utils"

/** Pencil / brush / eraser stroke on a raster layer. Paints directly into
 *  the layer's offscreen canvas via `applyStroke`; on pointer-up snapshots
 *  to a dataURL and patches the layer. The patch updates the rasterDataUrl
 *  *without* a fresh history entry — undo jumps from post-stroke back to
 *  pre-stroke (committed when the stroke started). */
export function useRasterStroke(opts: {
  docRef: RefObject<HTMLDivElement | null>
  scale: number
  brushColor: string
  brushSize: number
  brushHardness: number
  getRasterCanvas: (id: string) => HTMLCanvasElement
  patch: (id: string, p: Partial<Layer>) => void
  commitRaster: (id: string) => void
}) {
  const {
    docRef,
    scale,
    brushColor,
    brushSize,
    brushHardness,
    getRasterCanvas,
    patch,
    commitRaster,
  } = opts
  const [stroke, setStroke] = useState<StrokeState | null>(null)

  useEffect(() => {
    if (!stroke) return
    const canvas = getRasterCanvas(stroke.layerId)
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    let prev: { x: number; y: number } | null = null
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== stroke.pointerId) return
      const docEl = docRef.current
      if (!docEl) return
      const rect = docEl.getBoundingClientRect()
      const x = (e.clientX - rect.left) / scale
      const y = (e.clientY - rect.top) / scale
      const last = prev ?? { x, y }
      applyStroke(ctx, stroke.mode, brushColor, brushSize, brushHardness, [
        last,
        { x, y },
      ])
      prev = { x, y }
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== stroke.pointerId) return
      try {
        const post = canvas.toDataURL("image/png")
        ;(canvas as unknown as { __applied?: string }).__applied = post
        patch(stroke.layerId, { rasterDataUrl: post })
      } catch {
        commitRaster(stroke.layerId)
      }
      setStroke(null)
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
    stroke,
    getRasterCanvas,
    scale,
    brushColor,
    brushSize,
    brushHardness,
    commitRaster,
    patch,
    docRef,
  ])

  const startStroke = useCallback((state: StrokeState) => {
    setStroke(state)
  }, [])

  return { stroke, startStroke }
}
