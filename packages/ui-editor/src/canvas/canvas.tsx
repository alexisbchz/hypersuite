"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Image01Icon, LinkSquare02Icon } from "@hugeicons/core-free-icons"

import { cn } from "@workspace/ui/lib/utils"
import { useEditor } from "../editor"
import type { Frame, ResizeHandle } from "../lib/types"
import { SelectionHandles } from "./handles"
import { PlaygroundPreview } from "./playground-preview"

type DragState =
  | {
      kind: "move"
      ids: string[]
      startPointer: { x: number; y: number }
      startPositions: Map<string, { x: number; y: number }>
    }
  | {
      kind: "resize"
      id: string
      handle: ResizeHandle
      startPointer: { x: number; y: number }
      startRect: { x: number; y: number; width: number; height: number }
    }
  | {
      kind: "pan"
      startPointer: { x: number; y: number }
      startPan: { x: number; y: number }
    }

const MIN_FRAME = 40

export function Canvas() {
  const {
    frames,
    selectedIds,
    select,
    isSelected,
    patch,
    commit,
    addImage,
    addPlayground,
    zoom,
    setZoom,
    panX,
    panY,
    setPan,
    spacePressed,
    tool,
    setTool,
  } = useEditor()

  const surfaceRef = useRef<HTMLDivElement | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [dropping, setDropping] = useState(false)

  const scale = zoom / 100

  // Convert a viewport coordinate into canvas-world coordinates (the
  // coordinate space frames live in). The canvas itself is centered in
  // the surface and offset by (panX, panY) before scaling.
  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const surface = surfaceRef.current
      if (!surface) return { x: 0, y: 0 }
      const rect = surface.getBoundingClientRect()
      const cx = clientX - rect.left - rect.width / 2 - panX
      const cy = clientY - rect.top - rect.height / 2 - panY
      return { x: cx / scale, y: cy / scale }
    },
    [panX, panY, scale]
  )

  // Wheel: ctrl/meta + wheel zooms around the cursor; plain wheel pans.
  // This is the conventional Figma/Photoshop pattern.
  useEffect(() => {
    const el = surfaceRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        const surface = surfaceRef.current
        if (!surface) return
        const rect = surface.getBoundingClientRect()
        const cx = e.clientX - rect.left - rect.width / 2
        const cy = e.clientY - rect.top - rect.height / 2
        // Zoom around the cursor: the world point under the cursor stays
        // fixed. Solving for new pan: panNext = cursor - worldPt * scaleNext.
        const worldX = (cx - panX) / scale
        const worldY = (cy - panY) / scale
        const next = Math.min(800, Math.max(10, zoom * (1 - e.deltaY * 0.002)))
        const nextScale = next / 100
        const nextPanX = cx - worldX * nextScale
        const nextPanY = cy - worldY * nextScale
        setZoom(next)
        setPan(nextPanX, nextPanY)
      } else {
        setPan(panX - e.deltaX, panY - e.deltaY)
      }
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [panX, panY, scale, zoom, setPan, setZoom])

  // Global pointer-move/up so drags survive leaving the canvas surface.
  useEffect(() => {
    if (!drag) return
    const onMove = (e: PointerEvent) => {
      if (drag.kind === "pan") {
        setPan(
          drag.startPan.x + (e.clientX - drag.startPointer.x),
          drag.startPan.y + (e.clientY - drag.startPointer.y)
        )
        return
      }
      const dx = (e.clientX - drag.startPointer.x) / scale
      const dy = (e.clientY - drag.startPointer.y) / scale
      if (drag.kind === "move") {
        for (const id of drag.ids) {
          const start = drag.startPositions.get(id)
          if (!start) continue
          patch(id, {
            x: Math.round(start.x + dx),
            y: Math.round(start.y + dy),
          })
        }
      } else if (drag.kind === "resize") {
        const { handle, startRect } = drag
        let nx = startRect.x
        let ny = startRect.y
        let nw = startRect.width
        let nh = startRect.height
        if (handle.includes("e")) nw = Math.max(MIN_FRAME, startRect.width + dx)
        if (handle.includes("s"))
          nh = Math.max(MIN_FRAME, startRect.height + dy)
        if (handle.includes("w")) {
          const candidate = Math.max(MIN_FRAME, startRect.width - dx)
          nx = startRect.x + (startRect.width - candidate)
          nw = candidate
        }
        if (handle.includes("n")) {
          const candidate = Math.max(MIN_FRAME, startRect.height - dy)
          ny = startRect.y + (startRect.height - candidate)
          nh = candidate
        }
        patch(drag.id, {
          x: Math.round(nx),
          y: Math.round(ny),
          width: Math.round(nw),
          height: Math.round(nh),
        })
      }
    }
    const onUp = () => {
      if (drag.kind !== "pan") commit()
      setDrag(null)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [drag, scale, patch, commit, setPan])

  const startFrameDrag = useCallback(
    (frame: Frame, e: React.PointerEvent) => {
      if (frame.locked) return
      e.stopPropagation()
      const additive = e.shiftKey
      const alreadySelected = isSelected(frame.id)
      let ids: string[]
      if (alreadySelected && selectedIds.length > 1) {
        ids = selectedIds
      } else if (additive) {
        ids = alreadySelected
          ? selectedIds
          : Array.from(new Set([...selectedIds, frame.id]))
        select(frame.id, { additive: true })
      } else {
        ids = [frame.id]
        select(frame.id)
      }
      const startPositions = new Map<string, { x: number; y: number }>()
      for (const id of ids) {
        const f = frames.find((x) => x.id === id)
        if (f) startPositions.set(id, { x: f.x, y: f.y })
      }
      setDrag({
        kind: "move",
        ids,
        startPointer: { x: e.clientX, y: e.clientY },
        startPositions,
      })
    },
    [frames, isSelected, selectedIds, select]
  )

  const startResize = useCallback(
    (frame: Frame, handle: ResizeHandle, e: React.PointerEvent) => {
      e.stopPropagation()
      select(frame.id)
      setDrag({
        kind: "resize",
        id: frame.id,
        handle,
        startPointer: { x: e.clientX, y: e.clientY },
        startRect: {
          x: frame.x,
          y: frame.y,
          width: frame.width,
          height: frame.height,
        },
      })
    },
    [select]
  )

  const onSurfacePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 1 || spacePressed || tool === "pan") {
        e.preventDefault()
        setDrag({
          kind: "pan",
          startPointer: { x: e.clientX, y: e.clientY },
          startPan: { x: panX, y: panY },
        })
        return
      }
      if (tool === "playground") {
        const pt = toWorld(e.clientX, e.clientY)
        addPlayground({ x: pt.x, y: pt.y })
        setTool("move")
        return
      }
      if (tool === "image") {
        // Triggering the hidden file input is handled by the chrome.
        // Falling through to a click-clears-selection feels surprising,
        // so just no-op.
        return
      }
      select(null)
    },
    [panX, panY, spacePressed, tool, toWorld, addPlayground, select, setTool]
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (Array.from(e.dataTransfer.types).includes("Files")) {
      e.preventDefault()
      setDropping(true)
    }
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget === e.target) setDropping(false)
  }, [])

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setDropping(false)
      const files = Array.from(e.dataTransfer.files)
      if (!files.length) return
      const pt = toWorld(e.clientX, e.clientY)
      let offset = 0
      for (const f of files) {
        if (f.type.startsWith("image/")) {
          await addImage(f, { x: pt.x + offset, y: pt.y + offset })
          offset += 24
        }
      }
    },
    [addImage, toWorld]
  )

  const surfaceCursor =
    drag?.kind === "pan"
      ? "grabbing"
      : spacePressed || tool === "pan"
        ? "grab"
        : tool === "playground"
          ? "crosshair"
          : "default"

  return (
    <div
      ref={surfaceRef}
      className={cn(
        "relative min-h-0 flex-1 overflow-hidden bg-muted/30",
        "select-none"
      )}
      style={{ cursor: surfaceCursor }}
      onPointerDown={onSurfacePointerDown}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <CanvasGrid />

      <div
        className="absolute top-1/2 left-1/2 origin-center"
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
        }}
      >
        {frames.map((frame) => (
          <FrameView
            key={frame.id}
            frame={frame}
            selected={isSelected(frame.id)}
            scale={scale}
            onPointerDown={(e) => startFrameDrag(frame, e)}
            onResizeStart={(h, e) => startResize(frame, h, e)}
          />
        ))}
      </div>

      {frames.length === 0 && <EmptyState />}

      {dropping && (
        <div className="pointer-events-none absolute inset-3 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5" />
      )}
    </div>
  )
}

