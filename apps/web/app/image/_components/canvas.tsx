"use client"

import Image from "next/image"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ImageIcon } from "@hugeicons/core-free-icons"

import { useEditor } from "./editor-context"
import { cn } from "@workspace/ui/lib/utils"
import illustration from "../illustration.webp"
import { WelcomeScreen } from "./welcome-screen"
import type { Anchor, Layer } from "./types"
import {
  computeSnap,
  computeSpacingGuides,
  edgesForHandle,
  resizeRotatedRect,
  rotateVec,
  selectionBoundsOf,
  toLocal,
  type Rect,
  type ResizeHandle,
  type SpacingGuides,
} from "./geometry"
import { ensureFont, fontStack } from "./fonts"
import { hasSvgFilter, LayerSvgFilter, svgFilterId } from "./svg-filters"

const DEFAULT_DOC_W = 1200
const DEFAULT_DOC_H = 800
const SNAP_THRESHOLD = 6

type DragState = {
  primaryId: string
  pointerId: number
  startClientX: number
  startClientY: number
  starts: Map<string, { x: number; y: number }>
  shifted: boolean
  moved: boolean
  committed: boolean
}

type MarqueeState = {
  pointerId: number
  startDocX: number
  startDocY: number
  curDocX: number
  curDocY: number
  additive: boolean
  preselected: string[]
}

type ShapeDrawState = {
  pointerId: number
  startDocX: number
  startDocY: number
  curDocX: number
  curDocY: number
  variant: "rect" | "ellipse"
}

type StrokeState = {
  pointerId: number
  layerId: string
  mode: "pencil" | "brush" | "eraser"
}

type ZoomDragState = {
  pointerId: number
  startDocX: number
  startDocY: number
  curDocX: number
  curDocY: number
}


type ResizeState = {
  id: string
  handle: ResizeHandle
  pointerId: number
  startClientX: number
  startClientY: number
  startX: number
  startY: number
  startW: number
  startH: number
  ratio: number
  committed: boolean
  moved: boolean
}

type RotateState = {
  id: string
  pointerId: number
  cx: number
  cy: number
  startAngle: number
  startRotation: number
  committed: boolean
}

type MultiTransformStart = {
  id: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  fontSize?: number
}

type MultiResizeState = {
  pointerId: number
  handle: ResizeHandle
  startClientX: number
  startClientY: number
  bounds: Rect
  pivot: { x: number; y: number }
  starts: MultiTransformStart[]
  committed: boolean
  moved: boolean
}

type MultiRotateState = {
  pointerId: number
  cx: number
  cy: number
  startAngle: number
  starts: MultiTransformStart[]
  committed: boolean
}

type PanState = {
  pointerId: number
  startClientX: number
  startClientY: number
  startPanX: number
  startPanY: number
}

