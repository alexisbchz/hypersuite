"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon } from "@hugeicons/core-free-icons"

import { Button } from "@workspace/ui/components/button"

import { useEditor } from "../editor"
import { Playhead } from "./playhead"
import { Ruler, RULER_HEIGHT_PX } from "./ruler"
import { TRACK_HEADER_WIDTH, TrackRow } from "./track-row"

export function Timeline() {
  const {
    tracks,
    addTrack,
    pxPerSec,
    scrollX,
    setScrollX,
    setPlayhead,
    setHovered,
    setSelection,
    zoomBy,
  } = useEditor()
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect
      if (r) setSize({ width: r.width, height: r.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const lanesWidth = Math.max(0, size.width - TRACK_HEADER_WIDTH)

  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15)
    } else if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      setScrollX(Math.max(0, scrollX + (e.deltaX || e.deltaY)))
    }
  }

  const onLanesAreaPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const t = (x + scrollX) / pxPerSec
    setPlayhead(t)
    setSelection(null)
  }

  const onLanesAreaMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const t = (x + scrollX) / pxPerSec
    setHovered({ time: t, trackId: null })
  }

  return (
    <div
      ref={containerRef}
      className="relative flex flex-1 flex-col overflow-hidden bg-background"
      onWheel={onWheel}
    >
      <div className="flex shrink-0">
        <div
          className="shrink-0 border-r border-b border-border bg-muted/30"
          style={{ width: TRACK_HEADER_WIDTH, height: RULER_HEIGHT_PX }}
        />
        <Ruler width={lanesWidth} />
      </div>

      <div className="relative flex-1 overflow-y-auto">
        {tracks.map((t) => (
          <TrackRow key={t.id} track={t} />
        ))}

        <div
          onPointerDown={onLanesAreaPointerDown}
          onMouseMove={onLanesAreaMouseMove}
          onMouseLeave={() => setHovered(null)}
          className="flex items-center border-b border-border bg-background/40 p-2"
          style={{ paddingLeft: 8 }}
        >
          <div style={{ width: TRACK_HEADER_WIDTH - 8 }} />
          <Button variant="outline" size="sm" onClick={() => addTrack()}>
            <HugeiconsIcon icon={Add01Icon} />
            Add track
          </Button>
        </div>

        <div
          className="pointer-events-none absolute top-0 bottom-0"
          style={{ left: TRACK_HEADER_WIDTH, right: 0, overflow: "hidden" }}
        >
          <Playhead />
        </div>
      </div>
    </div>
  )
}