function FrameView({
  frame,
  selected,
  scale,
  onPointerDown,
  onResizeStart,
}: {
  frame: Frame
  selected: boolean
  scale: number
  onPointerDown: (e: React.PointerEvent) => void
  onResizeStart: (handle: ResizeHandle, e: React.PointerEvent) => void
}) {
  return (
    <div
      className="absolute"
      style={{
        left: frame.x,
        top: frame.y,
        width: frame.width,
        height: frame.height,
      }}
    >
      {/* Frame label above the frame (Figma-style). */}
      <div
        className={cn(
          "absolute -top-5 left-0 origin-bottom-left text-[11px] leading-none whitespace-nowrap",
          selected ? "text-primary" : "text-muted-foreground"
        )}
        style={{ transform: `scale(${1 / scale})` }}
      >
        {frame.name}
      </div>

      <div
        onPointerDown={onPointerDown}
        className={cn(
          "absolute inset-0 overflow-hidden rounded-[1px] bg-white",
          "ring-1",
          selected
            ? "ring-2 ring-primary"
            : "ring-black/10 hover:ring-black/30",
          frame.kind === "image" ? "cursor-grab" : "cursor-default"
        )}
        style={{
          // CSS ring-2 is in screen pixels — we want it to stay 1.5px on
          // screen regardless of zoom, so we scale the ring color by the
          // canvas scale via outline-width which DOES scale with the
          // transform. Easier: just use ring-1 which is fine in practice.
          boxShadow: selected
            ? `0 0 0 ${1.5 / scale}px var(--color-primary)`
            : undefined,
        }}
      >
        {frame.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={frame.src}
            alt={frame.name}
            className="pointer-events-none block h-full w-full object-cover select-none"
            style={{ opacity: frame.opacity / 100 }}
            draggable={false}
          />
        ) : (
          <PlaygroundPreview
            html={frame.html}
            background={frame.background}
            width={frame.width}
            height={frame.height}
          />
        )}
      </div>

      {selected && (
        <SelectionHandles scale={scale} onResizeStart={onResizeStart} />
      )}
    </div>
  )
}

function CanvasGrid() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-50"
      style={{
        backgroundImage:
          "radial-gradient(circle, color-mix(in oklab, var(--color-foreground) 12%, transparent) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    />
  )
}

function EmptyState() {
  const { addPlayground, setTool } = useEditor()
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="pointer-events-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-background/80 p-8 text-center backdrop-blur">
        <h2 className="text-base font-semibold text-foreground">
          Hypersuite UI
        </h2>
        <p className="text-sm text-muted-foreground">
          Drop a screenshot to use as a reference, or add a playground frame to
          start writing Tailwind.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => addPlayground()}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground hover:bg-muted"
          >
            <HugeiconsIcon icon={LinkSquare02Icon} className="size-3.5" />
            New playground
          </button>
          <button
            type="button"
            onClick={() => setTool("image")}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground hover:bg-muted"
          >
            <HugeiconsIcon icon={Image01Icon} className="size-3.5" />
            Add reference image
          </button>
        </div>
      </div>
    </div>
  )
}