export function Canvas() {
  const {
    layers,
    selectedIds,
    isSelected,
    select,
    selectMany,
    zoom,
    setZoom,
    panX,
    panY,
    setPan,
    addImage,
    addText,
    addShape,
    addPath,
    updatePathAnchors,
    addRaster,
    getRasterCanvas,
    commitRaster,
    patch,
    patchMany,
    setTool,
    commit,
    tool,
    spacePressed,
    cursor,
    setCursor,
    zoomToRect,
    shapeVariant,
    brushSize,
    brushColor,
    brushHardness,
    setBrushColor,
    wandTolerance,
    pixelMask,
    setPixelMask,
    docSettings,
    prefs,
    viewToggles,
  } = useEditor()
  const scale = zoom / 100
  const DOC_W = docSettings?.width ?? DEFAULT_DOC_W
  const DOC_H = docSettings?.height ?? DEFAULT_DOC_H
  const snapPx = (prefs?.snapThreshold ?? SNAP_THRESHOLD) / scale
  const snappingOn = viewToggles?.snapping !== false
  const guidesOn = viewToggles?.guides !== false
  const containerRef = useRef<HTMLDivElement | null>(null)
  const docRef = useRef<HTMLDivElement | null>(null)
  const [fileDragging, setFileDragging] = useState(false)
  const dragDepth = useRef(0)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [resize, setResize] = useState<ResizeState | null>(null)
  const [rotate, setRotate] = useState<RotateState | null>(null)
  const [multiResize, setMultiResize] = useState<MultiResizeState | null>(null)
  const [multiRotate, setMultiRotate] = useState<MultiRotateState | null>(null)
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  useEffect(() => {
    if (editingTextId && !selectedIds.includes(editingTextId)) {
      setEditingTextId(null)
    }
  }, [editingTextId, selectedIds])

  // Smart font loading: ensure every font referenced by a text layer is fetched.
  useEffect(() => {
    const families = new Set<string>()
    for (const l of layers) {
      if (l.kind === "text" && l.fontFamily) families.add(l.fontFamily)
    }
    for (const f of families) void ensureFont(f)
  }, [layers])
  const [pan, setPanState] = useState<PanState | null>(null)
  const [marquee, setMarquee] = useState<MarqueeState | null>(null)
  const [shapeDraw, setShapeDraw] = useState<ShapeDrawState | null>(null)
  const shapeDrawIdRef = useRef<string | null>(null)
  const [stroke, setStroke] = useState<StrokeState | null>(null)
  const [zoomDrag, setZoomDrag] = useState<ZoomDragState | null>(null)
  const [penAnchors, setPenAnchors] = useState<Anchor[]>([])
  const [penHover, setPenHover] = useState<{ x: number; y: number } | null>(
    null
  )
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({
    v: [],
    h: [],
  })
  const [spacingGuides, setSpacingGuides] = useState<SpacingGuides[]>([])

  const panMode = tool === "pan" || spacePressed

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      dragDepth.current = 0
      setFileDragging(false)
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      )
      if (!files.length) return

      const rect = docRef.current?.getBoundingClientRect()
      const drop = rect
        ? {
            x: (e.clientX - rect.left) / scale,
            y: (e.clientY - rect.top) / scale,
          }
        : { x: DOC_W / 2, y: DOC_H / 2 }

      let offset = 0
      for (const file of files) {
        await addImage(file, {
          x: drop.x + offset,
          y: drop.y + offset,
        })
        offset += 24
      }
    },
    [scale, addImage]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!hasFiles(e)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (!hasFiles(e)) return
    e.preventDefault()
    dragDepth.current += 1
    setFileDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!hasFiles(e)) return
    e.preventDefault()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setFileDragging(false)
  }, [])

  // Layer move drag (handles multi-selection)
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
        const candidates: Rect[] = [
          { x: 0, y: 0, width: DOC_W, height: DOC_H },
        ]
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
        // Edge snap wins ties; spacing fills in any unfilled axis.
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
  }, [drag, patchMany, scale, commit, layers, snapPx, snappingOn, DOC_W, DOC_H])

  // Resize drag (rotation-aware; opposite handle stays world-anchored)
  useEffect(() => {
    if (!resize) return
    const layer = layers.find((l) => l.id === resize.id)

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== resize.pointerId) return
      const dx = (e.clientX - resize.startClientX) / scale
      const dy = (e.clientY - resize.startClientY) / scale
      const moved = resize.moved || Math.hypot(dx, dy) > 1
      if (moved && !resize.committed) {
        commit()
        setResize((r) => (r ? { ...r, committed: true, moved: true } : r))
      } else if (moved && !resize.moved) {
        setResize((r) => (r ? { ...r, moved: true } : r))
      }

      const rotation = layer?.rotation ?? 0
      const local = toLocal(dx, dy, rotation)
      const start: Rect = {
        x: resize.startX,
        y: resize.startY,
        width: resize.startW,
        height: resize.startH,
      }
      const next = resizeRotatedRect(
        start,
        resize.handle,
        local,
        rotation,
        e.shiftKey
      )

      // Snap moving edges to other layers + canvas (axis-aligned only — rotated
      // rects don't snap edges since edges aren't axis-aligned).
      let snapDx = 0
      let snapDy = 0
      if (!e.altKey && snappingOn && rotation === 0) {
        const candidates: Rect[] = [
          { x: 0, y: 0, width: DOC_W, height: DOC_H },
        ]
        for (const l of layers) {
          if (l.id === resize.id || !l.visible) continue
          candidates.push({
            x: l.x,
            y: l.y,
            width: l.width,
            height: l.height,
          })
        }
        const snap = computeSnap(
          next,
          candidates,
          snapPx,
          edgesForHandle(resize.handle)
        )
        snapDx = snap.dx
        snapDy = snap.dy
        setGuides({ v: snap.vGuides, h: snap.hGuides })
      } else {
        setGuides({ v: [], h: [] })
      }

      // Apply edge snap by re-running resize with adjusted local delta.
      let final = next
      if (snapDx !== 0 || snapDy !== 0) {
        const snappedLocal = toLocal(dx + snapDx, dy + snapDy, rotation)
        final = resizeRotatedRect(
          start,
          resize.handle,
          snappedLocal,
          rotation,
          e.shiftKey
        )
      }

      patch(resize.id, {
        x: Math.round(final.x),
        y: Math.round(final.y),
        width: Math.round(final.width),
        height: Math.round(final.height),
      })
    }

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== resize.pointerId) return
      setResize(null)
      setGuides({ v: [], h: [] })
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
    }
  }, [resize, patch, scale, commit, layers])

  // Rotate drag
  useEffect(() => {
    if (!rotate) return

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== rotate.pointerId) return
      if (!rotate.committed) {
        commit()
        setRotate((r) => (r ? { ...r, committed: true } : r))
      }
      const angle = Math.atan2(e.clientY - rotate.cy, e.clientX - rotate.cx)
      const deltaDeg = ((angle - rotate.startAngle) * 180) / Math.PI
      let next = rotate.startRotation + deltaDeg
      if (e.shiftKey) next = Math.round(next / 15) * 15
      patch(rotate.id, { rotation: Math.round(next) })
    }

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== rotate.pointerId) return
      setRotate(null)
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
    }
  }, [rotate, patch, commit])

  // Multi-select resize: scale all selected layers around the pivot opposite
  // the dragged handle.
  useEffect(() => {
    if (!multiResize) return

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== multiResize.pointerId) return
      const dx = (e.clientX - multiResize.startClientX) / scale
      const dy = (e.clientY - multiResize.startClientY) / scale
      const moved = multiResize.moved || Math.hypot(dx, dy) > 1
      if (moved && !multiResize.committed) {
        commit()
        setMultiResize((s) =>
          s ? { ...s, committed: true, moved: true } : s
        )
      } else if (moved && !multiResize.moved) {
        setMultiResize((s) => (s ? { ...s, moved: true } : s))
      }

      const b = multiResize.bounds
      const h = multiResize.handle
      let newW = b.width
      let newH = b.height
      if (h === "e" || h === "ne" || h === "se") newW = b.width + dx
      if (h === "w" || h === "nw" || h === "sw") newW = b.width - dx
      if (h === "s" || h === "se" || h === "sw") newH = b.height + dy
      if (h === "n" || h === "ne" || h === "nw") newH = b.height - dy

      // Shift = uniform scale on corners
      const isCorner = h === "nw" || h === "ne" || h === "sw" || h === "se"
      if (e.shiftKey && isCorner) {
        const sx = newW / b.width
        const sy = newH / b.height
        const s = Math.abs(sx) > Math.abs(sy) ? sx : sy
        newW = b.width * s
        newH = b.height * s
      }

      newW = Math.max(1, newW)
      newH = Math.max(1, newH)

      const sx = newW / Math.max(1, b.width)
      const sy = newH / Math.max(1, b.height)
      const px = multiResize.pivot.x
      const py = multiResize.pivot.y

      patchMany(
        multiResize.starts.map((s) => s.id),
        (l) => {
          const start = multiResize.starts.find((s) => s.id === l.id)
          if (!start) return {}
          const cx = start.x + start.width / 2
          const cy = start.y + start.height / 2
          const newCx = px + (cx - px) * sx
          const newCy = py + (cy - py) * sy
          const newW = Math.max(1, start.width * sx)
          const newH = Math.max(1, start.height * sy)
          const patch: Partial<Layer> = {
            x: Math.round(newCx - newW / 2),
            y: Math.round(newCy - newH / 2),
            width: Math.round(newW),
            height: Math.round(newH),
          }
          if (start.fontSize)
            patch.fontSize = Math.max(
              4,
              Math.round(start.fontSize * Math.min(sx, sy))
            )
          return patch
        }
      )
    }

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== multiResize.pointerId) return
      setMultiResize(null)
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
    }
  }, [multiResize, scale, commit, patchMany])

  // Multi-select rotate: rotate all selected layers around the selection center.
  useEffect(() => {
    if (!multiRotate) return

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== multiRotate.pointerId) return
      if (!multiRotate.committed) {
        commit()
        setMultiRotate((s) => (s ? { ...s, committed: true } : s))
      }
      const angle = Math.atan2(
        e.clientY - multiRotate.cy,
        e.clientX - multiRotate.cx
      )
      let deltaDeg = ((angle - multiRotate.startAngle) * 180) / Math.PI
      if (e.shiftKey) deltaDeg = Math.round(deltaDeg / 15) * 15

      const docEl = docRef.current
      if (!docEl) return
      const docRect = docEl.getBoundingClientRect()
      const pivotDoc = {
        x: (multiRotate.cx - docRect.left) / scale,
        y: (multiRotate.cy - docRect.top) / scale,
      }

      patchMany(
        multiRotate.starts.map((s) => s.id),
        (l) => {
          const start = multiRotate.starts.find((s) => s.id === l.id)
          if (!start) return {}
          const cx = start.x + start.width / 2
          const cy = start.y + start.height / 2
          const offset = { x: cx - pivotDoc.x, y: cy - pivotDoc.y }
          const rotated = rotateVec(offset, deltaDeg)
          const newCx = pivotDoc.x + rotated.x
          const newCy = pivotDoc.y + rotated.y
          return {
            x: Math.round(newCx - start.width / 2),
            y: Math.round(newCy - start.height / 2),
            rotation: Math.round(start.rotation + deltaDeg),
          }
        }
      )
    }

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== multiRotate.pointerId) return
      setMultiRotate(null)
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
    }
  }, [multiRotate, scale, commit, patchMany])

  // Shape draw
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
  }, [shapeDraw, patch, scale])

  // Raster stroke
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
      applyStroke(
        ctx,
        stroke.mode,
        brushColor,
        brushSize,
        brushHardness,
        [last, { x, y }]
      )
      prev = { x, y }
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== stroke.pointerId) return
      // Snapshot post-stroke pixels into the layer (transient patch — does
      // not push another history entry, so undo jumps from post-stroke back
      // to pre-stroke in one step).
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
  ])

  // Zoom drag
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
        // Click — zoom 2× in or out (alt)
        const factor = e.altKey ? 0.5 : 2
        const nextZoom = Math.round(
          Math.min(800, Math.max(5, zoom * factor))
        )
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
  }, [zoomDrag, scale, zoom, panX, panY, setZoom, setPan, zoomToRect])

  // Marquee drag
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
  }, [marquee, scale, layers, selectMany])

  // Pan drag
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

  // Cmd+1 fit-doc, Cmd+2 fit-selection
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
          { x: 0, y: 0, width: DOC_W, height: DOC_H },
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
  }, [zoomToRect, selectedIds, layers])

  // Wheel zoom (Cmd/Ctrl) and trackpad pan
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const rect = el.getBoundingClientRect()
        const cx = e.clientX - (rect.left + rect.width / 2)
        const cy = e.clientY - (rect.top + rect.height / 2)
        const factor = Math.exp(-e.deltaY * 0.0015)
        const nextZoom = Math.round(
          Math.min(800, Math.max(5, zoom * factor))
        )
        const nextScale = nextZoom / 100
        const ratio = nextScale / scale
        const newPanX = cx - (cx - panX) * ratio
        const newPanY = cy - (cy - panY) * ratio
        setZoom(nextZoom)
        setPan(newPanX, newPanY)
      } else if (Math.abs(e.deltaX) > 0 || Math.abs(e.deltaY) > 0) {
        // Trackpad two-finger pan; mouse wheel will also pan vertically
        e.preventDefault()
        setPan(panX - e.deltaX, panY - e.deltaY)
      }
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [zoom, scale, panX, panY, setZoom, setPan])

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
          // Toggle off (don't drag)
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

      // Expand any selected groups to include their descendants
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
      if (!starts.has(layer.id)) starts.set(layer.id, { x: layer.x, y: layer.y })

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

  const startResize = useCallback(
    (e: React.PointerEvent, layer: Layer, handle: ResizeHandle) => {
      if (layer.locked) return
      if (e.button !== 0) return
      e.stopPropagation()
      e.preventDefault()
      setResize({
        id: layer.id,
        handle,
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: layer.x,
        startY: layer.y,
        startW: layer.width,
        startH: layer.height,
        ratio: layer.height > 0 ? layer.width / layer.height : 1,
        committed: false,
        moved: false,
      })
    },
    []
  )

  const startRotate = useCallback(
    (e: React.PointerEvent, layer: Layer) => {
      if (layer.locked) return
      if (e.button !== 0) return
      e.stopPropagation()
      e.preventDefault()
      const docEl = docRef.current
      if (!docEl) return
      const rect = docEl.getBoundingClientRect()
      const cx = rect.left + (layer.x + layer.width / 2) * scale
      const cy = rect.top + (layer.y + layer.height / 2) * scale
      const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx)
      setRotate({
        id: layer.id,
        pointerId: e.pointerId,
        cx,
        cy,
        startAngle,
        startRotation: layer.rotation,
        committed: false,
      })
    },
    [scale]
  )

  const startMultiResize = useCallback(
    (
      e: React.PointerEvent,
      handle: ResizeHandle,
      bounds: Rect,
      pivotClient: { x: number; y: number }
    ) => {
      if (e.button !== 0) return
      e.stopPropagation()
      e.preventDefault()
      const docEl = docRef.current
      if (!docEl) return
      const docRect = docEl.getBoundingClientRect()
      const pivotDoc = {
        x: (pivotClient.x - docRect.left) / scale,
        y: (pivotClient.y - docRect.top) / scale,
      }
      const sel = layers.filter(
        (l) => selectedIds.includes(l.id) && !l.locked
      )
      const starts: MultiTransformStart[] = sel.map((l) => ({
        id: l.id,
        x: l.x,
        y: l.y,
        width: l.width,
        height: l.height,
        rotation: l.rotation,
        fontSize: l.fontSize,
      }))
      setMultiResize({
        pointerId: e.pointerId,
        handle,
        startClientX: e.clientX,
        startClientY: e.clientY,
        bounds,
        pivot: pivotDoc,
        starts,
        committed: false,
        moved: false,
      })
    },
    [scale, layers, selectedIds]
  )

  const startMultiRotate = useCallback(
    (e: React.PointerEvent, centerClient: { x: number; y: number }) => {
      if (e.button !== 0) return
      e.stopPropagation()
      e.preventDefault()
      const sel = layers.filter(
        (l) => selectedIds.includes(l.id) && !l.locked
      )
      const starts: MultiTransformStart[] = sel.map((l) => ({
        id: l.id,
        x: l.x,
        y: l.y,
        width: l.width,
        height: l.height,
        rotation: l.rotation,
      }))
      setMultiRotate({
        pointerId: e.pointerId,
        cx: centerClient.x,
        cy: centerClient.y,
        startAngle: Math.atan2(
          e.clientY - centerClient.y,
          e.clientX - centerClient.x
        ),
        starts,
        committed: false,
      })
    },
    [layers, selectedIds]
  )

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

  const onContainerPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 1 || panMode) {
        startPan(e)
        return
      }
      if (e.button !== 0) return
      const docEl = docRef.current
      if (!docEl) return
      const rect = docEl.getBoundingClientRect()
      const docX = (e.clientX - rect.left) / scale
      const docY = (e.clientY - rect.top) / scale

      if (tool === "text") {
        if (docX < 0 || docX > DOC_W || docY < 0 || docY > DOC_H) return
        e.preventDefault()
        addText({ x: docX, y: docY })
        setTool("move")
        return
      }

      if (tool === "shape") {
        e.preventDefault()
        commit()
        const id = addShape({
          x: docX,
          y: docY,
          width: 1,
          height: 1,
          variant: shapeVariant,
        })
        shapeDrawIdRef.current = id
        setShapeDraw({
          pointerId: e.pointerId,
          startDocX: docX,
          startDocY: docY,
          curDocX: docX,
          curDocY: docY,
          variant: shapeVariant,
        })
        return
      }

      if (tool === "pen") {
        if (docX < 0 || docX > DOC_W || docY < 0 || docY > DOC_H) return
        e.preventDefault()
        // Click first anchor to close (within 8 doc px)
        if (penAnchors.length >= 3) {
          const first = penAnchors[0]!
          if (Math.hypot(docX - first.x, docY - first.y) < 8 / scale) {
            addPath({
              anchors: penAnchors,
              closed: true,
              strokeWidth: 2,
              color: brushColor,
            })
            setPenAnchors([])
            setPenHover(null)
            return
          }
        }
        // Add a corner anchor; drag to convert into a smooth bezier anchor.
        const newAnchor: Anchor = { x: docX, y: docY }
        setPenAnchors((a) => [...a, newAnchor])
        const anchorIdx = penAnchors.length
        const startClientX = e.clientX
        const startClientY = e.clientY
        let dragged = false
        const onMove = (ev: PointerEvent) => {
          const dx = (ev.clientX - startClientX) / scale
          const dy = (ev.clientY - startClientY) / scale
          if (!dragged && Math.hypot(dx, dy) < 2) return
          dragged = true
          setPenAnchors((all) => {
            const next = all.slice()
            const a = next[anchorIdx]
            if (!a) return all
            next[anchorIdx] = {
              ...a,
              hOut: { x: a.x + dx, y: a.y + dy },
              hIn: { x: a.x - dx, y: a.y - dy },
            }
            return next
          })
        }
        const onUp = () => {
          window.removeEventListener("pointermove", onMove)
          window.removeEventListener("pointerup", onUp)
        }
        window.addEventListener("pointermove", onMove)
        window.addEventListener("pointerup", onUp)
        return
      }

      if (tool === "pencil" || tool === "brush" || tool === "eraser") {
        if (docX < 0 || docX > DOC_W || docY < 0 || docY > DOC_H) return
        e.preventDefault()

        // Find or create a raster layer
        let layerId: string | null = null
        if (selectedIds.length === 1) {
          const sel = layers.find((l) => l.id === selectedIds[0])
          if (sel?.kind === "raster") layerId = sel.id
        }
        if (!layerId) {
          if (tool === "eraser") return // need a raster to erase
          layerId = addRaster({ width: DOC_W, height: DOC_H })
        }

        const canvas = getRasterCanvas(layerId)
        if (canvas.width === 0 || canvas.height === 0) {
          canvas.width = DOC_W
          canvas.height = DOC_H
        }

        // Snapshot pre-stroke pixels into the layer so global history
        // captures them, then commit history. After this commit, the layer
        // record reflects pre-stroke pixels; undo will restore them.
        let preDataUrl: string | null = null
        try {
          // If canvas is empty (transparent), this still produces a valid PNG
          preDataUrl = canvas.toDataURL("image/png")
        } catch {
          preDataUrl = null
        }
        // Mark the canvas as already-applied for this dataUrl so the
        // RasterLayerView's hydrate effect doesn't redundantly repaint.
        ;(canvas as unknown as { __applied?: string }).__applied =
          preDataUrl ?? ""
        // Set the pre-stroke pixels onto the layer record (transient patch
        // is fine; we only need it captured by the immediately-following
        // commit).
        patch(layerId, { rasterDataUrl: preDataUrl })
        commit()

        const ctx = canvas.getContext("2d")
        if (!ctx) return
        applyStroke(ctx, tool, brushColor, brushSize, brushHardness, [
          { x: docX, y: docY },
          { x: docX + 0.01, y: docY + 0.01 },
        ])
        setStroke({ pointerId: e.pointerId, layerId, mode: tool })
        return
      }

      if (tool === "picker") {
        if (docX < 0 || docX > DOC_W || docY < 0 || docY > DOC_H) return
        e.preventDefault()
        sampleColorAt(docX, docY, layers, getRasterCanvas).then((color) => {
          if (!color) return
          setBrushColor(color)
          if (selectedIds.length === 1) {
            const sel = layers.find((l) => l.id === selectedIds[0])
            if (sel && sel.kind !== "raster") {
              patch(sel.id, { color })
            }
          }
        })
        return
      }

      if (tool === "wand") {
        if (docX < 0 || docX > DOC_W || docY < 0 || docY > DOC_H) return
        e.preventDefault()
        const mask = floodFillMask(
          layers,
          getRasterCanvas,
          Math.round(docX),
          Math.round(docY),
          wandTolerance,
          DOC_W,
          DOC_H
        )
        setPixelMask(mask)
        return
      }

      if (tool === "zoom") {
        // Only zoom when clicking on empty canvas / doc background — clicks
        // on layers should fall through to layer selection.
        const target = e.target as HTMLElement
        const onCanvasBg =
          target === e.currentTarget || target === docRef.current
        if (!onCanvasBg) return
        e.preventDefault()
        setZoomDrag({
          pointerId: e.pointerId,
          startDocX: docX,
          startDocY: docY,
          curDocX: docX,
          curDocY: docY,
        })
        return
      }

      // Marquee on canvas background
      const target = e.target as HTMLElement
      const onBg = target === e.currentTarget
      if (!onBg && tool !== "marquee") return
      e.preventDefault()
      setMarquee({
        pointerId: e.pointerId,
        startDocX: docX,
        startDocY: docY,
        curDocX: docX,
        curDocY: docY,
        additive: e.shiftKey,
        preselected: e.shiftKey ? selectedIds : [],
      })
      if (!e.shiftKey) select(null)
    },
    [
      panMode,
      startPan,
      scale,
      tool,
      selectedIds,
      select,
      addText,
      addShape,
      shapeVariant,
      addPath,
      addRaster,
      getRasterCanvas,
      brushColor,
      brushSize,
      brushHardness,
      setBrushColor,
      patch,
      commit,
      setTool,
      penAnchors,
      layers,
      wandTolerance,
      setPixelMask,
    ]
  )


  const onPointerMoveCanvas = useCallback(
    (e: React.PointerEvent) => {
      const rect = docRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = (e.clientX - rect.left) / scale
      const y = (e.clientY - rect.top) / scale
      if (x >= 0 && x <= DOC_W && y >= 0 && y <= DOC_H) {
        setCursor({ x, y })
        if (tool === "pen" && penAnchors.length) setPenHover({ x, y })
      } else {
        setCursor(null)
        if (tool === "pen") setPenHover(null)
      }
    },
    [scale, setCursor, tool, penAnchors.length]
  )

  // Pen Esc/Enter
  useEffect(() => {
    if (tool !== "pen") return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPenAnchors([])
        setPenHover(null)
      } else if (e.key === "Enter") {
        if (penAnchors.length >= 2) {
          addPath({
            anchors: penAnchors,
            closed: false,
            strokeWidth: 2,
            color: brushColor,
          })
        }
        setPenAnchors([])
        setPenHover(null)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [tool, penAnchors, addPath, brushColor])

  // Reset pen state when switching tools away
  useEffect(() => {
    if (tool !== "pen" && penAnchors.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPenAnchors([])
      setPenHover(null)
    }
  }, [tool, penAnchors.length])

  // Clear wand mask when switching away from wand
  useEffect(() => {
    if (tool !== "wand" && pixelMask) {
      setPixelMask(null)
    }
  }, [tool, pixelMask, setPixelMask])

  const cursorClass = useMemo(() => {
    if (pan) return "cursor-grabbing select-none"
    if (panMode) return "cursor-grab"
    if (drag) return "cursor-grabbing select-none"
    return ""
  }, [pan, panMode, drag])

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex flex-1 items-center justify-center overflow-hidden bg-[color-mix(in_oklch,var(--color-muted),var(--color-background)_30%)]",
        cursorClass
      )}
      onPointerDown={onContainerPointerDown}
      onPointerMove={onPointerMoveCanvas}
      onPointerLeave={() => setCursor(null)}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CheckerBackground />
      {layers.length === 0 ? (
        <WelcomeScreen />
      ) : (
        <>
          {viewToggles?.rulers && (
            <Rulers
              docW={DOC_W}
              docH={DOC_H}
              scale={scale}
              panX={panX}
              panY={panY}
            />
          )}
        </>
      )}
      <div
        ref={docRef}
        data-doc-surface="true"
        hidden={layers.length === 0}
        className="relative shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.18),0_40px_80px_-32px_rgba(0,0,0,0.25)] ring-1 ring-border"
        style={{
          width: DOC_W,
          height: DOC_H,
          background: docSettings?.background ?? "var(--color-background)",
          backgroundImage: viewToggles?.grid
            ? "linear-gradient(to right, color-mix(in oklch, var(--color-foreground), transparent 90%) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklch, var(--color-foreground), transparent 90%) 1px, transparent 1px)"
            : undefined,
          backgroundSize: viewToggles?.grid ? "20px 20px" : undefined,
          transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        <svg
          aria-hidden
          width="0"
          height="0"
          className="pointer-events-none absolute"
          style={{ width: 0, height: 0, overflow: "visible" }}
        >
          <defs>
            {layers.map((l) =>
              hasSvgFilter(l.filters) ? (
                <LayerSvgFilter
                  key={l.id}
                  id={svgFilterId(l.id)}
                  filters={l.filters!}
                />
              ) : null
            )}
          </defs>
        </svg>
        {layers
          .slice()
          .reverse()
          .map((l) => {
            if (!l.visible) return null
            if (l.kind === "group") return null
            // Cascade visibility through ancestor groups
            let cur: Layer | undefined = l
            let blocked = false
            while (cur?.parentId) {
              const parent = layers.find((p) => p.id === cur!.parentId)
              if (!parent) break
              if (!parent.visible) {
                blocked = true
                break
              }
              cur = parent
            }
            if (blocked) return null
            const selected = isSelected(l.id)
            const draggable = !l.locked && tool === "move" && !panMode
            const showHandles =
              selected && !l.locked && !panMode && selectedIds.length === 1
            const fx = l.effects ?? {}
            const filterParts: string[] = []
            const adj = l.adjustments
            if (adj?.brightness) filterParts.push(`brightness(${1 + adj.brightness / 100})`)
            if (adj?.contrast) filterParts.push(`contrast(${1 + adj.contrast / 100})`)
            if (adj?.saturation) filterParts.push(`saturate(${1 + adj.saturation / 100})`)
            if (adj?.hue) filterParts.push(`hue-rotate(${adj.hue}deg)`)
            if (fx.blur) filterParts.push(`blur(${fx.blur}px)`)
            if (fx.shadow)
              filterParts.push(
                `drop-shadow(${fx.shadow.x}px ${fx.shadow.y}px ${fx.shadow.blur}px ${fx.shadow.color})`
              )
            if (hasSvgFilter(l.filters))
              filterParts.push(`url(#${svgFilterId(l.id)})`)
            const filter = filterParts.join(" ") || undefined
            // Inner shadow is approximated via inset box-shadow (works for
            // shapes; text/image fall back to filter-style emulation).
            const innerBox = fx.innerShadow
              ? `inset ${fx.innerShadow.x}px ${fx.innerShadow.y}px ${fx.innerShadow.blur}px ${fx.innerShadow.color}`
              : undefined
            const strokeOutline = fx.stroke
              ? `${fx.stroke.width}px solid ${fx.stroke.color}`
              : undefined

            const common = {
              className: cn(
                "absolute select-none outline-none",
                selected && !panMode && "ring-1 ring-primary",
                draggable
                  ? drag?.primaryId === l.id
                    ? "cursor-grabbing"
                    : "cursor-grab"
                  : "cursor-default"
              ),
              style: {
                left: l.x,
                top: l.y,
                width: l.width,
                height: l.height,
                opacity: l.opacity / 100,
                mixBlendMode: l.blendMode as React.CSSProperties["mixBlendMode"],
                transform: `rotate(${l.rotation}deg)`,
                touchAction: "none",
                filter,
                boxShadow: innerBox,
                outline: strokeOutline,
                outlineOffset: strokeOutline ? 0 : undefined,
                clipPath: l.crop
                  ? `inset(${l.crop.y}px ${l.width - l.crop.x - l.crop.width}px ${l.height - l.crop.y - l.crop.height}px ${l.crop.x}px)`
                  : undefined,
                // Locked layers don't catch canvas clicks — clicks pass
                // through so layers underneath can be selected. Lock UI
                // lives in the Layers panel.
                pointerEvents: l.locked ? "none" : undefined,
              } as React.CSSProperties,
              onPointerDown: (e: React.PointerEvent) => {
                // Tools that act on the doc background (zoom, picker, wand,
                // marquee, pen, shape, raster strokes, text) shouldn't fire
                // when the user clicks a layer. Stop propagation so the
                // container handler skips this click. Painting tools still
                // need to start strokes that may begin on top of layers, so
                // for those we let propagation continue.
                if (l.locked) return
                if (panMode) return
                const paintingTool =
                  tool === "pencil" ||
                  tool === "brush" ||
                  tool === "eraser" ||
                  tool === "shape"
                if (!paintingTool) {
                  e.stopPropagation()
                }
                if (tool === "move") {
                  startLayerDrag(e, l)
                }
              },
              onMouseDown: (e: React.MouseEvent) => {
                e.stopPropagation()
                if (panMode) return
                if (l.locked) return
                if (e.shiftKey) return // handled in pointerdown
                if (!selectedIds.includes(l.id)) select(l.id)
              },
              onDoubleClick: (e: React.MouseEvent) => {
                if (l.locked) return
                e.stopPropagation()
                e.preventDefault()
                select(l.id)
              },
            }

            const showCropFrame =
              tool === "crop" && selected && l.id !== "bg" && !l.locked
            // Single-select transform controls render at the top level (see
            // below the layer loop) so they paint above front-most layers.
            // Crop frame stays nested — it relies on per-layer clipping.
            const overlay = showCropFrame ? (
              <CropOverlay
                layer={l}
                scale={scale}
                onCropChange={(crop) => patch(l.id, { crop })}
                onCommit={commit}
              />
            ) : null

            if (l.kind === "image" && l.src) {
              return (
                <div key={l.id} {...common}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={l.src}
                    alt={l.name}
                    draggable={false}
                    className="pointer-events-none size-full rounded-md object-cover"
                  />
                  {overlay}
                </div>
              )
            }

            if (l.kind === "image" && l.id === "photo") {
              return (
                <div key={l.id} {...common}>
                  <Image
                    src={illustration}
                    alt=""
                    fill
                    sizes="(max-width: 1200px) 100vw, 1200px"
                    draggable={false}
                    loading="lazy"
                    placeholder="blur"
                    className="pointer-events-none rounded-md object-cover"
                  />
                  {overlay}
                </div>
              )
            }

            if (l.kind === "text") {
              const content =
                l.text ?? (l.id === "title" ? "Hypersuite" : l.name)
              const isEditingText = editingTextId === l.id
              return (
                <div
                  key={l.id}
                  {...common}
                  style={{
                    ...common.style,
                    fontSize: l.fontSize ?? 56,
                    fontWeight: l.fontWeight ?? 600,
                    fontFamily: fontStack(l.fontFamily),
                    color: l.color,
                    cursor: isEditingText ? "text" : common.style.cursor,
                    // Already-selected text layer in edit mode swallows pointer
                    // events; pointer-events: none on text node delegates back
                    // to the wrapper for selection.
                    pointerEvents: isEditingText
                      ? common.style.pointerEvents
                      : l.locked
                        ? "none"
                        : "auto",
                  }}
                  className={cn(common.className, "flex items-center")}
                  onPointerDown={(e) => {
                    if (l.locked) return
                    if (panMode) return
                    if (isEditingText) return
                    if (e.button !== 0) return
                    // Always ensure selection on first click, even if the
                    // common handler short-circuits for non-move tools.
                    if (!selectedIds.includes(l.id)) {
                      if (e.shiftKey) select(l.id, { additive: true })
                      else select(l.id)
                    }
                    common.onPointerDown(e)
                  }}
                  onDoubleClick={(e) => {
                    if (l.locked) return
                    e.stopPropagation()
                    e.preventDefault()
                    if (!selectedIds.includes(l.id)) select(l.id)
                    commit()
                    setEditingTextId(l.id)
                  }}
                >
                  {isEditingText ? (
                    <TextEditor
                      initial={content}
                      onCommit={(text) => {
                        if (text !== content) patch(l.id, { text })
                        setEditingTextId(null)
                      }}
                      onCancel={() => setEditingTextId(null)}
                    />
                  ) : (
                    <span
                      className="pointer-events-none select-none"
                      style={{ whiteSpace: "pre" }}
                    >
                      {content}
                    </span>
                  )}
                  {!isEditingText && overlay}
                </div>
              )
            }

            if (l.kind === "shape" && l.shape === "ellipse") {
              return (
                <div
                  key={l.id}
                  {...common}
                  style={{
                    ...common.style,
                    background: l.color,
                    borderRadius: "50%",
                  }}
                >
                  {overlay}
                </div>
              )
            }

            if (l.kind === "path" && l.path) {
              return (
                <div key={l.id} {...common}>
                  <svg
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${l.width} ${l.height}`}
                    className="pointer-events-none"
                  >
                    <path
                      d={l.path}
                      fill={l.pathClosed ? l.color : "none"}
                      stroke={l.color}
                      strokeWidth={l.pathStrokeWidth ?? 2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {overlay}
                </div>
              )
            }

            if (l.kind === "raster") {
              return (
                <RasterLayerView key={l.id} layer={l} common={common}>
                  {overlay}
                </RasterLayerView>
              )
            }

            return (
              <div
                key={l.id}
                {...common}
                style={{
                  ...common.style,
                  background: l.color,
                  borderRadius: l.id === "bg" ? 0 : 8,
                }}
              >
                {overlay}
              </div>
            )
          })}
        {docSettings?.bleed > 0 && (
          <div
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              left: -docSettings.bleed,
              top: -docSettings.bleed,
              width: DOC_W + docSettings.bleed * 2,
              height: DOC_H + docSettings.bleed * 2,
              outline: `${1 / Math.max(scale, 0.001)}px dashed color-mix(in oklch, var(--color-primary), transparent 60%)`,
              outlineOffset: 0,
            }}
          />
        )}
        {docSettings?.safeArea > 0 && (
          <div
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              left: docSettings.safeArea,
              top: docSettings.safeArea,
              width: DOC_W - docSettings.safeArea * 2,
              height: DOC_H - docSettings.safeArea * 2,
              outline: `${1 / Math.max(scale, 0.001)}px dashed color-mix(in oklch, var(--color-primary), transparent 70%)`,
            }}
          />
        )}
        {guidesOn && (
          <Guides
            v={guides.v}
            h={guides.h}
            scale={scale}
            docW={DOC_W}
            docH={DOC_H}
          />
        )}
        <SpacingGuidesOverlay guides={spacingGuides} scale={scale} />
        {selectedIds.length > 1 &&
          tool === "move" &&
          !panMode &&
          (() => {
            const bounds = selectionBoundsOf(layers, selectedIds)
            if (!bounds) return null
            return (
              <MultiSelectionHandles
                bounds={bounds}
                scale={scale}
                onResizeStart={(e, handle, pivotClient) =>
                  startMultiResize(e, handle, bounds, pivotClient)
                }
                onRotateStart={(e, centerClient) =>
                  startMultiRotate(e, centerClient)
                }
              />
            )
          })()}
        {selectedIds.length === 1 &&
          tool === "move" &&
          !panMode &&
          (() => {
            const sel = layers.find((l) => l.id === selectedIds[0])
            if (!sel || sel.locked || !sel.visible) return null
            const inv = 1 / Math.max(scale, 0.001)
            return (
              <div
                aria-hidden
                className="pointer-events-none absolute"
                style={{
                  left: sel.x,
                  top: sel.y,
                  width: sel.width,
                  height: sel.height,
                  transform: `rotate(${sel.rotation}deg)`,
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    outline: `${inv}px solid var(--color-primary)`,
                  }}
                />
                <SelectionHandles
                  scale={scale}
                  onResize={(e, handle) => startResize(e, sel, handle)}
                  onRotate={(e) => startRotate(e, sel)}
                />
              </div>
            )
          })()}
        {marquee && <MarqueeRect marquee={marquee} scale={scale} />}
        {tool === "pen" && penAnchors.length > 0 && (
          <PenOverlay
            anchors={penAnchors}
            hover={penHover}
            scale={scale}
            docW={DOC_W}
            docH={DOC_H}
          />
        )}
        {tool === "pen" &&
          selectedIds.length === 1 &&
          (() => {
            const sel = layers.find(
              (l) => l.id === selectedIds[0] && l.kind === "path" && l.anchors
            )
            if (!sel) return null
            return (
              <PathEditOverlay
                layerId={sel.id}
                anchors={sel.anchors!}
                onChange={(next) => updatePathAnchors(sel.id, next)}
                onCommit={commit}
                scale={scale}
              />
            )
          })()}
        {zoomDrag && <ZoomRect drag={zoomDrag} scale={scale} />}
        {pixelMask && tool === "wand" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pixelMask.dataUrl}
            alt=""
            draggable={false}
            className="pointer-events-none absolute inset-0 size-full"
          />
        )}
      </div>

      {fileDragging && <DropOverlay />}
      {layers.length > 0 && (
        <RulerBadge zoom={zoom} cursor={cursor} docW={DOC_W} docH={DOC_H} />
      )}
    </div>
  )
}

const HANDLES: {
  id: ResizeHandle
  left: string
  top: string
  cursor: string
}[] = [
  { id: "nw", left: "0%", top: "0%", cursor: "nwse-resize" },
  { id: "n", left: "50%", top: "0%", cursor: "ns-resize" },
  { id: "ne", left: "100%", top: "0%", cursor: "nesw-resize" },
  { id: "e", left: "100%", top: "50%", cursor: "ew-resize" },
  { id: "se", left: "100%", top: "100%", cursor: "nwse-resize" },
  { id: "s", left: "50%", top: "100%", cursor: "ns-resize" },
  { id: "sw", left: "0%", top: "100%", cursor: "nesw-resize" },
  { id: "w", left: "0%", top: "50%", cursor: "ew-resize" },
]

function SelectionHandles({
  scale,
  onResize,
  onRotate,
}: {
  scale: number
  onResize: (e: React.PointerEvent, handle: ResizeHandle) => void
  onRotate: (e: React.PointerEvent) => void
}) {
  const inv = 1 / Math.max(scale, 0.001)
  const handlePx = 9
  const rotateOffset = 22
  return (
    <div className="pointer-events-none absolute inset-0">
      {HANDLES.map((h) => (
        <div
          key={h.id}
          onPointerDown={(e) => onResize(e, h.id)}
          className="pointer-events-auto absolute"
          style={{
            left: h.left,
            top: h.top,
            width: handlePx,
            height: handlePx,
            transform: `translate(-50%, -50%) scale(${inv})`,
            background: "var(--color-background)",
            border: "1.5px solid var(--color-primary)",
            borderRadius: 2,
            cursor: h.cursor,
            touchAction: "none",
            zIndex: 10,
          }}
        />
      ))}
      {/* line connecting top edge to rotate handle */}
      <div
        aria-hidden
        className="absolute"
        style={{
          left: "50%",
          top: 0,
          width: 0,
          height: rotateOffset * inv,
          borderLeft: "1px solid var(--color-primary)",
          transform: `translate(-50%, -100%)`,
          pointerEvents: "none",
        }}
      />
      <div
        onPointerDown={onRotate}
        className="pointer-events-auto absolute"
        style={{
          left: "50%",
          top: 0,
          width: handlePx + 3,
          height: handlePx + 3,
          transform: `translate(-50%, calc(-${rotateOffset}px * ${inv} - 50%)) scale(${inv})`,
          background: "var(--color-background)",
          border: "1.5px solid var(--color-primary)",
          borderRadius: "50%",
          cursor: "alias",
          touchAction: "none",
          zIndex: 10,
        }}
      />
    </div>
  )
}

function CropOverlay({
  layer,
  scale,
  onCropChange,
  onCommit,
}: {
  layer: Layer
  scale: number
  onCropChange: (
    crop: { x: number; y: number; width: number; height: number } | null
  ) => void
  onCommit: () => void
}) {
  const crop =
    layer.crop ?? {
      x: 0,
      y: 0,
      width: layer.width,
      height: layer.height,
    }
  const inv = 1 / Math.max(scale, 0.001)
  const handlePx = 9
  const committedRef = useRef(false)

  const onHandle = (corner: "nw" | "ne" | "sw" | "se") =>
    (e: React.PointerEvent) => {
      e.stopPropagation()
      e.preventDefault()
      committedRef.current = false
      const startClientX = e.clientX
      const startClientY = e.clientY
      const start = { ...crop }

      const onMove = (ev: PointerEvent) => {
        const dx = (ev.clientX - startClientX) / scale
        const dy = (ev.clientY - startClientY) / scale
        let nx = start.x
        let ny = start.y
        let nw = start.width
        let nh = start.height
        if (corner === "se" || corner === "ne") nw = start.width + dx
        if (corner === "sw" || corner === "nw") {
          nw = start.width - dx
          nx = start.x + dx
        }
        if (corner === "se" || corner === "sw") nh = start.height + dy
        if (corner === "ne" || corner === "nw") {
          nh = start.height - dy
          ny = start.y + dy
        }
        nx = Math.max(0, Math.min(layer.width - 1, nx))
        ny = Math.max(0, Math.min(layer.height - 1, ny))
        nw = Math.max(1, Math.min(layer.width - nx, nw))
        nh = Math.max(1, Math.min(layer.height - ny, nh))
        if (!committedRef.current) {
          onCommit()
          committedRef.current = true
        }
        onCropChange({
          x: Math.round(nx),
          y: Math.round(ny),
          width: Math.round(nw),
          height: Math.round(nh),
        })
      }
      const onUp = () => {
        window.removeEventListener("pointermove", onMove)
        window.removeEventListener("pointerup", onUp)
      }
      window.addEventListener("pointermove", onMove)
      window.addEventListener("pointerup", onUp)
    }

  const dim: React.CSSProperties = {
    position: "absolute",
    background: "rgba(0,0,0,0.45)",
    pointerEvents: "none",
  }

  return (
    <div className="pointer-events-none absolute inset-0">
      {/* dimmed outside */}
      <div
        style={{
          ...dim,
          left: 0,
          top: 0,
          width: layer.width,
          height: crop.y,
        }}
      />
      <div
        style={{
          ...dim,
          left: 0,
          top: crop.y + crop.height,
          width: layer.width,
          height: layer.height - crop.y - crop.height,
        }}
      />
      <div
        style={{
          ...dim,
          left: 0,
          top: crop.y,
          width: crop.x,
          height: crop.height,
        }}
      />
      <div
        style={{
          ...dim,
          left: crop.x + crop.width,
          top: crop.y,
          width: layer.width - crop.x - crop.width,
          height: crop.height,
        }}
      />
      {/* frame */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: crop.x,
          top: crop.y,
          width: crop.width,
          height: crop.height,
          outline: `${1 * inv}px solid var(--color-primary)`,
        }}
      />
      {/* corner handles */}
      {(["nw", "ne", "sw", "se"] as const).map((c) => {
        const cx = c.includes("e") ? crop.x + crop.width : crop.x
        const cy = c.includes("s") ? crop.y + crop.height : crop.y
        return (
          <div
            key={c}
            onPointerDown={onHandle(c)}
            className="pointer-events-auto absolute"
            style={{
              left: cx,
              top: cy,
              width: handlePx,
              height: handlePx,
              transform: `translate(-50%, -50%) scale(${inv})`,
              background: "var(--color-background)",
              border: "1.5px solid var(--color-primary)",
              borderRadius: 2,
              cursor:
                c === "nw" || c === "se" ? "nwse-resize" : "nesw-resize",
              touchAction: "none",
            }}
          />
        )
      })}
    </div>
  )
}

function compositeDocToCanvas(
  layers: Layer[],
  getRasterCanvas: (id: string) => HTMLCanvasElement,
  width: number,
  height: number
): HTMLCanvasElement {
  const out = document.createElement("canvas")
  out.width = width
  out.height = height
  const ctx = out.getContext("2d")
  if (!ctx) return out
  for (const l of [...layers].reverse()) {
    if (!l.visible) continue
    ctx.save()
    ctx.globalAlpha = l.opacity / 100
    const cx = l.x + l.width / 2
    const cy = l.y + l.height / 2
    ctx.translate(cx, cy)
    ctx.rotate((l.rotation * Math.PI) / 180)
    ctx.translate(-l.width / 2, -l.height / 2)
    if (l.crop) {
      ctx.beginPath()
      ctx.rect(l.crop.x, l.crop.y, l.crop.width, l.crop.height)
      ctx.clip()
    }
    if (l.kind === "raster") {
      const rc = getRasterCanvas(l.id)
      if (rc.width > 0 && rc.height > 0) {
        try {
          ctx.drawImage(rc, 0, 0, l.width, l.height)
        } catch {
          // ignore
        }
      }
    } else if (l.kind === "shape" && l.shape === "ellipse") {
      ctx.fillStyle = resolveCssColorToHex(l.color ?? "#000") ?? "#000"
      ctx.beginPath()
      ctx.ellipse(
        l.width / 2,
        l.height / 2,
        l.width / 2,
        l.height / 2,
        0,
        0,
        Math.PI * 2
      )
      ctx.fill()
    } else if (l.kind === "path" && l.path) {
      const color = resolveCssColorToHex(l.color ?? "#000") ?? "#000"
      const p = new Path2D(l.path)
      if (l.pathClosed) {
        ctx.fillStyle = color
        ctx.fill(p)
      }
      ctx.strokeStyle = color
      ctx.lineWidth = l.pathStrokeWidth ?? 2
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.stroke(p)
    } else if (l.color) {
      ctx.fillStyle = resolveCssColorToHex(l.color) ?? l.color
      ctx.fillRect(0, 0, l.width, l.height)
    }
    ctx.restore()
  }
  return out
}

function floodFillMask(
  layers: Layer[],
  getRasterCanvas: (id: string) => HTMLCanvasElement,
  startX: number,
  startY: number,
  tolerance: number,
  DOC_W: number,
  DOC_H: number
): { dataUrl: string; width: number; height: number } | null {
  const composite = compositeDocToCanvas(layers, getRasterCanvas, DOC_W, DOC_H)
  const ctx = composite.getContext("2d", { willReadFrequently: true })
  if (!ctx) return null
  let img: ImageData
  try {
    img = ctx.getImageData(0, 0, DOC_W, DOC_H)
  } catch {
    return null
  }
  const data = img.data
  if (
    startX < 0 ||
    startX >= DOC_W ||
    startY < 0 ||
    startY >= DOC_H
  )
    return null
  const idx0 = (startY * DOC_W + startX) * 4
  const r0 = data[idx0]!
  const g0 = data[idx0 + 1]!
  const b0 = data[idx0 + 2]!
  const tol2 = tolerance * tolerance
  const mask = new Uint8Array(DOC_W * DOC_H)
  // Iterative scan-line flood fill
  const stack: number[] = [startX, startY]
  while (stack.length) {
    const y = stack.pop()!
    const x = stack.pop()!
    let lx = x
    while (lx >= 0 && !mask[y * DOC_W + lx] && near(data, lx, y, r0, g0, b0))
      lx--
    lx++
    let rx = x
    while (rx < DOC_W && !mask[y * DOC_W + rx] && near(data, rx, y, r0, g0, b0))
      rx++
    rx--
    for (let i = lx; i <= rx; i++) {
      mask[y * DOC_W + i] = 1
    }
    for (const yy of [y - 1, y + 1]) {
      if (yy < 0 || yy >= DOC_H) continue
      let i = lx
      while (i <= rx) {
        while (
          i <= rx &&
          (mask[yy * DOC_W + i] || !near(data, i, yy, r0, g0, b0))
        )
          i++
        if (i > rx) break
        const segStart = i
        while (
          i <= rx &&
          !mask[yy * DOC_W + i] &&
          near(data, i, yy, r0, g0, b0)
        )
          i++
        stack.push(segStart, yy)
      }
    }
  }
  function near(
    d: Uint8ClampedArray,
    x: number,
    y: number,
    rr: number,
    gg: number,
    bb: number
  ) {
    const idx = (y * DOC_W + x) * 4
    const dr = d[idx]! - rr
    const dg = d[idx + 1]! - gg
    const db = d[idx + 2]! - bb
    return dr * dr + dg * dg + db * db <= tol2
  }
  // Render mask as semi-transparent overlay
  const out = document.createElement("canvas")
  out.width = DOC_W
  out.height = DOC_H
  const oc = out.getContext("2d")
  if (!oc) return null
  const overlay = oc.createImageData(DOC_W, DOC_H)
  for (let i = 0; i < DOC_W * DOC_H; i++) {
    if (mask[i]) {
      overlay.data[i * 4] = 79
      overlay.data[i * 4 + 1] = 122
      overlay.data[i * 4 + 2] = 255
      overlay.data[i * 4 + 3] = 110
    }
  }
  oc.putImageData(overlay, 0, 0)
  return {
    dataUrl: out.toDataURL("image/png"),
    width: DOC_W,
    height: DOC_H,
  }
}

function applyStroke(
  ctx: CanvasRenderingContext2D,
  mode: "pencil" | "brush" | "eraser",
  color: string,
  size: number,
  hardness: number,
  pts: { x: number; y: number }[]
) {
  ctx.save()
  if (mode === "eraser") {
    ctx.globalCompositeOperation = "destination-out"
    ctx.strokeStyle = "rgba(0,0,0,1)"
  } else {
    ctx.globalCompositeOperation = "source-over"
    ctx.strokeStyle = color
  }
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.lineWidth = Math.max(1, size)
  if (mode === "brush") {
    ctx.shadowColor = mode === "brush" ? color : "transparent"
    ctx.shadowBlur = Math.max(0, (1 - hardness) * size)
  }
  ctx.beginPath()
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!
    if (i === 0) ctx.moveTo(p.x, p.y)
    else ctx.lineTo(p.x, p.y)
  }
  ctx.stroke()
  ctx.restore()
}

async function sampleColorAt(
  docX: number,
  docY: number,
  layers: Layer[],
  getRasterCanvas: (id: string) => HTMLCanvasElement
): Promise<string | null> {
  // Try EyeDropper API first
  const Eye = (window as unknown as {
    EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> }
  }).EyeDropper
  if (Eye) {
    try {
      const ed = new Eye()
      const r = await ed.open()
      return r.sRGBHex
    } catch {
      // user cancelled — fall through
    }
  }
  // Composite layers ourselves at the point
  const probe = document.createElement("canvas")
  probe.width = 1
  probe.height = 1
  const ctx = probe.getContext("2d", { willReadFrequently: true })
  if (!ctx) return null
  ctx.fillStyle = "white"
  ctx.fillRect(0, 0, 1, 1)
  for (const l of [...layers].reverse()) {
    if (!l.visible) continue
    if (docX < l.x || docX > l.x + l.width) continue
    if (docY < l.y || docY > l.y + l.height) continue
    ctx.save()
    ctx.globalAlpha = l.opacity / 100
    if (l.kind === "raster") {
      const c = getRasterCanvas(l.id)
      const sx = ((docX - l.x) / l.width) * c.width
      const sy = ((docY - l.y) / l.height) * c.height
      try {
        ctx.drawImage(c, sx, sy, 1, 1, 0, 0, 1, 1)
      } catch {
        // ignore
      }
    } else if (l.kind === "image") {
      // Skip images we can't easily sample without async load
    } else if (l.color) {
      const resolved = resolveCssColorToHex(l.color) ?? l.color
      ctx.fillStyle = resolved
      ctx.fillRect(0, 0, 1, 1)
    }
    ctx.restore()
  }
  const data = ctx.getImageData(0, 0, 1, 1).data
  return rgbToHex(data[0]!, data[1]!, data[2]!)
}

function resolveCssColorToHex(raw: string): string | null {
  if (typeof window === "undefined") return null
  const probe = document.createElement("span")
  probe.style.position = "absolute"
  probe.style.visibility = "hidden"
  probe.style.color = ""
  probe.style.color = raw
  document.body.appendChild(probe)
  const computed = window.getComputedStyle(probe).color
  document.body.removeChild(probe)
  const m = computed.match(/rgba?\(([^)]+)\)/)
  if (!m) return null
  const parts = m[1]!.split(",").map((s) => parseFloat(s.trim()))
  if (parts.length < 3) return null
  return rgbToHex(parts[0]!, parts[1]!, parts[2]!)
}

function rgbToHex(r: number, g: number, b: number) {
  const c = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0")
  return `#${c(r)}${c(g)}${c(b)}`
}

function RasterLayerView({
  layer,
  common,
  children,
}: {
  layer: Layer
  common: {
    className: string
    style: React.CSSProperties
    onPointerDown: (e: React.PointerEvent) => void
    onMouseDown: (e: React.MouseEvent) => void
  }
  children: React.ReactNode
}) {
  const { getRasterCanvas } = useEditor()
  const hostRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const canvas = getRasterCanvas(layer.id)
    if (canvas.width === 0)
      canvas.width = layer.rasterWidth ?? layer.width ?? 1200
    if (canvas.height === 0)
      canvas.height = layer.rasterHeight ?? layer.height ?? 800
    canvas.style.width = "100%"
    canvas.style.height = "100%"
    canvas.style.display = "block"
    canvas.style.pointerEvents = "none"
    const host = hostRef.current
    if (host && canvas.parentElement !== host) {
      host.replaceChildren(canvas)
    }
    // Repaint canvas whenever the layer's stored rasterDataUrl differs from
    // what was last applied to the canvas. This covers initial hydrate,
    // undo, and redo.
    const applied = (canvas as unknown as { __applied?: string }).__applied
    const target = layer.rasterDataUrl ?? ""
    if (applied !== target) {
      const ctx = canvas.getContext("2d")
      if (ctx) {
        if (!target) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ;(canvas as unknown as { __applied?: string }).__applied = ""
        } else {
          const img = new window.Image()
          img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(img, 0, 0)
            ;(canvas as unknown as { __applied?: string }).__applied = target
          }
          img.src = target
        }
      }
    }
  }, [
    layer.id,
    layer.rasterDataUrl,
    layer.rasterWidth,
    layer.rasterHeight,
    layer.width,
    layer.height,
    getRasterCanvas,
  ])
  return (
    <div {...common}>
      <div ref={hostRef} className="size-full" />
      {children}
    </div>
  )
}

function PenOverlay({
  anchors,
  hover,
  scale,
  docW,
  docH,
}: {
  anchors: Anchor[]
  hover: { x: number; y: number } | null
  scale: number
  docW: number
  docH: number
}) {
  const inv = 1 / Math.max(scale, 0.001)
  const handle = 8
  const lineWidth = 1 / Math.max(scale, 0.001)
  const d =
    anchors.length === 0
      ? ""
      : anchors
          .map((a, i) => {
            if (i === 0) return `M${a.x} ${a.y}`
            const prev = anchors[i - 1]!
            if (prev.hOut || a.hIn) {
              const c1 = prev.hOut ?? { x: prev.x, y: prev.y }
              const c2 = a.hIn ?? { x: a.x, y: a.y }
              return `C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${a.x} ${a.y}`
            }
            return `L${a.x} ${a.y}`
          })
          .join(" ") +
        (hover ? ` L${hover.x} ${hover.y}` : "")
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{ overflow: "visible" }}
    >
      <svg
        width={docW}
        height={docH}
        className="absolute inset-0"
        style={{ overflow: "visible" }}
      >
        <path
          d={d}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={lineWidth}
          strokeDasharray={`${4 * inv} ${4 * inv}`}
        />
        {anchors.map((a, i) => (
          <g key={i}>
            {a.hIn && (
              <line
                x1={a.x}
                y1={a.y}
                x2={a.hIn.x}
                y2={a.hIn.y}
                stroke="var(--color-primary)"
                strokeWidth={lineWidth}
                opacity={0.6}
              />
            )}
            {a.hOut && (
              <line
                x1={a.x}
                y1={a.y}
                x2={a.hOut.x}
                y2={a.hOut.y}
                stroke="var(--color-primary)"
                strokeWidth={lineWidth}
                opacity={0.6}
              />
            )}
          </g>
        ))}
      </svg>
      {anchors.map((a, i) => (
        <div key={`anc-${i}`}>
          <div
            className="absolute"
            style={{
              left: a.x,
              top: a.y,
              width: handle,
              height: handle,
              transform: `translate(-50%, -50%) scale(${inv})`,
              background:
                i === 0 ? "var(--color-primary)" : "var(--color-background)",
              border: "1.5px solid var(--color-primary)",
              borderRadius: i === 0 ? "50%" : 2,
            }}
          />
          {a.hIn && (
            <div
              className="absolute"
              style={{
                left: a.hIn.x,
                top: a.hIn.y,
                width: handle - 2,
                height: handle - 2,
                transform: `translate(-50%, -50%) scale(${inv})`,
                background: "var(--color-background)",
                border: "1px solid var(--color-primary)",
                borderRadius: "50%",
              }}
            />
          )}
          {a.hOut && (
            <div
              className="absolute"
              style={{
                left: a.hOut.x,
                top: a.hOut.y,
                width: handle - 2,
                height: handle - 2,
                transform: `translate(-50%, -50%) scale(${inv})`,
                background: "var(--color-background)",
                border: "1px solid var(--color-primary)",
                borderRadius: "50%",
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function PathEditOverlay({
  layerId,
  anchors,
  onChange,
  onCommit,
  scale,
}: {
  layerId: string
  anchors: Anchor[]
  onChange: (anchors: Anchor[]) => void
  onCommit: () => void
  scale: number
}) {
  const inv = 1 / Math.max(scale, 0.001)
  const handle = 9

  const startDrag = (
    e: React.PointerEvent,
    idx: number,
    kind: "anchor" | "in" | "out"
  ) => {
    e.stopPropagation()
    e.preventDefault()
    const a = anchors[idx]
    if (!a) return
    const startClientX = e.clientX
    const startClientY = e.clientY
    const start = { ...a, hIn: a.hIn ? { ...a.hIn } : undefined, hOut: a.hOut ? { ...a.hOut } : undefined }
    let committed = false
    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startClientX) / scale
      const dy = (ev.clientY - startClientY) / scale
      if (!committed && Math.hypot(dx, dy) > 1) {
        onCommit()
        committed = true
      }
      const next = anchors.slice()
      if (kind === "anchor") {
        next[idx] = {
          x: start.x + dx,
          y: start.y + dy,
          hIn: start.hIn
            ? { x: start.hIn.x + dx, y: start.hIn.y + dy }
            : undefined,
          hOut: start.hOut
            ? { x: start.hOut.x + dx, y: start.hOut.y + dy }
            : undefined,
        }
      } else if (kind === "out") {
        const newOut = {
          x: (start.hOut?.x ?? start.x) + dx,
          y: (start.hOut?.y ?? start.y) + dy,
        }
        // Mirror hIn for symmetric editing
        const mirroredIn = {
          x: 2 * start.x - newOut.x,
          y: 2 * start.y - newOut.y,
        }
        next[idx] = { ...start, hOut: newOut, hIn: mirroredIn }
      } else {
        const newIn = {
          x: (start.hIn?.x ?? start.x) + dx,
          y: (start.hIn?.y ?? start.y) + dy,
        }
        const mirroredOut = {
          x: 2 * start.x - newIn.x,
          y: 2 * start.y - newIn.y,
        }
        next[idx] = { ...start, hIn: newIn, hOut: mirroredOut }
      }
      onChange(next)
    }
    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }

  const dot = (
    cx: number,
    cy: number,
    onPointerDown: (e: React.PointerEvent) => void,
    filled: boolean,
    cursor = "pointer"
  ) => (
    <div
      onPointerDown={onPointerDown}
      className="pointer-events-auto absolute"
      style={{
        left: cx,
        top: cy,
        width: handle,
        height: handle,
        transform: `translate(-50%, -50%) scale(${inv})`,
        background: filled ? "var(--color-primary)" : "var(--color-background)",
        border: "1.5px solid var(--color-primary)",
        borderRadius: filled ? "50%" : 2,
        cursor,
        touchAction: "none",
      }}
    />
  )

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      data-layer={layerId}
      style={{ overflow: "visible" }}
    >
      {anchors.map((a, i) => (
        <div key={i}>
          {dot(a.x, a.y, (e) => startDrag(e, i, "anchor"), false, "move")}
          {a.hIn && dot(a.hIn.x, a.hIn.y, (e) => startDrag(e, i, "in"), true)}
          {a.hOut && dot(a.hOut.x, a.hOut.y, (e) => startDrag(e, i, "out"), true)}
        </div>
      ))}
    </div>
  )
}

function ZoomRect({
  drag,
  scale,
}: {
  drag: ZoomDragState
  scale: number
}) {
  const x = Math.min(drag.startDocX, drag.curDocX)
  const y = Math.min(drag.startDocY, drag.curDocY)
  const w = Math.abs(drag.curDocX - drag.startDocX)
  const h = Math.abs(drag.curDocY - drag.startDocY)
  if (w < 1 && h < 1) return null
  const lineWidth = 1 / Math.max(scale, 0.001)
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        outline: `${lineWidth}px dashed var(--color-primary)`,
        background: "color-mix(in oklch, var(--color-primary), transparent 90%)",
      }}
    />
  )
}

function MarqueeRect({
  marquee,
  scale,
}: {
  marquee: MarqueeState
  scale: number
}) {
  const x = Math.min(marquee.startDocX, marquee.curDocX)
  const y = Math.min(marquee.startDocY, marquee.curDocY)
  const w = Math.abs(marquee.curDocX - marquee.startDocX)
  const h = Math.abs(marquee.curDocY - marquee.startDocY)
  if (w < 1 && h < 1) return null
  const lineWidth = 1 / Math.max(scale, 0.001)
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        background: "color-mix(in oklch, var(--color-primary), transparent 85%)",
        outline: `${lineWidth}px solid var(--color-primary)`,
      }}
    />
  )
}

