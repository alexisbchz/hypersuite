"use client"

import { useCallback, useEffect, useState, type RefObject } from "react"

import type { ZoomDragState } from "../types"

/** Zoom-rect tool: click-drag to frame an area to zoom into; click without
 *  drag to zoom 2× (Alt = zoom out). Same drag-update pattern as other
 *  state machines but writes back to global zoom/pan when complete. */
export function useZoomDrag(opts: {
  containerRef: RefObject<HTMLDivElement | null>
  docRef: RefObject<HTMLDivElement | null>
  zoom: number
  scale: number
  panX: number
  panY: number
  setZoom: (z: number) => void
  setPan: (x: number, y: number) => void
  zoomToRect: (
    rect: { x: number; y: number; width: number; height: number },
    viewport: { width: number; height: number }
  ) => void
}) {
  const {
    containerRef,
    docRef,
    zoom,
    scale,
    panX,
    panY,
    setZoom,
    setPan,
    zoomToRect,
  } = opts
  const [zoomDrag, setZoomDrag] = useState<ZoomDragState | null>(null)

  useEffect(() => {
    if (!zoomDrag) return
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== zoomDrag.pointerId) return
      const docEl = docRef.current
      if (!docEl) return
      const rect = docEl.getBoundingClientRect()
      const x = (e.clientX - rect.left) / scale
      const y = (e.clientY - rect.top) / scale
      setZoomDrag((z) => (z ? { ...z, curDocX: x, curDocY: y } : z))
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== zoomDrag.pointerId) return
      const containerEl = containerRef.current
      if (!containerEl) {
        setZoomDrag(null)
        return
      }
      const containerRect = containerEl.getBoundingClientRect()
      const dx = Math.abs(zoomDrag.curDocX - zoomDrag.startDocX)
      const dy = Math.abs(zoomDrag.curDocY - zoomDrag.startDocY)
      if (dx < 4 && dy < 4) {
        const factor = e.altKey ? 0.5 : 2
        const nextZoom = Math.round(Math.min(800, Math.max(5, zoom * factor)))
        const ns = nextZoom / 100
        const cx = e.clientX - (containerRect.left + containerRect.width / 2)
        const cy = e.clientY - (containerRect.top + containerRect.height / 2)
        const ratio = ns / scale
        setZoom(nextZoom)
        setPan(cx - (cx - panX) * ratio, cy - (cy - panY) * ratio)
      } else {
        const minX = Math.min(zoomDrag.startDocX, zoomDrag.curDocX)
        const minY = Math.min(zoomDrag.startDocY, zoomDrag.curDocY)
        zoomToRect(
          { x: minX, y: minY, width: dx, height: dy },
          { width: containerRect.width, height: containerRect.height }
        )
      }
      setZoomDrag(null)
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
    zoomDrag,
    scale,
    zoom,
    panX,
    panY,
    setZoom,
    setPan,
    zoomToRect,
    containerRef,
    docRef,
  ])

  const startZoomDrag = useCallback((state: ZoomDragState) => {
    setZoomDrag(state)
  }, [])

  return { zoomDrag, startZoomDrag }
}
