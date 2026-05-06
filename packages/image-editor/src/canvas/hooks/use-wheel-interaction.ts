"use client"

import { useEffect, useRef, type RefObject } from "react"

/** Mouse-wheel and trackpad gestures on the canvas:
 *  - Cmd/Ctrl + wheel → zoom anchored at the cursor (preserves the doc
 *    point under the cursor).
 *  - Plain wheel / two-finger trackpad → pan. Shift modifies vertical →
 *    horizontal in browsers that emit it.
 *
 *  Rapid events compose against a ref-tracked latest snapshot so each
 *  setState lands on top of the previous gesture's pending value rather
 *  than clobbering it with a stale closure. `deltaMode` is normalised so
 *  a notched mouse wheel zooms at the same rate as a smooth trackpad. */
export function useWheelInteraction(opts: {
  containerRef: RefObject<HTMLDivElement | null>
  zoom: number
  panX: number
  panY: number
  setZoom: (z: number) => void
  setPan: (x: number, y: number) => void
}) {
  const { containerRef, zoom, panX, panY, setZoom, setPan } = opts
  const wheelStateRef = useRef({ zoom, panX, panY })
  useEffect(() => {
    wheelStateRef.current = { zoom, panX, panY }
  }, [zoom, panX, panY])
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 800 : 1
      const dx = e.deltaX * k
      const dy = e.deltaY * k
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const rect = el.getBoundingClientRect()
        const cx = e.clientX - (rect.left + rect.width / 2)
        const cy = e.clientY - (rect.top + rect.height / 2)
        const s = wheelStateRef.current
        const factor = Math.exp(-dy * 0.003)
        const nextZoom = Math.min(800, Math.max(5, s.zoom * factor))
        const ratio = nextZoom / s.zoom
        const newPanX = cx - (cx - s.panX) * ratio
        const newPanY = cy - (cy - s.panY) * ratio
        wheelStateRef.current = {
          zoom: nextZoom,
          panX: newPanX,
          panY: newPanY,
        }
        setZoom(nextZoom)
        setPan(newPanX, newPanY)
      } else if (dx || dy) {
        e.preventDefault()
        const s = wheelStateRef.current
        const newPanX = s.panX - dx
        const newPanY = s.panY - dy
        wheelStateRef.current = { ...s, panX: newPanX, panY: newPanY }
        setPan(newPanX, newPanY)
      }
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [containerRef, setZoom, setPan])
}
