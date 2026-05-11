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
  SparklesIcon,
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
  { id: "refine", label: "Refine mask", shortcut: "R", icon: SparklesIcon },
  { id: "zoom", label: "Zoom", shortcut: "Z", icon: ViewIcon },
]

export function ToolPalette({
  orientation = "vertical",
  className,
}: {
  orientation?: "vertical" | "horizontal"
  className?: string
}) {
  const { tool, setTool } = useEditor()
  const horizontal = orientation === "horizontal"

  return (
    <aside
      className={cn(
        horizontal
          ? "flex h-12 w-full shrink-0 flex-row items-center gap-1 overflow-x-auto border-t border-border bg-background px-2"
          : "flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border bg-background py-2",
        className
      )}
    >
      {TOP.map((t) => (
        <ToolButton
          key={t.id}
          tool={t}
          active={tool === t.id}
          orientation={orientation}
          onSelect={setTool}
        />
      ))}
      <Separator
        orientation={horizontal ? "vertical" : "horizontal"}
        className={horizontal ? "mx-1 h-6" : "my-1 w-6"}
      />
      {BOTTOM.map((t) => (
        <ToolButton
          key={t.id}
          tool={t}
          active={tool === t.id}
          orientation={orientation}
          onSelect={setTool}
        />
      ))}
    </aside>
  )
}

function ToolButton({
  tool,
  active,
  orientation,
  onSelect,
}: {
  tool: Tool
  active: boolean
  orientation: "vertical" | "horizontal"
  onSelect: (id: ToolId) => void
}) {
  const horizontal = orientation === "horizontal"
  const button = (
    <button
      type="button"
      onClick={() => onSelect(tool.id)}
      aria-label={tool.label}
      aria-pressed={active}
      className={cn(
        // Touch-friendlier on horizontal (phone) orientation; dense on vertical.
        "inline-flex shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        horizontal ? "size-9" : "size-8",
        active &&
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
      )}
    >
      <HugeiconsIcon icon={tool.icon} className="size-4" />
    </button>
  )

  // On phone (horizontal), hover tooltips are dead weight and can stick on
  // touch — render the button directly without a Tooltip wrapper.
  if (horizontal) return button

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent side="right">
        {tool.label}{" "}
        <span className="ml-1 text-muted-foreground">{tool.shortcut}</span>
      </TooltipContent>
    </Tooltip>
  )
}
