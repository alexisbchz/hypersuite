"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { CodeSquareIcon } from "@hugeicons/core-free-icons"

import { useEditor } from "../editor"
import { CodeEditorPanel } from "./code-editor-panel"

/** Bottom-docked code editor pane. When a playground frame is selected,
 *  Monaco renders here so the user can iterate on classes while seeing
 *  the canvas-side preview. */
export function CodePanel() {
  const { selectedFrame } = useEditor()
  const isPlayground = selectedFrame?.kind === "playground"
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex h-8 shrink-0 items-center gap-2 border-b border-border px-3">
        <HugeiconsIcon
          icon={CodeSquareIcon}
          className="size-3.5 text-muted-foreground"
        />
        <span className="text-[11px] font-medium text-foreground">
          {isPlayground ? `${selectedFrame.name} · HTML` : "Code"}
        </span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
          Tailwind Play CDN
        </span>
      </header>
      <div className="min-h-0 flex-1">
        <CodeEditorPanel />
      </div>
    </div>
  )
}
