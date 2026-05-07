"use client"

import { useEffect, useRef } from "react"
import { useEditor } from "../editor"
import { formatTime } from "../lib/geometry"

const RULER_HEIGHT = 28

export function Ruler({ width }: { width: number }) {
  const { pxPerSec, scrollX } = useEditor()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = RULER_HEIGHT * dpr
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, width, RULER_HEIGHT)

    const styles = getComputedStyle(canvas)
    const fg = styles.getPropertyValue("--color-muted-foreground").trim() ||
      "#888"
    const fgStrong = styles.getPropertyValue("--color-foreground").trim() ||
      "#fff"

    // Choose tick spacing in seconds based on zoom
    const targetPx = 80
    const rawSec = targetPx / pxPerSec
    const niceSecs = [0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60, 120, 300, 600]
    const tickSec = niceSecs.find((n) => n >= rawSec) ?? 600

    const startSec = scrollX / pxPerSec
    const endSec = (scrollX + width) / pxPerSec
    const firstTick = Math.floor(startSec / tickSec) * tickSec

    ctx.font = "10px ui-sans-serif, system-ui"
    ctx.textBaseline = "top"

    for (let s = firstTick; s <= endSec + tickSec; s += tickSec) {
      const x = s * pxPerSec - scrollX
      ctx.strokeStyle = fg
      ctx.globalAlpha = 0.5
      ctx.beginPath()
      ctx.moveTo(x + 0.5, RULER_HEIGHT - 8)
      ctx.lineTo(x + 0.5, RULER_HEIGHT)
      ctx.stroke()

      ctx.globalAlpha = 1
      ctx.fillStyle = fgStrong
      ctx.fillText(formatTime(Math.max(0, s)), x + 4, 6)

      // sub-ticks
      ctx.globalAlpha = 0.3
      for (let k = 1; k < 5; k++) {
        const sx = x + (k * tickSec * pxPerSec) / 5
        ctx.beginPath()
        ctx.moveTo(sx + 0.5, RULER_HEIGHT - 4)
        ctx.lineTo(sx + 0.5, RULER_HEIGHT)
        ctx.stroke()
      }
    }
  }, [pxPerSec, scrollX, width])

  return (
    <div
      className="relative shrink-0 border-b border-border bg-muted/30"
      style={{ height: RULER_HEIGHT }}
    >
      <canvas
        ref={canvasRef}
        style={{ width, height: RULER_HEIGHT }}
        className="block"
      />
    </div>
  )
}

export const RULER_HEIGHT_PX = RULER_HEIGHT
