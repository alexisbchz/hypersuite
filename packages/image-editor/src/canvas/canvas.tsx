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
import { useCanvasPointer } from "./hooks/use-canvas-pointer"
import { useFitKeys } from "./hooks/use-fit-keys"
import { useLayerDrag } from "./hooks/use-layer-drag"
import { useMarqueeDrag } from "./hooks/use-marquee-drag"
import { useMultiTransform } from "./hooks/use-multi-transform"
import { usePanDrag } from "./hooks/use-pan-drag"
import { useRasterStroke } from "./hooks/use-raster-stroke"
import { useResize } from "./hooks/use-resize"
import { useRotate } from "./hooks/use-rotate"
import { usePenTool } from "./hooks/use-pen-tool"
import { useShapeDraw } from "./hooks/use-shape-draw"
import { useWheelInteraction } from "./hooks/use-wheel-interaction"
import { useZoomDrag } from "./hooks/use-zoom-drag"

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
  const {
    penAnchors,
    setPenAnchors,
    penHover,
    setPenHover,
    finishPenPath,
  } = usePenTool({ tool, brushColor, addPath })
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({
    v: [],
    h: [],
  })
  const [spacingGuides, setSpacingGuides] = useState<SpacingGuides[]>([])

  const panMode = tool === "pan" || spacePressed

  const { pan, startPan } = usePanDrag({ panX, panY, setPan })
  useWheelInteraction({ containerRef, zoom, panX, panY, setZoom, setPan })
  const { drag, startLayerDrag } = useLayerDrag({
    layers,
    selectedIds,
    tool,
    panMode,
    scale,
    snapPx,
    snappingOn,
    docW: DOC_W,
    docH: DOC_H,
    select,
    patchMany,
    commit,
    setGuides,
    setSpacingGuides,
  })
  const { resize, startResize } = useResize({
    layers,
    scale,
    snapPx,
    snappingOn,
    docW: DOC_W,
    docH: DOC_H,
    patch,
    commit,
    setGuides,
  })
  const { rotate, startRotate } = useRotate({ docRef, scale, patch, commit })
  const { multiResize, multiRotate, startMultiResize, startMultiRotate } =
    useMultiTransform({
      docRef,
      scale,
      layers,
      selectedIds,
      patchMany,
      commit,
    })
  const { shapeDraw, startShapeDraw } = useShapeDraw({
    docRef,
    scale,
    patch,
  })
  const { stroke, startStroke } = useRasterStroke({
    docRef,
    scale,
    brushColor,
    brushSize,
    brushHardness,
    getRasterCanvas,
    patch,
    commitRaster,
  })
  const { zoomDrag, startZoomDrag } = useZoomDrag({
    containerRef,
    docRef,
    zoom,
    scale,
    panX,
    panY,
    setZoom,
    setPan,
    zoomToRect,
  })
  const { marquee, startMarquee } = useMarqueeDrag({
    docRef,
    scale,
    layers,
    selectMany,
  })
  useFitKeys({
    containerRef,
    docW: DOC_W,
    docH: DOC_H,
    layers,
    selectedIds,
    zoomToRect,
  })
  const { onContainerPointerDown, onPointerMoveCanvas } = useCanvasPointer({
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
    penAnchors,
    startPan,
    startShapeDraw,
    startStroke,
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
  })

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


