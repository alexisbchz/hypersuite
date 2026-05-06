"use client"

import { cn } from "@workspace/ui/lib/utils"
import { useEditor, type ViewToggles } from "./editor-context"

const TOGGLES: Array<{ key: keyof ViewToggles; label: string }> = [
  { key: "rulers", label: "Rulers" },
  { key: "grid", label: "Grid" },
  { key: "snapping", label: "Snap" },
  { key: "guides", label: "Guides" },
]

export function StatusBar() {
  const {
    tool,
    layers,
    selectedId,
    selectedIds,
    cursor,
    spacePressed,
    viewToggles,
    setViewToggle,
  } = useEditor()
  const sel = layers.find((l) => l.id === selectedId)
  const activeTool = spacePressed ? "pan (hold)" : tool
  return (
    <footer className="flex h-7 shrink-0 items-center gap-3 border-t border-border bg-background px-3 text-[11px] text-muted-foreground">
      <span className="capitalize">{activeTool}</span>
      <span className="text-foreground/30">·</span>
      <span>{layers.length} layers</span>
      {selectedIds.length > 1 ? (
        <>
          <span className="text-foreground/30">·</span>
          <span>{selectedIds.length} selected</span>
        </>
      ) : (
        sel && (
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
        )
      )}
      {cursor && (
        <>
          <span className="text-foreground/30">·</span>
          <span className="font-mono">
            {Math.round(cursor.x)}, {Math.round(cursor.y)}
          </span>
        </>
      )}
      <div className="ms-auto flex items-center gap-1">
        {TOGGLES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setViewToggle(t.key, !viewToggles[t.key])}
            aria-pressed={viewToggles[t.key]}
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] transition-colors",
              viewToggles[t.key]
                ? "bg-primary/10 text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
        <span className="ms-2 font-mono text-foreground/40">
          Hypersuite Image · prototype
        </span>
      </div>
    </footer>
  )
}
