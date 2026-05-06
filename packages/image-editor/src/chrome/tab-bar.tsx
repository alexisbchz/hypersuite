"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, Cancel01Icon } from "@hugeicons/core-free-icons"

import { cn } from "@workspace/ui/lib/utils"

import { useEditor } from "../editor"

export function TabBar({ onRequestNew }: { onRequestNew?: () => void }) {
  const { tabs, activeTabId, switchTab, closeTab, renameTab } = useEditor()
  if (tabs.length === 0) return null
  return (
    <div className="flex h-9 items-stretch gap-px overflow-x-auto border-b border-border bg-muted/40 px-1">
      {tabs.map((t) => {
        const active = t.id === activeTabId
        return (
          <div
            key={t.id}
            onMouseDown={(e) => {
              // Switch on left-click anywhere on the tab. Don't preventDefault
              // — that would block the input from receiving focus/caret.
              if (e.button === 0 && !active) switchTab(t.id)
              if (e.button === 1) {
                e.preventDefault()
                closeTab(t.id)
              }
            }}
            className={cn(
              "group relative flex h-full max-w-48 min-w-24 items-center gap-1 border-r border-border pr-1 pl-3 text-xs last:border-r-0",
              active
                ? "bg-background text-foreground"
                : "bg-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground"
            )}
          >
            <input
              value={t.name}
              onChange={(e) => renameTab(t.id, e.target.value)}
              onFocus={(e) => {
                if (active) e.currentTarget.select()
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") {
                  e.currentTarget.blur()
                }
              }}
              spellCheck={false}
              aria-label="Tab name"
              className="min-w-0 flex-1 truncate bg-transparent outline-none"
            />
            <button
              type="button"
              aria-label="Close tab"
              tabIndex={-1}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                closeTab(t.id)
              }}
              className="flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground/70 opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground data-[active=true]:opacity-100"
              data-active={active}
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
            </button>
          </div>
        )
      })}
      {onRequestNew && (
        <button
          onClick={onRequestNew}
          aria-label="New tab"
          className="flex h-full items-center justify-center px-2 text-muted-foreground hover:bg-background/60 hover:text-foreground"
        >
          <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
        </button>
      )}
    </div>
  )
}
