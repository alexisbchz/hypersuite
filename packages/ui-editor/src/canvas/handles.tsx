"use client"

import { cn } from "@workspace/ui/lib/utils"
import type { ResizeHandle } from "../lib/types"

type HandlesProps = {
  scale: number
  onResizeStart: (handle: ResizeHandle, e: React.PointerEvent) => void
}

const POSITIONS: { id: ResizeHandle; cls: string; cursor: string }[] = [
  { id: "nw", cls: "-top-1 -left-1", cursor: "nwse-resize" },
  { id: "n", cls: "-top-1 left-1/2 -translate-x-1/2", cursor: "ns-resize" },
  { id: "ne", cls: "-top-1 -right-1", cursor: "nesw-resize" },
  { id: "e", cls: "top-1/2 -right-1 -translate-y-1/2", cursor: "ew-resize" },
  { id: "se", cls: "-bottom-1 -right-1", cursor: "nwse-resize" },
  { id: "s", cls: "-bottom-1 left-1/2 -translate-x-1/2", cursor: "ns-resize" },
  { id: "sw", cls: "-bottom-1 -left-1", cursor: "nesw-resize" },
  { id: "w", cls: "top-1/2 -left-1 -translate-y-1/2", cursor: "ew-resize" },
]

export function SelectionHandles({ scale, onResizeStart }: HandlesProps) {
  // Handles live in screen space — we counter the canvas's CSS scale so the
  // dots stay the same visual size at any zoom level.
  const size = 8 / scale
  return (
    <>
      {POSITIONS.map((p) => (
        <button
          key={p.id}
          type="button"
          aria-label={`Resize ${p.id}`}
          onPointerDown={(e) => onResizeStart(p.id, e)}
          className={cn(
            "absolute rounded-[2px] border border-primary bg-background",
            p.cls
          )}
          style={{
            width: size,
            height: size,
            cursor: p.cursor,
          }}
        />
      ))}
    </>
  )
}
