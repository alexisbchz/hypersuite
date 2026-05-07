"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  Cursor02Icon,
  CursorMagicSelection02Icon,
  Move02Icon,
  Scissor01Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

import { useEditor } from "../editor"
import type { ToolId } from "../lib/types"

type ToolDef = {
  id: ToolId
  label: string
  shortcut: string
  icon: typeof Cursor02Icon
}

const TOOLS: ToolDef[] = [
  { id: "select", label: "Select", shortcut: "V", icon: Cursor02Icon },
  { id: "split", label: "Split", shortcut: "S", icon: Scissor01Icon },
  {
    id: "draw",
    label: "Draw region",
    shortcut: "D",
    icon: CursorMagicSelection02Icon,
  },
  { id: "pan", label: "Pan", shortcut: "H", icon: Move02Icon },
  { id: "zoom", label: "Zoom", shortcut: "Z", icon: ViewIcon },
]

export function ToolPalette() {
  const { tool, setTool } = useEditor()

  return (
    <aside className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border bg-background py-2">
      {TOOLS.map((t) => {
        const active = tool === t.id
        return (
          <Tooltip key={t.id}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={() => setTool(t.id)}
                  aria-label={t.label}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-md transition-colors",
                    active
                      ? "bg-foreground text-background"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <HugeiconsIcon icon={t.icon} className="size-4" />
                </button>
              }
            />
            <TooltipContent side="right">
              {t.label} · {t.shortcut}
            </TooltipContent>
          </Tooltip>
        )
      })}
    </aside>
  )
}