function Guides({
  v,
  h,
  scale,
  docW,
  docH,
}: {
  v: number[]
  h: number[]
  scale: number
  docW: number
  docH: number
}) {
  if (v.length === 0 && h.length === 0) return null
  const lineWidth = 1 / Math.max(scale, 0.001)
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{ overflow: "visible" }}
    >
      {v.map((x, i) => (
        <div
          key={`v-${i}-${x}`}
          className="absolute"
          style={{
            left: x,
            top: -docH,
            width: lineWidth,
            height: docH * 3,
            background: "var(--color-primary)",
          }}
        />
      ))}
      {h.map((y, i) => (
        <div
          key={`h-${i}-${y}`}
          className="absolute"
          style={{
            top: y,
            left: -docW,
            height: lineWidth,
            width: docW * 3,
            background: "var(--color-primary)",
          }}
        />
      ))}
    </div>
  )
}

function TextEditor({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string
  onCommit: (text: string) => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLSpanElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    // Place cursor at end + select all so typing replaces
    const range = document.createRange()
    range.selectNodeContents(el)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }, [])
  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onBlur={(e) => onCommit(e.currentTarget.textContent ?? "")}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === "Escape") {
          e.preventDefault()
          onCancel()
        } else if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          onCommit((e.currentTarget as HTMLElement).textContent ?? "")
        }
      }}
      className="min-w-[1ch] outline-none ring-1 ring-primary"
      style={{ caretColor: "var(--color-primary)" }}
    >
      {initial}
    </span>
  )
}

