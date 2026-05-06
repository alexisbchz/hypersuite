"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  ArrowDown01Icon,
  Delete02Icon,
  HexagonIcon,
  ImageIcon,
  Layers01Icon,
  LockIcon,
  MoreHorizontalIcon,
  SquareUnlock01Icon,
  TextFontIcon,
  ViewIcon,
  ViewOffIcon,
} from "@hugeicons/core-free-icons"

import { Button } from "@workspace/ui/components/button"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"
import { useEditor } from "./editor-context"
import type { Layer } from "./types"

const KIND_ICON = {
  image: ImageIcon,
  text: TextFontIcon,
  shape: HexagonIcon,
  group: Layers01Icon,
} as const

export function LayersPanel() {
  const { layers, selectedId, select, toggleVisible, toggleLocked, add, remove, reorder } =
    useEditor()

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <HugeiconsIcon icon={Layers01Icon} className="size-3.5" />
          Calques
          <span className="ms-1 text-muted-foreground">{layers.length}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="ghost" size="icon-xs" onClick={add} aria-label="Add layer">
                  <HugeiconsIcon icon={Add01Icon} />
                </Button>
              }
            />
            <TooltipContent>New layer</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="ghost" size="icon-xs" aria-label="More">
                  <HugeiconsIcon icon={MoreHorizontalIcon} />
                </Button>
              }
            />
            <TooltipContent>More</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <ul className="flex flex-col gap-px px-1.5 pb-2">
          {layers.map((l, i) => (
            <LayerRow
              key={l.id}
              layer={l}
              selected={l.id === selectedId}
              first={i === 0}
              last={i === layers.length - 1}
              onSelect={() => select(l.id)}
              onToggleVisible={() => toggleVisible(l.id)}
              onToggleLock={() => toggleLocked(l.id)}
              onUp={() => reorder(l.id, "up")}
              onDown={() => reorder(l.id, "down")}
              onDelete={() => remove(l.id)}
            />
          ))}
        </ul>
      </ScrollArea>
    </div>
  )
}

function LayerRow({
  layer,
  selected,
  first,
  last,
  onSelect,
  onToggleVisible,
  onToggleLock,
  onUp,
  onDown,
  onDelete,
}: {
  layer: Layer
  selected: boolean
  first: boolean
  last: boolean
  onSelect: () => void
  onToggleVisible: () => void
  onToggleLock: () => void
  onUp: () => void
  onDown: () => void
  onDelete: () => void
}) {
  const Icon = KIND_ICON[layer.kind]
  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onSelect()
          }
        }}
        aria-pressed={selected}
        className={cn(
          "group/layer flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
          selected ? "bg-primary/10 text-foreground" : "hover:bg-muted"
        )}
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground group-hover/layer:bg-background">
          <HugeiconsIcon icon={Icon} className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1 truncate">{layer.name}</span>

        <span className="flex items-center gap-0.5 text-muted-foreground opacity-0 transition-opacity group-hover/layer:opacity-100 has-[[data-active=true]]:opacity-100">
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onUp()
                  }}
                  disabled={first}
                  className="inline-flex size-5 items-center justify-center rounded hover:text-foreground disabled:opacity-30"
                  aria-label="Move up"
                >
                  <HugeiconsIcon icon={ArrowDown01Icon} className="size-3 rotate-180" />
                </button>
              }
            />
            <TooltipContent>Bring forward</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDown()
                  }}
                  disabled={last}
                  className="inline-flex size-5 items-center justify-center rounded hover:text-foreground disabled:opacity-30"
                  aria-label="Move down"
                >
                  <HugeiconsIcon icon={ArrowDown01Icon} className="size-3" />
                </button>
              }
            />
            <TooltipContent>Send backward</TooltipContent>
          </Tooltip>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="inline-flex size-5 items-center justify-center rounded hover:text-destructive"
            aria-label="Delete"
          >
            <HugeiconsIcon icon={Delete02Icon} className="size-3" />
          </button>
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleLock()
          }}
          data-active={layer.locked || undefined}
          className={cn(
            "inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground",
            !layer.locked && "opacity-0 group-hover/layer:opacity-100"
          )}
          aria-label={layer.locked ? "Unlock" : "Lock"}
          aria-pressed={layer.locked}
        >
          <HugeiconsIcon
            icon={layer.locked ? LockIcon : SquareUnlock01Icon}
            className="size-3.5"
          />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleVisible()
          }}
          data-active={!layer.visible || undefined}
          className={cn(
            "inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground",
            layer.visible && "opacity-0 group-hover/layer:opacity-100"
          )}
          aria-label={layer.visible ? "Hide" : "Show"}
          aria-pressed={!layer.visible}
        >
          <HugeiconsIcon
            icon={layer.visible ? ViewIcon : ViewOffIcon}
            className="size-3.5"
          />
        </button>
      </div>
    </li>
  )
}
