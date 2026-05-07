"use client"

import { useEffect, useRef } from "react"
import { useEditor } from "../editor"
import type { Clip as ClipType, Track } from "../lib/types"
import { drawPeaks } from "../lib/waveform"
import { cn } from "@workspace/ui/lib/utils"

type Props = {
  clip: ClipType
  track: Track
  onPointerDown?: (e: React.PointerEvent, side: "body" | "left" | "right") => void
}

export function Clip({ clip, track, onPointerDown }: Props) {
  const { pxPerSec, scrollX, getPeaks, getBuffer, selection } = useEditor()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const left = clip.start * pxPerSec - scrollX
  const width = Math.max(2, clip.duration * pxPerSec)
  const isSelected =
    selection?.kind === "clips" && selection.clipIds.includes(clip.id)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const peaks = getPeaks(clip.bufferRef)
    const buf = getBuffer(clip.bufferRef)
    if (!peaks || !buf) return
    const dpr = window.devicePixelRatio || 1
    const cssH = track.height - 28
    canvas.width = Math.max(2, Math.floor(width * dpr))
    canvas.height = Math.max(2, Math.floor(cssH * dpr))
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    drawPeaks(ctx, peaks, {
      sampleRate: buf.sampleRate,
      offsetSec: clip.offset,
      durationSec: clip.duration,
      width: width,
      height: cssH,
      color: track.color,
      devicePixelRatio: dpr,
    })
  }, [
    clip.bufferRef,
    clip.duration,
    clip.offset,
    getBuffer,
    getPeaks,
    track.color,
    track.height,
    width,
  ])

  // Don't render if entirely off-screen.
  if (left + width < 0) return null

  return (
    <div
      onPointerDown={(e) => onPointerDown?.(e, "body")}
      className={cn(
        "absolute top-1 select-none rounded-md border shadow-sm",
        isSelected
          ? "border-primary ring-1 ring-primary"
          : "border-border hover:border-foreground/40"
      )}
      style={{
        left,
        width,
        height: track.height - 8,
        background: `color-mix(in oklch, ${track.color} 18%, transparent)`,
      }}
    >
      <div className="flex h-6 items-center gap-1 truncate px-2 text-[11px] font-medium">
        <span
          className="size-1.5 shrink-0 rounded-full"
          style={{ background: track.color }}
        />
        <span className="truncate">{clip.name}</span>
      </div>
      <canvas
        ref={canvasRef}
        style={{ width, height: track.height - 28 }}
        className="block"
      />

      {/* Fade-in overlay */}
      {clip.fadeInSec > 0 && (
        <div
          className="pointer-events-none absolute top-6 left-0 bg-background/60"
          style={{
            width: Math.min(width, clip.fadeInSec * pxPerSec),
            height: track.height - 28,
            clipPath: "polygon(0 0, 100% 0, 0 100%)",
          }}
        />
      )}
      {clip.fadeOutSec > 0 && (
        <div
          className="pointer-events-none absolute top-6 bg-background/60"
          style={{
            right: 0,
            width: Math.min(width, clip.fadeOutSec * pxPerSec),
            height: track.height - 28,
            clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
          }}
        />
      )}

      {/* Trim handles */}
      <div
        onPointerDown={(e) => {
          e.stopPropagation()
          onPointerDown?.(e, "left")
        }}
        className="absolute top-0 bottom-0 left-0 w-1.5 cursor-ew-resize bg-foreground/0 hover:bg-foreground/20"
      />
      <div
        onPointerDown={(e) => {
          e.stopPropagation()
          onPointerDown?.(e, "right")
        }}
        className="absolute top-0 right-0 bottom-0 w-1.5 cursor-ew-resize bg-foreground/0 hover:bg-foreground/20"
      />
    </div>
  )
}
