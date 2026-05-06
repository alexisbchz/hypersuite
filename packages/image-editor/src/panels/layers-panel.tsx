"use client"

import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  Copy01Icon,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"
import { useEditor } from "../editor"
import type { Layer, LayerKind } from "../lib/types"

const KIND_ICON: Record<LayerKind, typeof ImageIcon> = {
  image: ImageIcon,
  text: TextFontIcon,
  shape: HexagonIcon,
  group: Layers01Icon,
  path: HexagonIcon,
  raster: ImageIcon,
}

export function LayersPanel() {
  const {
    layers,
    isSelected,
    selectedIds,
    select,
    toggleVisible,
    toggleLocked,
    rename,
    add,
    duplicate,
    remove,
    reorder,
    moveTo,
    addGroup,
    ungroup,
  } = useEditor()

  const [dragId, setDragId] = useState<string | null>(null)
  const [dropAt, setDropAt] = useState<{
    targetId: string
    position: "before" | "after"
  } | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

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
    if (!dropAt || dropAt.targetId !== id || dropAt.position !== position) {
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
    const insertIdx = dropAt.position === "before" ? targetIdx : targetIdx + 1
    moveTo(dragId, insertIdx)
    setDragId(null)
    setDropAt(null)
  }

  const onDragEnd = () => {
    setDragId(null)
    setDropAt(null)
  }

  // Build display order: respect z-order in `layers`, but skip rows whose
  // ancestor is collapsed. Depth comes from parentId chain.
  const depthOf = (id: string): number => {
    let d = 0
    let cur = layers.find((l) => l.id === id)
    while (cur?.parentId) {
      d += 1
      cur = layers.find((l) => l.id === cur!.parentId)
      if (!cur) break
    }
    return d
  }
  const isHidden = (id: string): boolean => {
    let cur = layers.find((l) => l.id === id)
    while (cur?.parentId) {
      if (collapsed[cur.parentId]) return true
      cur = layers.find((l) => l.id === cur!.parentId)
      if (!cur) break
    }
    return false
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
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => add()}
                  aria-label="Add layer"
                >
                  <HugeiconsIcon icon={Add01Icon} />
                </Button>
              }
            />
            <TooltipContent>New layer</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-xs" aria-label="More">
                  <HugeiconsIcon icon={MoreHorizontalIcon} />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuItem onClick={() => add()}>
                New layer
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  selectedIds.length ? addGroup(selectedIds) : addGroup([])
                }
                disabled={selectedIds.length === 0}
              >
                Group selection
                <DropdownMenuShortcut>⌘G</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const sel = layers.find(
                    (l) => selectedIds.includes(l.id) && l.kind === "group"
                  )
                  if (sel) ungroup(sel.id)
                }}
                disabled={
                  !layers.find(
                    (l) => selectedIds.includes(l.id) && l.kind === "group"
                  )
                }
              >
                Ungroup
                <DropdownMenuShortcut>⌘⇧G</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                Merge down
                <DropdownMenuShortcut>soon</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                Flatten visible
                <DropdownMenuShortcut>soon</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <ul className="flex flex-col gap-px px-1.5 pb-2">
          {layers.map((l, i) => {
            if (isHidden(l.id)) return null
            const depth = depthOf(l.id)
            return (
              <LayerRow
                key={l.id}
                layer={l}
                depth={depth}
                collapsed={!!collapsed[l.id]}
                onToggleCollapse={() =>
                  setCollapsed((c) => ({ ...c, [l.id]: !c[l.id] }))
                }
                selected={isSelected(l.id)}
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
                onSelect={(opts) => select(l.id, opts)}
                onToggleVisible={() => toggleVisible(l.id)}
                onToggleLock={() => toggleLocked(l.id)}
                onUp={() => reorder(l.id, "up")}
                onDown={() => reorder(l.id, "down")}
                onDuplicate={() => duplicate(l.id)}
                onDelete={() => remove(l.id)}
                onRename={(name) => rename(l.id, name)}
                onUngroup={l.kind === "group" ? () => ungroup(l.id) : undefined}
              />
            )
          })}
        </ul>
      </ScrollArea>
    </div>
  )
}

