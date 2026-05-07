"use client"

import { useCallback, type RefObject } from "react"

import {
  applyStroke,
  combineMasks,
  floodFillMask,
  sampleColorAt,
  type PixelMask,
  type WandMaskMode,
  type WandSampleSize,
} from "../utils"
import type { Anchor, Layer, ShapeVariant, ToolId } from "../../lib/types"
import type { MaskStrokeState } from "./use-mask-stroke"
import type {
  MarqueeState,
  ShapeDrawState,
  StrokeState,
  ZoomDragState,
} from "../types"

/** Tool dispatcher for pointer-down on the canvas container. Each tool's
 *  branch is small in isolation but they share a common preamble (early
 *  exits, doc-coord conversion). Lives in its own hook to keep canvas.tsx
 *  focused on composition + render. Also exposes `onPointerMoveCanvas`
 *  for cursor tracking and pen-hover preview. */
export function useCanvasPointer(opts: {
  docRef: RefObject<HTMLDivElement | null>
  scale: number
  docW: number
  docH: number
  panMode: boolean
  tool: ToolId
  shapeVariant: ShapeVariant
  layers: Layer[]
  selectedIds: string[]
  brushColor: string
  brushSize: number
  brushHardness: number
  wandTolerance: number
  wandSampleSize: WandSampleSize
  wandContiguous: boolean
  wandAntiAlias: boolean
  wandSampleAllLayers: boolean
  wandMode: WandMaskMode
  pixelMask: PixelMask | null
  refineMode: "restore" | "erase"
  penAnchors: Anchor[]
  startPan: (e: React.PointerEvent) => void
  startShapeDraw: (state: ShapeDrawState, layerId: string) => void
  startStroke: (state: StrokeState) => void
  startMaskStroke: (state: MaskStrokeState) => void
  startZoomDrag: (state: ZoomDragState) => void
  startMarquee: (state: MarqueeState) => void
  setPenAnchors: React.Dispatch<React.SetStateAction<Anchor[]>>
  setPenHover: (p: { x: number; y: number } | null) => void
  setCursor: (c: { x: number; y: number } | null) => void
  setBrushColor: (c: string) => void
  setPixelMask: (m: PixelMask | null) => void
  setTool: (t: ToolId) => void
  select: (id: string | null) => void
  addText: (opts: {
    x: number
    y: number
    width?: number
    height?: number
    centered?: boolean
  }) => string
  addShape: (opts: {
    x: number
    y: number
    width: number
    height: number
    variant: ShapeVariant
  }) => string
  addPath: (opts: {
    anchors: Anchor[]
    closed: boolean
    strokeWidth?: number
    color?: string
  }) => string
  addRaster: (opts: { width?: number; height?: number }) => string
  getRasterCanvas: (id: string) => HTMLCanvasElement
  patch: (id: string, p: Partial<Layer>) => void
  commit: () => void
}) {
  const {
    docRef,
    scale,
    docW: DOC_W,
    docH: DOC_H,
    panMode,
    tool,
    shapeVariant,
    layers,
    selectedIds,
    brushColor,
    brushSize,
    brushHardness,
    wandTolerance,
    wandSampleSize,
    wandContiguous,
    wandAntiAlias,
    wandSampleAllLayers,
    wandMode,
    pixelMask,
    refineMode,
    penAnchors,
    startPan,
    startShapeDraw,
    startStroke,
    startMaskStroke,
    startZoomDrag,
    startMarquee,
    setPenAnchors,
    setPenHover,
    setCursor,
    setBrushColor,
    setPixelMask,
    setTool,
    select,
    addText,
    addShape,
    addPath,
    addRaster,
    getRasterCanvas,
    patch,
    commit,
  } = opts

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
        startShapeDraw(
          {
            pointerId: e.pointerId,
            startDocX: docX,
            startDocY: docY,
            curDocX: docX,
            curDocY: docY,
            variant: shapeVariant,
          },
          id
        )
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
        // Add a corner anchor; drag converts it to a smooth bezier anchor.
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

        let layerId: string | null = null
        if (selectedIds.length === 1) {
          const sel = layers.find((l) => l.id === selectedIds[0])
          if (sel?.kind === "raster") layerId = sel.id
        }
        if (!layerId) {
          if (tool === "eraser") return
          layerId = addRaster({ width: DOC_W, height: DOC_H })
        }

        const canvas = getRasterCanvas(layerId)
        if (canvas.width === 0 || canvas.height === 0) {
          canvas.width = DOC_W
          canvas.height = DOC_H
        }

        // Snapshot pre-stroke pixels into the layer so global history
        // captures them, then commit. After this commit, undo restores them.
        let preDataUrl: string | null = null
        try {
          preDataUrl = canvas.toDataURL("image/png")
        } catch {
          preDataUrl = null
        }
        ;(canvas as unknown as { __applied?: string }).__applied =
          preDataUrl ?? ""
        patch(layerId, { rasterDataUrl: preDataUrl })
        commit()

        const ctx = canvas.getContext("2d")
        if (!ctx) return
        applyStroke(ctx, tool, brushColor, brushSize, brushHardness, [
          { x: docX, y: docY },
          { x: docX + 0.01, y: docY + 0.01 },
        ])
        startStroke({ pointerId: e.pointerId, layerId, mode: tool })
        return
      }

      if (tool === "refine") {
        if (docX < 0 || docX > DOC_W || docY < 0 || docY > DOC_H) return
        // Refine paints into a layer's editable alpha mask. Pick the
        // selected masked-raster layer; bail if none.
        const target =
          selectedIds.length === 1
            ? layers.find((l) => l.id === selectedIds[0])
            : layers.find((l) => l.maskDataUrl && l.kind === "raster")
        if (!target) return
        if (!target.maskDataUrl) return
        if (target.locked) return
        e.preventDefault()
        // Photoshop convention: hold Alt to flip the brush direction for
        // one stroke without changing the panel toggle.
        const effectiveMode: "restore" | "erase" = e.altKey
          ? refineMode === "restore"
            ? "erase"
            : "restore"
          : refineMode
        startMaskStroke({
          pointerId: e.pointerId,
          layerId: target.id,
          mode: effectiveMode,
        })
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
        // Photoshop modifier shortcuts: Shift = add, Alt/Option = subtract,
        // Shift+Alt = intersect. They override the panel's selection mode for
        // this single click (Photoshop behavior).
        const effectiveMode: WandMaskMode =
          e.shiftKey && e.altKey
            ? "intersect"
            : e.shiftKey
              ? "add"
              : e.altKey
                ? "subtract"
                : wandMode
        const activeLayerId =
          selectedIds.length === 1 ? (selectedIds[0] ?? null) : null
        void floodFillMask(
          layers,
          getRasterCanvas,
          Math.round(docX),
          Math.round(docY),
          wandTolerance,
          DOC_W,
          DOC_H,
          {
            sampleSize: wandSampleSize,
            contiguous: wandContiguous,
            antiAlias: wandAntiAlias,
            sampleAllLayers: wandSampleAllLayers,
            activeLayerId,
          }
        )
          .then((mask) => combineMasks(pixelMask, mask, effectiveMode))
          .then((mask) => setPixelMask(mask))
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
        startZoomDrag({
          pointerId: e.pointerId,
          startDocX: docX,
          startDocY: docY,
          curDocX: docX,
          curDocY: docY,
        })
        return
      }

      // Marquee + deselect on canvas background. Layers stop propagation in
      // move/marquee mode, so reaching this line means the click missed every
      // unlocked layer — treat it as a background click.
      if (tool !== "move" && tool !== "marquee") return
      e.preventDefault()
      startMarquee({
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
      wandSampleSize,
      wandContiguous,
      wandAntiAlias,
      wandSampleAllLayers,
      wandMode,
      pixelMask,
      setPixelMask,
      refineMode,
      startShapeDraw,
      startStroke,
      startMaskStroke,
      startZoomDrag,
      startMarquee,
      setPenAnchors,
      setPenHover,
      DOC_W,
      DOC_H,
      docRef,
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
    [
      scale,
      setCursor,
      tool,
      penAnchors.length,
      DOC_W,
      DOC_H,
      docRef,
      setPenHover,
    ]
  )

  return { onContainerPointerDown, onPointerMoveCanvas }
}
