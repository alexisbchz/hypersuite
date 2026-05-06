"use client"

import { useCallback, useEffect, useState } from "react"

import type { Layer } from "../../lib/types"
import {
  computeSnap,
  computeSpacingGuides,
  type Rect,
  type SpacingGuides,
} from "../../lib/geometry"
import type { DragState } from "../types"

/** Move-tool drag. Handles single-layer drag, shift-additive multi-drag,
 *  group expansion (selecting a group drags all descendants), edge + spacing
 *  snapping, and shift-axis-locking. Move events are coalesced via rAF so
 *  rapid pointer moves don't queue multiple patches in the same frame. */
export function useLayerDrag(opts: {
  layers: Layer[]
  selectedIds: string[]
  tool: string
  panMode: boolean
  scale: number
  snapPx: number
  snappingOn: boolean
  docW: number
  docH: number
  select: (
    id: string | null,
    opts?: { additive?: boolean; toggle?: boolean }
  ) => void
  patchMany: (ids: string[], updater: (l: Layer) => Partial<Layer>) => void
  commit: () => void
  setGuides: (g: { v: number[]; h: number[] }) => void
  setSpacingGuides: (g: SpacingGuides[]) => void
}) {
  const {
    layers,
    selectedIds,
    tool,
    panMode,
    scale,
    snapPx,
    snappingOn,
    docW,
    docH,
    select,
    patchMany,
    commit,
    setGuides,
    setSpacingGuides,
  } = opts
  const [drag, setDrag] = useState<DragState | null>(null)

  useEffect(() => {
    if (!drag) return

    const primary = layers.find((l) => l.id === drag.primaryId)

    let rafId: number | null = null
    let pending: PointerEvent | null = null
    const flush = () => {
      rafId = null
      const e = pending
      pending = null
      if (!e) return
      apply(e)
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return
      pending = e
      if (rafId === null) rafId = requestAnimationFrame(flush)
    }
    const apply = (e: PointerEvent) => {
      let dx = (e.clientX - drag.startClientX) / scale
      let dy = (e.clientY - drag.startClientY) / scale
      if (e.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0
        else dx = 0
      }
      const moved = drag.moved || Math.hypot(dx, dy) > 1
      if (moved && !drag.committed) {
        commit()
        setDrag((d) => (d ? { ...d, committed: true, moved: true } : d))
      } else if (moved && !drag.moved) {
        setDrag((d) => (d ? { ...d, moved: true } : d))
      }

      let snapDx = 0
      let snapDy = 0

      const primaryStart = drag.starts.get(drag.primaryId)
      if (!e.altKey && snappingOn && primary && primaryStart && moved) {
        const candidates: Rect[] = [{ x: 0, y: 0, width: docW, height: docH }]
        for (const l of layers) {
          if (drag.starts.has(l.id) || !l.visible) continue
          candidates.push({
            x: l.x,
            y: l.y,
            width: l.width,
            height: l.height,
          })
        }
        const draggedRect = {
          x: primaryStart.x + dx,
          y: primaryStart.y + dy,
          width: primary.width,
          height: primary.height,
        }
        const snap = computeSnap(draggedRect, candidates, snapPx)
        const spacing = computeSpacingGuides(
          draggedRect,
          candidates.slice(1),
          snapPx
        )
        snapDx = snap.dx !== 0 ? snap.dx : spacing.dx
        snapDy = snap.dy !== 0 ? snap.dy : spacing.dy
        setGuides({ v: snap.vGuides, h: snap.hGuides })
        setSpacingGuides(spacing.spacing)
      } else {
        setGuides({ v: [], h: [] })
        setSpacingGuides([])
      }

      const totalDx = dx + snapDx
      const totalDy = dy + snapDy

      patchMany(Array.from(drag.starts.keys()), (l) => {
        const s = drag.starts.get(l.id)
        if (!s) return {}
        return {
          x: Math.round(s.x + totalDx),
          y: Math.round(s.y + totalDy),
        }
      })
    }

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return
      if (rafId !== null) cancelAnimationFrame(rafId)
      rafId = null
      pending = null
      setDrag(null)
      setGuides({ v: [], h: [] })
      setSpacingGuides([])
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
    }
  }, [
    drag,
    patchMany,
    scale,
    commit,
    layers,
    snapPx,
    snappingOn,
    docW,
    docH,
    setGuides,
    setSpacingGuides,
  ])

  const startLayerDrag = useCallback(
    (e: React.PointerEvent, layer: Layer) => {
      if (layer.locked) return
      if (tool !== "move") return
      if (panMode) return
      if (e.button !== 0) return
      e.stopPropagation()
      e.preventDefault()

      let dragIds: string[]
      if (e.shiftKey) {
        if (selectedIds.includes(layer.id)) {
          select(layer.id, { toggle: true })
          return
        }
        select(layer.id, { additive: true })
        dragIds = [...selectedIds, layer.id]
      } else if (selectedIds.includes(layer.id)) {
        dragIds = selectedIds
      } else {
        select(layer.id)
        dragIds = [layer.id]
      }

      // Expand any selected groups to include their descendants.
      const expanded = new Set<string>(dragIds)
      const expand = (parentId: string) => {
        for (const child of layers) {
          if (child.parentId === parentId) {
            expanded.add(child.id)
            if (child.kind === "group") expand(child.id)
          }
        }
      }
      for (const id of dragIds) {
        const l = layers.find((ll) => ll.id === id)
        if (l?.kind === "group") expand(id)
      }
      const starts = new Map<string, { x: number; y: number }>()
      for (const id of expanded) {
        const l = layers.find((ll) => ll.id === id)
        if (l && !l.locked) starts.set(id, { x: l.x, y: l.y })
      }
      if (!starts.has(layer.id))
        starts.set(layer.id, { x: layer.x, y: layer.y })

      setDrag({
        primaryId: layer.id,
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        starts,
        shifted: e.shiftKey,
        moved: false,
        committed: false,
      })
    },
    [select, tool, panMode, selectedIds, layers]
  )

  return { drag, startLayerDrag }
}
