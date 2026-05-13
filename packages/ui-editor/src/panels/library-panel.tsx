"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { LinkSquare02Icon } from "@hugeicons/core-free-icons"

import { ScrollArea } from "@workspace/ui/components/scroll-area"

import { useEditor } from "../editor"
import { LIBRARY_TEMPLATES } from "../lib/library-templates"

/** A click-to-drop catalog of starter playgrounds. The thumbnail is the
 *  live preview rendered at small size — so what you click is exactly
 *  what lands on the canvas. */
export function LibraryPanel() {
  const { frames, addPlayground, patchPlayground, patch, commit, select } =
    useEditor()

  const onPick = (templateId: string) => {
    const tpl = LIBRARY_TEMPLATES.find((t) => t.id === templateId)
    if (!tpl) return
    // Drop the new frame just to the right of the rightmost existing
    // frame so users can see where it landed without overlapping work.
    const rightEdge = frames.reduce(
      (max, f) => Math.max(max, f.x + f.width),
      0
    )
    const topEdge = frames.length
      ? Math.min(...frames.map((f) => f.y))
      : 0
    const id = addPlayground({
      x: rightEdge + 80 + tpl.width / 2,
      y: topEdge + tpl.height / 2,
    })
    patchPlayground(id, { html: tpl.html, background: tpl.background })
    patch(id, { name: tpl.name, width: tpl.width, height: tpl.height })
    commit()
    select(id)
  }

  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-2 gap-2 p-2">
        {LIBRARY_TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => onPick(tpl.id)}
            className="group flex flex-col gap-1.5 rounded-md border border-border bg-background p-1.5 text-left transition-colors hover:border-primary/50 hover:bg-muted"
          >
            <div
              className="relative aspect-[4/3] w-full overflow-hidden rounded-sm border border-border/60"
              style={{ background: tpl.background }}
            >
              <div
                aria-hidden
                className="absolute inset-0 origin-top-left text-[6px]"
                style={{
                  transform: `scale(${Math.min(180 / tpl.width, 135 / tpl.height)})`,
                  width: tpl.width,
                  height: tpl.height,
                  pointerEvents: "none",
                }}
                dangerouslySetInnerHTML={{ __html: tpl.thumbnail }}
              />
            </div>
            <div className="flex items-center gap-1 px-0.5">
              <HugeiconsIcon
                icon={LinkSquare02Icon}
                className="size-3 text-muted-foreground"
              />
              <span className="truncate text-[11px] font-medium text-foreground">
                {tpl.name}
              </span>
            </div>
          </button>
        ))}
      </div>
      <div className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
        Click a tile to drop it on the canvas. Hit{" "}
        <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
          P
        </kbd>{" "}
        for a blank playground.
      </div>
    </ScrollArea>
  )
}
