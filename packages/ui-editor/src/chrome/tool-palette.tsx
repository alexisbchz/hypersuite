"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  Cursor02Icon,
  Image01Icon,
  LinkSquare02Icon,
  Move02Icon,
} from "@hugeicons/core-free-icons"
import { useRef } from "react"

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
]

const BOTTOM: Tool[] = [
  {
    id: "playground",
    label: "New playground",
    shortcut: "P",
    icon: LinkSquare02Icon,
  },
]

export function ToolPalette({
  orientation = "vertical",
  className,
}: {
  orientation?: "vertical" | "horizontal"
  className?: string
}) {
  const { tool, setTool, addImage } = useEditor()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
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
      <ActionButton
        label="Add reference image"
        shortcut="I"
        icon={Image01Icon}
        orientation={orientation}
        onClick={() => fileInputRef.current?.click()}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? [])
          for (const f of files) await addImage(f)
          e.target.value = ""
        }}
      />
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

function ActionButton({
  label,
  shortcut,
  icon,
  orientation,
  onClick,
}: {
  label: string
  shortcut: string
  icon: typeof Cursor02Icon
  orientation: "vertical" | "horizontal"
  onClick: () => void
}) {
  const horizontal = orientation === "horizontal"
  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        horizontal ? "size-9" : "size-8"
      )}
    >
      <HugeiconsIcon icon={icon} className="size-4" />
    </button>
  )
  if (horizontal) return button
  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent side="right">
        {label} <span className="ml-1 text-muted-foreground">{shortcut}</span>
      </TooltipContent>
    </Tooltip>
  )
}
