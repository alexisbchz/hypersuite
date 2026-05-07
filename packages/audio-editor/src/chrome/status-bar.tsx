"use client"

import { useEditor } from "../editor"
import { formatTime } from "../lib/geometry"

export function StatusBar() {
  const { pxPerSec, sampleRate, clips, hovered, tool } = useEditor()
  return (
    <footer className="flex h-7 shrink-0 items-center justify-between border-t border-border bg-background px-3 font-mono text-[11px] text-muted-foreground">
      <div className="flex items-center gap-3">
        <span>Tool: {tool}</span>
        <span>·</span>
        <span>{clips.length} clip{clips.length === 1 ? "" : "s"}</span>
        <span>·</span>
        <span>{Math.round(pxPerSec)} px/sec</span>
      </div>
      <div className="flex items-center gap-3">
        {hovered && <span>{formatTime(hovered.time, true)}</span>}
        <span>{(sampleRate / 1000).toFixed(1)} kHz</span>
      </div>
    </footer>
  )
}
