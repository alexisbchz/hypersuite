"use client"

import { useEditor } from "../editor"

export function StatusBar() {
  const { tool, frames, selectedFrame, spacePressed, zoom } = useEditor()
  const activeTool = spacePressed ? "pan (hold)" : tool
  return (
    <footer className="hidden h-7 shrink-0 items-center gap-3 border-t border-border bg-background px-3 text-[11px] text-muted-foreground sm:flex">
      <span className="capitalize">{activeTool}</span>
      <span className="text-foreground/30">·</span>
      <span>
        {frames.length} {frames.length === 1 ? "frame" : "frames"}
      </span>
      {selectedFrame && (
        <>
          <span className="text-foreground/30">·</span>
          <span>
            {selectedFrame.name} —{" "}
            <span className="font-mono">
              {Math.round(selectedFrame.width)} ×{" "}
              {Math.round(selectedFrame.height)}
            </span>{" "}
            @{" "}
            <span className="font-mono">
              {Math.round(selectedFrame.x)}, {Math.round(selectedFrame.y)}
            </span>
          </span>
        </>
      )}
      <div className="ms-auto flex items-center gap-2 font-mono text-foreground/40">
        <span>{Math.round(zoom)}%</span>
        <span>·</span>
        <span>Hypercreate UI · prototype</span>
      </div>
    </footer>
  )
}
