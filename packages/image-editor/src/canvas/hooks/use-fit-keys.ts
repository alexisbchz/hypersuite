"use client"

import { useEffect, type RefObject } from "react"

import type { Layer } from "../../lib/types"

/** Cmd/Ctrl+1 → fit doc to viewport. Cmd/Ctrl+2 → fit current selection.
 *  Skipped when focus is in an input / contenteditable so the keys remain
 *  usable for typing. */
export function useFitKeys(opts: {
  containerRef: RefObject<HTMLDivElement | null>
  docW: number
  docH: number
  layers: Layer[]
  selectedIds: string[]
  zoomToRect: (
    rect: { x: number; y: number; width: number; height: number },
    viewport: { width: number; height: number }
  ) => void
}) {
  const { containerRef, docW, docH, layers, selectedIds, zoomToRect } = opts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      )
        return
      const meta = e.metaKey || e.ctrlKey
      if (!meta) return
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      if (e.key === "1") {
        e.preventDefault()
        zoomToRect(
          { x: 0, y: 0, width: docW, height: docH },
          { width: rect.width, height: rect.height }
        )
      } else if (e.key === "2") {
        if (!selectedIds.length) return
        e.preventDefault()
        const sel = layers.filter((l) => selectedIds.includes(l.id))
        if (!sel.length) return
        const minX = Math.min(...sel.map((l) => l.x))
        const minY = Math.min(...sel.map((l) => l.y))
        const maxX = Math.max(...sel.map((l) => l.x + l.width))
        const maxY = Math.max(...sel.map((l) => l.y + l.height))
        zoomToRect(
          { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
          { width: rect.width, height: rect.height }
        )
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [containerRef, docW, docH, layers, selectedIds, zoomToRect])
}
