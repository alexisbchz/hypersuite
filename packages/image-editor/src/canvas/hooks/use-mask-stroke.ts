"use client"

import { useCallback, useEffect, useState, type RefObject } from "react"

import type { Layer } from "../../lib/types"
import { applyStroke } from "../utils"

export type MaskStrokeMode = "restore" | "erase"

export type MaskStrokeState = {
  pointerId: number
  layerId: string
  mode: MaskStrokeMode
}

/** Refine-mask brush. Paints into the layer's editable alpha mask:
 *  Restore = solid white (brush mode), Erase = destination-out (eraser
 *  mode). Reuses `applyStroke` unchanged — the mask is just an alpha
 *  buffer drawn with white. On pointer-up, snapshots the mask to a
 *  dataURL, patches the layer, and lets the RasterLayerView effect
 *  recompose `source × mask` into the live raster canvas. */
export function useMaskStroke(opts: {
  docRef: RefObject<HTMLDivElement | null>
  scale: number
  brushSize: number
  brushHardness: number
  getMaskCanvas: (id: string) => HTMLCanvasElement
  patch: (id: string, p: Partial<Layer>) => void
  commit: () => void
}) {
  const {
    docRef,
    scale,
    brushSize,
    brushHardness,
    getMaskCanvas,
    patch,
    commit,
  } = opts
  const [maskStroke, setMaskStroke] = useState<MaskStrokeState | null>(null)

  useEffect(() => {
    if (!maskStroke) return
    const canvas = getMaskCanvas(maskStroke.layerId)
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    let prev: { x: number; y: number } | null = null
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== maskStroke.pointerId) return
      const docEl = docRef.current
      if (!docEl) return
      const rect = docEl.getBoundingClientRect()
      const x = (e.clientX - rect.left) / scale
      const y = (e.clientY - rect.top) / scale
      const last = prev ?? { x, y }
      const strokeMode = maskStroke.mode === "restore" ? "brush" : "eraser"
      applyStroke(
        ctx,
        strokeMode,
        "#ffffff",
        brushSize,
        brushHardness,
        [last, { x, y }]
      )
      prev = { x, y }
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== maskStroke.pointerId) return
      try {
        const post = canvas.toDataURL("image/png")
        // Mark the mask canvas as in-sync with the new dataURL so a stale
        // ensureMaskCanvas call doesn't redecode and clobber strokes the
        // user just painted.
        ;(canvas as unknown as { __appliedMask?: string }).__appliedMask =
          post
        // Also invalidate the raster cache so the RasterLayerView effect
        // recomposes (its cache key includes maskDataUrl, which is about
        // to change via patch).
        patch(maskStroke.layerId, { maskDataUrl: post })
      } catch {
        // ignore — toDataURL can throw on tainted canvases (shouldn't
        // happen here since we built the canvas ourselves).
      }
      setMaskStroke(null)
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
    maskStroke,
    getMaskCanvas,
    scale,
    brushSize,
    brushHardness,
    patch,
    docRef,
  ])

  const startMaskStroke = useCallback(
    (state: MaskStrokeState) => {
      // Snapshot before the stroke so undo rewinds to the pre-stroke
      // mask. A single stroke = one history entry, matching the raster
      // brush behavior.
      commit()
      setMaskStroke(state)
    },
    [commit]
  )

  return { maskStroke, startMaskStroke }
}