function LayerRow({
  layer,
  depth,
  collapsed,
  onToggleCollapse,
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
  onDuplicate,
  onDelete,
  onRename,
  onUngroup,
}: {
  layer: Layer
  depth: number
  collapsed: boolean
  onToggleCollapse: () => void
  selected: boolean
  first: boolean
  last: boolean
  isDragging: boolean
  dropIndicator: "before" | "after" | null
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
  onSelect: (opts?: { additive?: boolean; toggle?: boolean }) => void
  onToggleVisible: () => void
  onToggleLock: () => void
  onUp: () => void
  onDown: () => void
  onDuplicate: () => void
  onDelete: () => void
  onRename: (name: string) => void
  onUngroup?: () => void
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

  const isGroup = layer.kind === "group"

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
        onClick={(e) => {
          if (editing) return
          if (e.shiftKey) onSelect({ toggle: true })
          else if (e.metaKey || e.ctrlKey) onSelect({ toggle: true })
          else onSelect()
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
        style={{ paddingInlineStart: 8 + depth * 12 }}
        className={cn(
          "group/layer flex w-full items-center gap-2 rounded-md py-1.5 pe-2 text-left text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
          selected ? "bg-primary/10 text-foreground" : "hover:bg-muted",
          isDragging && "opacity-40"
        )}
      >
        {isGroup ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleCollapse()
            }}
            className="inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              className={cn(
                "size-3 transition-transform",
                !collapsed && "rotate-90"
              )}
            />
          </button>
        ) : (
          <span className="size-4 shrink-0" />
        )}
        <LayerThumb layer={layer} fallbackIcon={Icon} />
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
            className="min-w-0 flex-1 rounded-sm bg-background px-1 py-0.5 text-xs text-foreground ring-1 ring-ring outline-none"
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
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex size-5 items-center justify-center rounded hover:text-foreground"
                  aria-label="More"
                >
                  <HugeiconsIcon icon={MoreHorizontalIcon} className="size-3" />
                </button>
              }
            />
            <DropdownMenuContent
              align="end"
              className="min-w-44"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuLabel className="truncate">
                {layer.name}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDuplicate}>
                <HugeiconsIcon icon={Copy01Icon} className="size-3.5" />
                Duplicate
                <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEditing(true)}>
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onUp} disabled={first}>
                Bring forward
                <DropdownMenuShortcut>⌘]</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDown} disabled={last}>
                Send backward
                <DropdownMenuShortcut>⌘[</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onToggleLock}>
                {layer.locked ? "Unlock" : "Lock"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleVisible}>
                {layer.visible ? "Hide" : "Show"}
              </DropdownMenuItem>
              {onUngroup && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onUngroup}>
                    Ungroup
                    <DropdownMenuShortcut>⌘⇧G</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                  <HugeiconsIcon
                    icon={ArrowDown01Icon}
                    className="size-3 rotate-180"
                  />
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

function LayerThumb({
  layer,
  fallbackIcon,
}: {
  layer: Layer
  fallbackIcon: typeof Layers01Icon
}) {
  const baseCls =
    "flex size-6 shrink-0 items-center justify-center overflow-hidden rounded ring-1 ring-border"
  if (layer.kind === "image" && layer.src) {
    return (
      <span className={baseCls} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={layer.src}
          alt=""
          className="size-full object-cover"
          draggable={false}
        />
      </span>
    )
  }
  if (layer.kind === "shape" && layer.color) {
    return (
      <span
        className={baseCls}
        style={{ background: layer.color }}
        aria-hidden
      />
    )
  }
  if (layer.kind === "text") {
    return (
      <span
        className={cn(baseCls, "bg-muted text-foreground")}
        style={{ color: layer.color }}
        aria-hidden
      >
        <span className="font-serif text-[11px] leading-none">T</span>
      </span>
    )
  }
  return (
    <span className={cn(baseCls, "bg-muted text-muted-foreground")} aria-hidden>
      <HugeiconsIcon icon={fallbackIcon} className="size-3.5" />
    </span>
  )
}
