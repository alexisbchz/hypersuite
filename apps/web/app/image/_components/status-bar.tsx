"use client"

import { useEditor } from "./editor-context"

export function StatusBar() {
  const { tool, layers, selectedId } = useEditor()
  const sel = layers.find((l) => l.id === selectedId)
  return (
    <footer className="flex h-7 shrink-0 items-center gap-3 border-t border-border bg-background px-3 text-[11px] text-muted-foreground">
      <span className="capitalize">{tool}</span>
      <span className="text-foreground/30">·</span>
      <span>{layers.length} layers</span>
      {sel && (
        <>
          <span className="text-foreground/30">·</span>
          <span>
            {sel.name} —{" "}
            <span className="font-mono">
              {Math.round(sel.width)} × {Math.round(sel.height)}
            </span>{" "}
            @{" "}
            <span className="font-mono">
              {Math.round(sel.x)}, {Math.round(sel.y)}
            </span>
          </span>
        </>
      )}
      <span className="ms-auto font-mono">Hypersuite Image · prototype</span>
    </footer>
  )
}
