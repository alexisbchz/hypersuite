"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  BrushIcon,
  ColorPickerIcon,
  CropIcon,
  Cursor02Icon,
  Eraser01Icon,
  Hexagon01Icon,
  MagicWand01Icon,
  Move02Icon,
  PencilIcon,
  PenTool01Icon,
  Square01Icon,
  TextFontIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons"

import { Separator } from "@workspace/ui/components/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"
import { useEditor } from "../editor"
import type { ToolId } from "../lib/types"

type Tool = {
  id: ToolId
  label: string
  shortcut: string
  icon: typeof Cursor02Icon
}

const TOP: Tool[] = [
  { id: "move", label: "Move", shortcut: "V", icon: Cursor02Icon },
  { id: "pan", label: "Hand · pan canvas", shortcut: "H", icon: Move02Icon },
  { id: "marquee", label: "Marquee", shortcut: "M", icon: Square01Icon },
  { id: "pen", label: "Pen", shortcut: "P", icon: PenTool01Icon },
  { id: "pencil", label: "Pencil", shortcut: "N", icon: PencilIcon },
  { id: "brush", label: "Brush", shortcut: "B", icon: BrushIcon },
  { id: "eraser", label: "Eraser", shortcut: "E", icon: Eraser01Icon },
  { id: "text", label: "Text", shortcut: "T", icon: TextFontIcon },
  { id: "shape", label: "Shape", shortcut: "U", icon: Hexagon01Icon },
]

const BOTTOM: Tool[] = [
  { id: "crop", label: "Crop", shortcut: "C", icon: CropIcon },
  { id: "picker", label: "Color picker", shortcut: "I", icon: ColorPickerIcon },
  { id: "wand", label: "Magic wand", shortcut: "W", icon: MagicWand01Icon },
  { id: "zoom", label: "Zoom", shortcut: "Z", icon: ViewIcon },
]

export function ToolPalette() {
  const { tool, setTool } = useEditor()

  return (
    <aside className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border bg-background py-2">
      {TOP.map((t) => (
        <ToolButton
          key={t.id}
          tool={t}
          active={tool === t.id}
          onSelect={setTool}
        />
      ))}
      <Separator className="my-1 w-6" />
      {BOTTOM.map((t) => (
        <ToolButton
          key={t.id}
          tool={t}
          active={tool === t.id}
          onSelect={setTool}
        />
      ))}
    </aside>
  )
}

function ToolButton({
  tool,
  active,
  onSelect,
}: {
  tool: Tool
  active: boolean
  onSelect: (id: ToolId) => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={() => onSelect(tool.id)}
            aria-label={tool.label}
            aria-pressed={active}
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              active &&
                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            )}
          >
            <HugeiconsIcon icon={tool.icon} className="size-4" />
          </button>
        }
      />
      <TooltipContent side="right">
        {tool.label}{" "}
        <span className="ml-1 text-muted-foreground">{tool.shortcut}</span>
      </TooltipContent>
    </Tooltip>
  )
}
