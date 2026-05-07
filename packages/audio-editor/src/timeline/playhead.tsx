"use client"

import { useEditor } from "../editor"

export function Playhead() {
  const { playhead, pxPerSec, scrollX } = useEditor()
  const x = playhead * pxPerSec - scrollX
  if (x < 0) return null
  return (
    <div
      className="pointer-events-none absolute top-0 bottom-0 w-px bg-primary"
      style={{ transform: `translateX(${x}px)` }}
    >
      <div className="absolute -top-1 -left-1.5 size-3 rounded-sm bg-primary" />
    </div>
  )
}
