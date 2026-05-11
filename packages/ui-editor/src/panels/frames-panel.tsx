"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  Image01Icon,
  LinkSquare02Icon,
  LockKeyholeIcon,
} from "@hugeicons/core-free-icons"

import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { cn } from "@workspace/ui/lib/utils"

import { useEditor } from "../editor"

export function FramesPanel() {
  const { frames, selectedIds, select } = useEditor()

  if (!frames.length) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
        Frames you add to the canvas show up here.
      </div>
    )
  }

  // Top-of-stack frames sit visually in front on the canvas, so list them
  // first — matches the convention every layers panel uses.
  const ordered = frames.slice().reverse()

  return (
    <ScrollArea className="h-full">
      <ul className="flex flex-col p-1">
        {ordered.map((f) => {
          const selected = selectedIds.includes(f.id)
          return (
            <li key={f.id}>
              <button
                type="button"
                onClick={(e) =>
                  select(f.id, {
                    additive: e.shiftKey,
                    toggle: e.metaKey || e.ctrlKey,
                  })
                }
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs",
                  selected
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <HugeiconsIcon
                  icon={f.kind === "image" ? Image01Icon : LinkSquare02Icon}
                  className="size-3.5"
                />
                <span className="flex-1 truncate">{f.name}</span>
                {f.locked && (
                  <HugeiconsIcon
                    icon={LockKeyholeIcon}
                    className="size-3 text-muted-foreground"
                  />
                )}
                <span className="font-mono text-[10px] text-muted-foreground">
                  {Math.round(f.width)}×{Math.round(f.height)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </ScrollArea>
  )
}
