"use client"

import { useEffect, useRef, type RefObject } from "react"

/** Two-finger pinch-zoom and pan on the canvas container. Mirrors
 *  `use-wheel-interaction.ts`'s cursor-anchored zoom math, but anchored at
 *  the centroid of the two pointers — and also pans by the centroid's
 *  translation between frames, so a two-finger drag pans the doc.
 *
 *  When the second pointer hits, the hook dispatches a synthetic
 *  `pointercancel` for the first pointer so any in-flight single-pointer
 *  tool (raster stroke, layer drag, marquee) cleans up cleanly. The
 *  returned `gestureActiveRef` lets the canvas suppress tool-dispatch on
 *  subsequent pointer-downs while two fingers are active. */
export function usePinchGesture(opts: {
  containerRef: RefObject<HTMLDivElement | null>
  zoom: number
  panX: number
  panY: number
  setZoom: (z: number) => void
  setPan: (x: number, y: number) => void
}) {
  const { containerRef, zoom, panX, panY, setZoom, setPan } = opts

  // Latest snapshot read by event listeners — keeps gesture math against
  // the current React state without re-binding listeners every frame.
  const latestRef = useRef({ zoom, panX, panY })
  useEffect(() => {
    latestRef.current = { zoom, panX, panY }
  }, [zoom, panX, panY])

  // Exposed so the canvas can early-return from its onPointerDown while a
  // gesture is active (prevents pointer 2 from starting a new tool action).
  const gestureActiveRef = useRef(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const pointers = new Map<number, { x: number; y: number }>()
    let gesture:
      | {
          startDist: number
          startCenter: { x: number; y: number }
          startZoom: number
          startPan: { x: number; y: number }
        }
      | null = null
    // Guard so the synthetic pointercancel we fire to clean up other hooks
    // doesn't tear down our own pointer map mid-gesture.
    let suppressSelfCancel = false

    const centerOfMap = () => {
      let sx = 0
      let sy = 0
      for (const p of pointers.values()) {
        sx += p.x
        sy += p.y
      }
      return { x: sx / pointers.size, y: sy / pointers.size }
    }
    const distOfPair = () => {
      const it = pointers.values()
      const a = it.next().value
      const b = it.next().value
      if (!a || !b) return 0
      return Math.hypot(a.x - b.x, a.y - b.y)
    }
    const toCenterCoords = (p: { x: number; y: number }) => {
      const rect = el.getBoundingClientRect()
      return {
        x: p.x - (rect.left + rect.width / 2),
        y: p.y - (rect.top + rect.height / 2),
      }
    }

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.size === 2 && !gesture) {
        const s = latestRef.current
        gesture = {
          startDist: distOfPair(),
          startCenter: toCenterCoords(centerOfMap()),
          startZoom: s.zoom,
          startPan: { x: s.panX, y: s.panY },
        }
        gestureActiveRef.current = true
        // Tear down any in-flight single-pointer drag (each drag hook
        // filters by pointerId and listens for pointercancel on window).
        suppressSelfCancel = true
        for (const id of pointers.keys()) {
          try {
            window.dispatchEvent(
              new PointerEvent("pointercancel", {
                pointerId: id,
                bubbles: true,
              })
            )
          } catch {
            // Older browsers may not support PointerEvent constructor —
            // gesture still works, dangling single-pointer drag is the
            // worst case and self-resolves on the next pointerup.
          }
        }
        suppressSelfCancel = false
        // Prevent React's onPointerDown from firing for this pointer.
        e.stopPropagation()
        e.preventDefault()
      }
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return
      if (!pointers.has(e.pointerId)) return
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (!gesture || pointers.size !== 2) return
      e.preventDefault()
      e.stopPropagation()

      const curDist = distOfPair()
      const curCenter = toCenterCoords(centerOfMap())
      if (gesture.startDist <= 0) return

      const factor = curDist / gesture.startDist
      const nextZoom = Math.min(
        800,
        Math.max(5, gesture.startZoom * factor)
      )
      const ratio = nextZoom / gesture.startZoom
      const newPanX =
        curCenter.x - (gesture.startCenter.x - gesture.startPan.x) * ratio
      const newPanY =
        curCenter.y - (gesture.startCenter.y - gesture.startPan.y) * ratio

      latestRef.current = { zoom: nextZoom, panX: newPanX, panY: newPanY }
      setZoom(nextZoom)
      setPan(newPanX, newPanY)
    }

    const onUp = (e: PointerEvent) => {
      if (suppressSelfCancel) return
      if (!pointers.has(e.pointerId)) return
      pointers.delete(e.pointerId)
      if (pointers.size < 2) {
        gesture = null
        // Keep gestureActiveRef true while at least one finger is still
        // down so the remaining pointer doesn't suddenly re-enable tool
        // dispatch mid-touch. Clear when fully lifted.
        if (pointers.size === 0) gestureActiveRef.current = false
      }
    }

    el.addEventListener("pointerdown", onDown, {
      capture: true,
      passive: false,
    })
    el.addEventListener("pointermove", onMove, {
      capture: true,
      passive: false,
    })
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    return () => {
      el.removeEventListener("pointerdown", onDown, { capture: true })
      el.removeEventListener("pointermove", onMove, { capture: true })
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
    }
  }, [containerRef, setZoom, setPan])

  return { gestureActiveRef }
}
