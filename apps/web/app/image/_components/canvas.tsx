"use client"

import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ImageIcon } from "@hugeicons/core-free-icons"

import { useEditor } from "./editor-context"
import { cn } from "@workspace/ui/lib/utils"
import illustration from "../illustration.webp"
import type { Layer } from "./types"

const DOC_W = 1200
const DOC_H = 800

type DragState = {
  id: string
  pointerId: number
  startClientX: number
  startClientY: number
  startX: number
  startY: number
  shifted: boolean
  moved: boolean
}

export function Canvas() {
  const { layers, selectedId, select, zoom, addImage, patch, tool } = useEditor()
  const scale = zoom / 100
  const docRef = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)
  const [drag, setDrag] = useState<DragState | null>(null)

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      dragDepth.current = 0
      setDragging(false)
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
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!hasFiles(e)) return
    e.preventDefault()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragging(false)
  }, [])

  // Window-level listeners while a layer drag is active
  useEffect(() => {
    if (!drag) return

    const layer = layers.find((l) => l.id === drag.id)
    if (!layer) {
      setDrag(null)
      return
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return
      let dx = (e.clientX - drag.startClientX) / scale
      let dy = (e.clientY - drag.startClientY) / scale
      if (e.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0
        else dx = 0
      }
      const moved = drag.moved || Math.hypot(dx, dy) > 1
      if (moved && !drag.moved) {
        setDrag({ ...drag, moved: true })
      }
      patch(drag.id, {
        x: Math.round(drag.startX + dx),
        y: Math.round(drag.startY + dy),
      })
    }

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return
      setDrag(null)
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
    }
  }, [drag, layers, patch, scale])

  const startLayerDrag = useCallback(
    (e: React.PointerEvent, layer: Layer) => {
      if (layer.locked) return
      if (tool !== "move") return
      // Only primary button
      if (e.button !== 0) return
      e.stopPropagation()
      e.preventDefault()
      select(layer.id)
      setDrag({
        id: layer.id,
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: layer.x,
        startY: layer.y,
        shifted: e.shiftKey,
        moved: false,
      })
    },
    [select, tool]
  )

  return (
    <div
      className={cn(
        "relative flex flex-1 items-center justify-center overflow-hidden bg-[color-mix(in_oklch,var(--color-muted),var(--color-background)_30%)]",
        drag && "cursor-grabbing select-none"
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CheckerBackground />
      <div
        ref={docRef}
        className="relative origin-center shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] ring-1 ring-black/5"
        style={{
          width: DOC_W * scale,
          height: DOC_H * scale,
          background: "var(--color-background)",
        }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) select(null)
        }}
      >
        {layers
          .slice()
          .reverse()
          .map((l) => {
            if (!l.visible) return null
            const selected = l.id === selectedId
            const draggable = !l.locked && tool === "move"
            const common = {
              className: cn(
                "absolute select-none outline-none",
                selected && "ring-2 ring-primary ring-offset-0",
                draggable
                  ? drag?.id === l.id
                    ? "cursor-grabbing"
                    : "cursor-grab"
                  : "cursor-default"
              ),
              style: {
                left: l.x * scale,
                top: l.y * scale,
                width: l.width * scale,
                height: l.height * scale,
                opacity: l.opacity / 100,
                mixBlendMode: l.blendMode as React.CSSProperties["mixBlendMode"],
                transform: `rotate(${l.rotation}deg)`,
                touchAction: "none",
              } as React.CSSProperties,
              onPointerDown: (e: React.PointerEvent) => startLayerDrag(e, l),
              onMouseDown: (e: React.MouseEvent) => {
                e.stopPropagation()
                if (!l.locked) select(l.id)
              },
            }

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
                    className="pointer-events-none rounded-md object-cover"
                  />
                </div>
              )
            }

            if (l.kind === "text" && l.id === "title") {
              return (
                <div
                  key={l.id}
                  {...common}
                  style={{
                    ...common.style,
                    fontSize: 56 * scale,
                    color: l.color,
                  }}
                  className={cn(
                    common.className,
                    "flex items-center font-semibold"
                  )}
                >
                  Hypersuite
                </div>
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
              />
            )
          })}
      </div>

      {dragging && <DropOverlay />}
      <RulerBadge zoom={zoom} />
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
      className="pointer-events-none absolute inset-0 opacity-50"
      style={{
        backgroundImage:
          "linear-gradient(45deg, var(--color-muted) 25%, transparent 25%), linear-gradient(-45deg, var(--color-muted) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--color-muted) 75%), linear-gradient(-45deg, transparent 75%, var(--color-muted) 75%)",
        backgroundSize: "20px 20px",
        backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0",
      }}
    />
  )
}

function RulerBadge({ zoom }: { zoom: number }) {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-md bg-background/80 px-2 py-1 text-xs text-muted-foreground shadow-sm ring-1 ring-border backdrop-blur">
      <span className="font-mono">
        {DOC_W} × {DOC_H}
      </span>
      <span className="text-foreground/40">·</span>
      <span className="font-mono">{zoom}%</span>
    </div>
  )
}