function Rulers({
  docW,
  docH,
  scale,
  panX,
  panY,
}: {
  docW: number
  docH: number
  scale: number
  panX: number
  panY: number
}) {
  // Major tick = 100 doc-px; minor = 10 doc-px.
  const majorPx = 100 * scale
  const minorPx = 10 * scale
  // The doc is centered in the container with translate(panX, panY) scale.
  // We render a fixed strip overlay; the offset to align tick 0 with doc(0)
  // is the doc's screen-left/top coord.
  const docLeft = `calc(50% - ${docW / 2}px * ${scale} + ${panX}px)`
  const docTop = `calc(50% - ${docH / 2}px * ${scale} + ${panY}px)`
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-4 border-b border-border bg-background/90 backdrop-blur"
        style={{
          backgroundImage: `linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to right, color-mix(in oklch, var(--color-border), transparent 50%) 1px, transparent 1px)`,
          backgroundSize: `${majorPx}px 100%, ${minorPx}px 100%`,
          backgroundPosition: `${docLeft} 0, ${docLeft} 0`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 start-0 top-4 z-10 w-4 border-e border-border bg-background/90 backdrop-blur"
        style={{
          backgroundImage: `linear-gradient(to bottom, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklch, var(--color-border), transparent 50%) 1px, transparent 1px)`,
          backgroundSize: `100% ${majorPx}px, 100% ${minorPx}px`,
          backgroundPosition: `0 ${docTop}, 0 ${docTop}`,
        }}
      />
    </>
  )
}

function MultiSelectionHandles({
  bounds,
  scale,
  onResizeStart,
  onRotateStart,
}: {
  bounds: Rect
  scale: number
  onResizeStart: (
    e: React.PointerEvent,
    handle: ResizeHandle,
    pivotClient: { x: number; y: number }
  ) => void
  onRotateStart: (
    e: React.PointerEvent,
    centerClient: { x: number; y: number }
  ) => void
}) {
  const inv = 1 / Math.max(scale, 0.001)
  const handlePx = 9
  const rotateOffset = 22
  const lineWidth = 1 / Math.max(scale, 0.001)

  const oppositeForHandle = (handle: ResizeHandle): { x: number; y: number } => {
    let x = bounds.x + bounds.width / 2
    let y = bounds.y + bounds.height / 2
    if (handle === "e" || handle === "ne" || handle === "se") x = bounds.x
    if (handle === "w" || handle === "nw" || handle === "sw")
      x = bounds.x + bounds.width
    if (handle === "s" || handle === "se" || handle === "sw") y = bounds.y
    if (handle === "n" || handle === "ne" || handle === "nw")
      y = bounds.y + bounds.height
    return { x, y }
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          outline: `${lineWidth}px solid var(--color-primary)`,
        }}
      />
      {HANDLES.map((h) => (
        <div
          key={h.id}
          onPointerDown={(e) => {
            const docEl = (e.currentTarget as HTMLDivElement).closest(
              "[data-doc-surface='true']"
            ) as HTMLElement | null
            if (!docEl) return
            const docRect = docEl.getBoundingClientRect()
            const pivot = oppositeForHandle(h.id)
            onResizeStart(e, h.id, {
              x: docRect.left + pivot.x * scale,
              y: docRect.top + pivot.y * scale,
            })
          }}
          className="pointer-events-auto absolute"
          style={{
            left: h.left,
            top: h.top,
            width: handlePx,
            height: handlePx,
            transform: `translate(-50%, -50%) scale(${inv})`,
            background: "var(--color-background)",
            border: "1.5px solid var(--color-primary)",
            borderRadius: 2,
            cursor: h.cursor,
            touchAction: "none",
            zIndex: 10,
          }}
        />
      ))}
      <div
        aria-hidden
        className="absolute"
        style={{
          left: "50%",
          top: 0,
          width: 0,
          height: rotateOffset * inv,
          borderLeft: "1px solid var(--color-primary)",
          transform: `translate(-50%, -100%)`,
          pointerEvents: "none",
        }}
      />
      <div
        onPointerDown={(e) => {
          const docEl = (e.currentTarget as HTMLDivElement).closest(
            "[data-doc-surface='true']"
          ) as HTMLElement | null
          if (!docEl) return
          const docRect = docEl.getBoundingClientRect()
          onRotateStart(e, {
            x: docRect.left + (bounds.x + bounds.width / 2) * scale,
            y: docRect.top + (bounds.y + bounds.height / 2) * scale,
          })
        }}
        className="pointer-events-auto absolute"
        style={{
          left: "50%",
          top: 0,
          width: handlePx + 3,
          height: handlePx + 3,
          transform: `translate(-50%, calc(-${rotateOffset}px * ${inv} - 50%)) scale(${inv})`,
          background: "var(--color-background)",
          border: "1.5px solid var(--color-primary)",
          borderRadius: "50%",
          cursor: "alias",
          touchAction: "none",
          zIndex: 10,
        }}
      />
    </div>
  )
}

