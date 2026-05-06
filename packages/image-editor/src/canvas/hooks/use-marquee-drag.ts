"use client"

import { useCallback, useEffect, useState, type RefObject } from "react"

import type { Layer } from "../../lib/types"
import type { MarqueeState } from "../types"

/** Marquee selection drag — empty-canvas pointer-down starts a rect; layers
 *  intersected by it become selected (additive when shift was held at
 *  start). The bg/locked/invisible layers are excluded. */
export function useMarqueeDrag(opts: {
  docRef: RefObject<HTMLDivElement | null>
  scale: number
  layers: Layer[]
  selectMany: (ids: string[]) => void
}) {
  const { docRef, scale, layers, selectMany } = opts
  const [marquee, setMarquee] = useState<MarqueeState | null>(null)

  useEffect(() => {
    if (!marquee) return
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== marquee.pointerId) return
      const docEl = docRef.current
      if (!docEl) return
      const rect = docEl.getBoundingClientRect()
      const x = (e.clientX - rect.left) / scale
      const y = (e.clientY - rect.top) / scale
      setMarquee((m) => (m ? { ...m, curDocX: x, curDocY: y } : m))

      const minX = Math.min(marquee.startDocX, x)
      const maxX = Math.max(marquee.startDocX, x)
      const minY = Math.min(marquee.startDocY, y)
      const maxY = Math.max(marquee.startDocY, y)
      const hits = layers
        .filter((l) => {
          if (l.id === "bg" || !l.visible || l.locked) return false
          const lr = l.x + l.width
          const lb = l.y + l.height
          return l.x < maxX && lr > minX && l.y < maxY && lb > minY
        })
        .map((l) => l.id)
      const merged = marquee.additive
        ? Array.from(new Set([...marquee.preselected, ...hits]))
        : hits
      selectMany(merged)
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== marquee.pointerId) return
      setMarquee(null)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
    }
  }, [marquee, scale, layers, selectMany, docRef])

  const startMarquee = useCallback((state: MarqueeState) => {
    setMarquee(state)
  }, [])

  return { marquee, startMarquee }
}
