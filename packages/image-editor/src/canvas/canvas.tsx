"use client"

import Image from "next/image"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ImageIcon } from "@hugeicons/core-free-icons"

import { useEditor } from "../editor"
import { cn } from "@workspace/ui/lib/utils"
import illustration from "../assets/illustration.webp"
import { WelcomeScreen } from "../welcome-screen"
import type { Anchor, Layer } from "../lib/types"
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
} from "../lib/geometry"
import { ensureFont, fontStack } from "../pickers/fonts"
import { hasSvgFilter, LayerSvgFilter, svgFilterId } from "../lib/svg-filters"
import {
  CANVAS_DRAW_TOOLS,
  DEFAULT_DOC_H,
  DEFAULT_DOC_W,
  SNAP_THRESHOLD,
  isCanvasDrawTool,
  type DragState,
  type MarqueeState,
  type MultiResizeState,
  type MultiRotateState,
  type MultiTransformStart,
  type PanState,
  type ResizeState,
  type RotateState,
  type ShapeDrawState,
  type StrokeState,
  type ZoomDragState,
} from "./types"
import {
  applyStroke,
  compositeDocToCanvas,
  floodFillMask,
  hasFiles,
  resolveCssColorToHex,
  rgbToHex,
  sampleColorAt,
} from "./utils"
import {
  CheckerBackground,
  DropOverlay,
  Guides,
  MarqueeRect,
  Rulers,
  RulerBadge,
  ZoomRect,
} from "./overlays"
import { CropOverlay } from "./crop-overlay"
import { PenOverlay, PathEditOverlay } from "./pen-overlays"
import { MultiSelectionHandles, SelectionHandles } from "./handles"
import {
  RasterLayerView,
  SpacingGuidesOverlay,
  TextEditor,
} from "./layer-views"

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
    activeTabId,
    newTab,
    openImageInNewTab,
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

      // Welcome state (no tab, OR active tab is empty): open the first
      // image as a doc sized to its natural pixel dimensions (Photoshop
      // "open as new document" flow). Subsequent files become layers.
      if (!activeTabId || layers.length === 0) {
        const [first, ...rest] = files
        if (first) await openImageInNewTab(first)
        for (const file of rest) {
          await addImage(file)
        }
        return
      }

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
    [scale, addImage, activeTabId, openImageInNewTab, DOC_W, DOC_H, layers.length]
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

  // Wheel zoom (Cmd/Ctrl) and trackpad pan. We route through a ref so rapid
  // wheel events compose against the latest zoom/pan instead of clobbering
  // each other with stale closure values, and we normalize deltaMode so a
  // mouse wheel (lines) zooms at the same rate as a trackpad (pixels).
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
        // Trackpad two-finger pan; mouse wheel pans vertically.
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
  }, [setZoom, setPan])

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
        const startClientX = e.clientX
        const startClientY = e.clientY
        const startDocX = docX
        const startDocY = docY
        const pointerId = e.pointerId
        let layerId: string | null = null
        let dragging = false
        const onMove = (ev: PointerEvent) => {
          if (ev.pointerId !== pointerId) return
          const docElInner = docRef.current
          if (!docElInner) return
          const dx = (ev.clientX - startClientX) / scale
          const dy = (ev.clientY - startClientY) / scale
          if (!dragging && Math.hypot(dx, dy) < 4) return
          dragging = true
          const r = docElInner.getBoundingClientRect()
          const curX = (ev.clientX - r.left) / scale
          const curY = (ev.clientY - r.top) / scale
          const x = Math.min(startDocX, curX)
          const y = Math.min(startDocY, curY)
          const w = Math.max(1, Math.abs(curX - startDocX))
          const h = Math.max(1, Math.abs(curY - startDocY))
          if (!layerId) {
            layerId = addText({ x, y, width: w, height: h, centered: false })
          } else {
            patch(layerId, {
              x: Math.round(x),
              y: Math.round(y),
              width: Math.max(1, Math.round(w)),
              height: Math.max(1, Math.round(h)),
            })
          }
        }
        const onUp = (ev: PointerEvent) => {
          if (ev.pointerId !== pointerId) return
          window.removeEventListener("pointermove", onMove)
          window.removeEventListener("pointerup", onUp)
          window.removeEventListener("pointercancel", onUp)
          if (!dragging) {
            addText({ x: startDocX, y: startDocY })
          }
          setTool("move")
        }
        window.addEventListener("pointermove", onMove)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)
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

      // Marquee + deselect on canvas background. Layers stop propagation in
      // move/marquee mode (see per-layer onPointerDown), so reaching this
      // line means the click missed every unlocked layer — treat it as a
      // background click: clear selection (unless extending with shift) and
      // start a marquee.
      if (tool !== "move" && tool !== "marquee") return
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

  const finishPenPath = useCallback(
    (closed: boolean) => {
      if (penAnchors.length >= 2) {
        addPath({
          anchors: penAnchors,
          closed,
          strokeWidth: 2,
          color: brushColor,
        })
      }
      setPenAnchors([])
      setPenHover(null)
    },
    [penAnchors, addPath, brushColor]
  )

  // Pen Esc/Enter
  useEffect(() => {
    if (tool !== "pen") return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPenAnchors([])
        setPenHover(null)
      } else if (e.key === "Enter") {
        finishPenPath(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [tool, finishPenPath])

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
    if (tool === "pen" || tool === "pencil" || tool === "brush") {
      return "cursor-crosshair"
    }
    if (tool === "text") return "cursor-text"
    return ""
  }, [pan, panMode, drag, tool])

  // Memoise the doc-surface style so we don't allocate a fresh object on
  // every cursor-coord update during pan. The canvas re-renders on every
  // pointer move (cursor state lives on this component), so reducing the
  // reconciliation cost here removes a class of subtle pan jitter.
  const docSurfaceStyle = useMemo<React.CSSProperties>(() => {
    const bg = docSettings?.background ?? "var(--color-background)"
    const transparent =
      !docSettings?.background || bg === "transparent" || bg === "none"
    const checkerImage =
      "linear-gradient(45deg, #cfcfcf 25%, transparent 25%, transparent 75%, #cfcfcf 75%, #cfcfcf), linear-gradient(45deg, #cfcfcf 25%, transparent 25%, transparent 75%, #cfcfcf 75%, #cfcfcf)"
    const gridImage =
      "linear-gradient(to right, color-mix(in oklch, var(--color-foreground), transparent 90%) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklch, var(--color-foreground), transparent 90%) 1px, transparent 1px)"
    const grid = viewToggles?.grid
    let backgroundImage: string | undefined
    let backgroundSize: string | undefined
    let backgroundRepeat: string | undefined
    let backgroundPosition: string | undefined
    if (transparent && grid) {
      backgroundImage = `${gridImage}, ${checkerImage}`
      backgroundSize = "20px 20px, 20px 20px, 20px 20px, 20px 20px"
      backgroundPosition = "0 0, 0 0, 0 0, 10px 10px"
      backgroundRepeat = "repeat"
    } else if (transparent) {
      backgroundImage = checkerImage
      backgroundSize = "20px 20px, 20px 20px"
      backgroundPosition = "0 0, 10px 10px"
      backgroundRepeat = "repeat"
    } else if (grid) {
      backgroundImage = gridImage
      backgroundSize = "20px 20px"
      backgroundRepeat = "repeat"
    }
    return {
      width: DOC_W,
      height: DOC_H,
      backgroundColor: transparent ? "#ffffff" : bg,
      backgroundImage,
      backgroundSize,
      backgroundPosition,
      backgroundRepeat,
      transform: `translate3d(${panX}px, ${panY}px, 0) scale(${scale})`,
      transformOrigin: "center center",
      willChange: "transform",
      backfaceVisibility: "hidden",
    }
  }, [
    docSettings?.background,
    viewToggles?.grid,
    DOC_W,
    DOC_H,
    panX,
    panY,
    scale,
  ])

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
      onDoubleClick={() => {
        if (tool === "pen" && penAnchors.length >= 2) finishPenPath(false)
      }}
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
        style={docSurfaceStyle}
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

            const showCropFrame =
              tool === "crop" && selected && l.id !== "bg" && !l.locked

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
                // While the crop tool is active on this layer, drop the
                // clipPath so the dim mask and handles in CropOverlay aren't
                // themselves clipped away by the saved crop.
                clipPath:
                  l.crop && !showCropFrame
                    ? `inset(${l.crop.y}px ${l.width - l.crop.x - l.crop.width}px ${l.height - l.crop.y - l.crop.height}px ${l.crop.x}px)`
                    : undefined,
                // Locked layers don't catch canvas clicks — clicks pass
                // through so layers underneath can be selected. Lock UI
                // lives in the Layers panel.
                pointerEvents: l.locked ? "none" : undefined,
              } as React.CSSProperties,
              onPointerDown: (e: React.PointerEvent) => {
                // Canvas-drawing tools (paint, shape, pen, text) need clicks
                // to bubble to the container handler even when they land on
                // an existing layer — otherwise the user can't draw over a
                // layer. Other tools stop propagation so the click only
                // selects/drags this layer.
                if (l.locked) return
                if (panMode) return
                if (!isCanvasDrawTool(tool)) {
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
                // In drawing modes a click on a layer is the start of a new
                // stroke/shape/anchor — it shouldn't change selection.
                if (isCanvasDrawTool(tool)) return
                if (!selectedIds.includes(l.id)) select(l.id)
              },
              onDoubleClick: (e: React.MouseEvent) => {
                if (l.locked) return
                e.stopPropagation()
                e.preventDefault()
                select(l.id)
              },
            }

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
                    className="pointer-events-none size-full object-cover"
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
                    className="pointer-events-none object-cover"
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


