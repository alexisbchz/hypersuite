"use client"

import { useEffect, useRef, useState } from "react"
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
  const {
    layers,
    selectedId,
    select,
    toggleVisible,
    toggleLocked,
    rename,
    add,
    remove,
    reorder,
    moveTo,
  } = useEditor()

  const [dragId, setDragId] = useState<string | null>(null)
  const [dropAt, setDropAt] = useState<{
    targetId: string
    position: "before" | "after"
  } | null>(null)

  const onRowDragStart = (id: string) => (e: React.DragEvent) => {
    setDragId(id)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", id)
  }

  const onRowDragOver = (id: string) => (e: React.DragEvent) => {
    if (!dragId || dragId === id) return
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const position: "before" | "after" =
      e.clientY < rect.top + rect.height / 2 ? "before" : "after"
    if (
      !dropAt ||
      dropAt.targetId !== id ||
      dropAt.position !== position
    ) {
      setDropAt({ targetId: id, position })
    }
  }

  const onRowDrop = (id: string) => (e: React.DragEvent) => {
    e.preventDefault()
    if (!dragId || !dropAt) {
      setDragId(null)
      setDropAt(null)
      return
    }
    const targetIdx = layers.findIndex((l) => l.id === dropAt.targetId)
    if (targetIdx < 0) {
      setDragId(null)
      setDropAt(null)
      return
    }
    const insertIdx =
      dropAt.position === "before" ? targetIdx : targetIdx + 1
    moveTo(dragId, insertIdx)
    setDragId(null)
    setDropAt(null)
  }

  const onDragEnd = () => {
    setDragId(null)
    setDropAt(null)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <HugeiconsIcon icon={Layers01Icon} className="size-3.5" />
          Layers
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
              isDragging={dragId === l.id}
              dropIndicator={
                dropAt && dropAt.targetId === l.id && dragId !== l.id
                  ? dropAt.position
                  : null
              }
              onDragStart={onRowDragStart(l.id)}
              onDragOver={onRowDragOver(l.id)}
              onDrop={onRowDrop(l.id)}
              onDragEnd={onDragEnd}
              onSelect={() => select(l.id)}
              onToggleVisible={() => toggleVisible(l.id)}
              onToggleLock={() => toggleLocked(l.id)}
              onUp={() => reorder(l.id, "up")}
              onDown={() => reorder(l.id, "down")}
              onDelete={() => remove(l.id)}
              onRename={(name) => rename(l.id, name)}
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
  isDragging,
  dropIndicator,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onSelect,
  onToggleVisible,
  onToggleLock,
  onUp,
  onDown,
  onDelete,
  onRename,
}: {
  layer: Layer
  selected: boolean
  first: boolean
  last: boolean
  isDragging: boolean
  dropIndicator: "before" | "after" | null
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
  onSelect: () => void
  onToggleVisible: () => void
  onToggleLock: () => void
  onUp: () => void
  onDown: () => void
  onDelete: () => void
  onRename: (name: string) => void
}) {
  const Icon = KIND_ICON[layer.kind]
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(layer.name)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (editing) {
      setDraft(layer.name)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
  }, [editing, layer.name])

  const commit = () => {
    const next = draft.trim()
    if (next && next !== layer.name) onRename(next)
    setEditing(false)
  }

  const cancel = () => {
    setDraft(layer.name)
    setEditing(false)
  }

  return (
    <li
      className="relative"
      draggable={!editing}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {dropIndicator && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-1.5 z-10 h-0.5 rounded-full bg-primary",
            dropIndicator === "before" ? "-top-px" : "-bottom-px"
          )}
        />
      )}
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          if (!editing) onSelect()
        }}
        onDoubleClick={(e) => {
          e.stopPropagation()
          setEditing(true)
        }}
        onKeyDown={(e) => {
          if (editing) return
          if (e.key === "Enter") {
            e.preventDefault()
            setEditing(true)
            return
          }
          if (e.key === " ") {
            e.preventDefault()
            onSelect()
          }
        }}
        aria-pressed={selected}
        className={cn(
          "group/layer flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
          selected ? "bg-primary/10 text-foreground" : "hover:bg-muted",
          isDragging && "opacity-40"
        )}
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground group-hover/layer:bg-background">
          <HugeiconsIcon icon={Icon} className="size-3.5" />
        </span>
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={commit}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === "Enter") {
                e.preventDefault()
                commit()
              } else if (e.key === "Escape") {
                e.preventDefault()
                cancel()
              }
            }}
            className="min-w-0 flex-1 rounded-sm bg-background px-1 py-0.5 text-xs text-foreground outline-none ring-1 ring-ring"
          />
        ) : (
          <span
            className="min-w-0 flex-1 cursor-text truncate"
            onDoubleClick={(e) => {
              e.stopPropagation()
              setEditing(true)
            }}
            title="Double-click to rename"
          >
            {layer.name}
          </span>
        )}

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