function SpacingGuidesOverlay({
  guides,
  scale,
}: {
  guides: SpacingGuides[]
  scale: number
}) {
  if (!guides.length) return null
  const lineWidth = 1 / Math.max(scale, 0.001)
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{ overflow: "visible" }}
    >
      {guides.map((g, gi) =>
        g.spans.map((s, si) => {
          if (g.axis === "x") {
            return (
              <div key={`${gi}-${si}-x`}>
                <div
                  className="absolute"
                  style={{
                    left: s.a,
                    top: s.cross - 4,
                    width: s.b - s.a,
                    height: 8,
                    borderTop: `${lineWidth}px dashed var(--color-primary)`,
                    borderBottom: `${lineWidth}px dashed var(--color-primary)`,
                    opacity: 0.7,
                  }}
                />
                <div
                  className="absolute font-mono text-[10px] text-primary"
                  style={{
                    left: (s.a + s.b) / 2,
                    top: s.cross - 12,
                    transform: `translate(-50%, -100%) scale(${1 / Math.max(scale, 0.001)})`,
                    transformOrigin: "center bottom",
                  }}
                >
                  {Math.round(s.gap)}
                </div>
              </div>
            )
          }
          return (
            <div key={`${gi}-${si}-y`}>
              <div
                className="absolute"
                style={{
                  left: s.cross - 4,
                  top: s.a,
                  width: 8,
                  height: s.b - s.a,
                  borderLeft: `${lineWidth}px dashed var(--color-primary)`,
                  borderRight: `${lineWidth}px dashed var(--color-primary)`,
                  opacity: 0.7,
                }}
              />
              <div
                className="absolute font-mono text-[10px] text-primary"
                style={{
                  left: s.cross + 8,
                  top: (s.a + s.b) / 2,
                  transform: `translate(0, -50%) scale(${1 / Math.max(scale, 0.001)})`,
                  transformOrigin: "left center",
                }}
              >
                {Math.round(s.gap)}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

function hasFiles(e: React.DragEvent) {
  return Array.from(e.dataTransfer.types).includes("Files")
}

function DropOverlay() {
  return (
    <div className="pointer-events-none absolute inset-3 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary bg-primary/5 text-primary">
      <HugeiconsIcon icon={ImageIcon} className="size-6" />
      <p className="text-sm font-medium">Drop image to add as a layer</p>
    </div>
  )
}

function CheckerBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage:
          "radial-gradient(circle, color-mix(in oklch, var(--color-foreground), transparent 88%) 1px, transparent 1px)",
        backgroundSize: "16px 16px",
      }}
    />
  )
}

function RulerBadge({
  zoom,
  cursor,
  docW,
  docH,
}: {
  zoom: number
  cursor: { x: number; y: number } | null
  docW: number
  docH: number
}) {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-md bg-background/80 px-2 py-1 text-xs text-muted-foreground shadow-sm ring-1 ring-border backdrop-blur">
      <span className="font-mono">
        {docW} × {docH}
      </span>
      <span className="text-foreground/40">·</span>
      <span className="font-mono">{zoom}%</span>
      {cursor && (
        <>
          <span className="text-foreground/40">·</span>
          <span className="font-mono">
            {Math.round(cursor.x)}, {Math.round(cursor.y)}
          </span>
        </>
      )}
    </div>
  )
}
