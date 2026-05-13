"use client"

import { useEffect, useState } from "react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

// Tailwind 500-shade palette — these are the colors people reach for
// 95% of the time when reproducing a screenshot, so they earn the top
// row. Neutrals on top so the layout reads "darker → brighter" left to
// right within each row.
const PALETTE = [
  "#ffffff",
  "#f8fafc",
  "#e2e8f0",
  "#94a3b8",
  "#475569",
  "#0f172a",
  "#000000",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
]

const RECENTS_KEY = "hypercreate.ui-editor.recents.colors.v1"
const RECENTS_LIMIT = 12

function loadRecentColors(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function saveRecentColor(c: string) {
  if (typeof window === "undefined") return
  if (!c) return
  try {
    const cur = loadRecentColors()
    const next = [c, ...cur.filter((x) => x !== c)].slice(0, RECENTS_LIMIT)
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

/** Popover color picker — swatch + palette + recent colors + hex input
 *  + native picker + (optional) eyedropper. Same pattern as the image
 *  editor's `ColorPicker` for consistency across products. */
export function ColorPicker({
  value,
  onChange,
  onCommit,
}: {
  value: string
  /** Fires as the value changes (every palette click, every keystroke
   *  in the hex input, every native picker step). Use this to keep the
   *  preview in sync. */
  onChange: (v: string) => void
  /** Fires when the change is "done" (swatch selected, blur, native
   *  picker closed). Use this to push to undo history. */
  onCommit?: (v: string) => void
}) {
  const [recents, setRecents] = useState<string[]>([])
  const [draft, setDraft] = useState(value)

  // Sync draft when the parent's value changes (e.g. undo, frame swap).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setDraft(value), [value])
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setRecents(loadRecentColors()), [])

  const commit = (c: string) => {
    onChange(c)
    onCommit?.(c)
    saveRecentColor(c)
    setRecents(loadRecentColors())
  }

  const isHex = /^#[0-9a-fA-F]{6}$/.test(value)

  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-background ps-1.5 pe-1.5 focus-within:border-ring">
      <Popover>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label="Pick color"
              className="inline-block size-4 rounded ring-1 ring-border hover:ring-ring"
              style={{ background: value }}
            />
          }
        />
        <PopoverContent align="start" sideOffset={6} className="w-56">
          <div className="grid gap-2.5">
            <div className="grid grid-cols-8 gap-1">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => commit(c)}
                  aria-label={c}
                  className={cn(
                    "size-5 rounded ring-1 ring-border transition hover:ring-ring",
                    value === c && "ring-2 ring-ring"
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
            {recents.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  Recent
                </p>
                <div className="grid grid-cols-8 gap-1">
                  {recents.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => commit(c)}
                      aria-label={c}
                      className={cn(
                        "size-5 rounded ring-1 ring-border transition hover:ring-ring",
                        value === c && "ring-2 ring-ring"
                      )}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              {isHex && (
                <input
                  type="color"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  onBlur={(e) => onCommit?.(e.target.value)}
                  className="size-7 cursor-pointer rounded border border-border bg-transparent p-0"
                />
              )}
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => commit(draft)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    ;(e.target as HTMLInputElement).blur()
                  }
                }}
                className="h-7 flex-1 font-mono text-xs"
              />
              {/* EyeDropper API is Chromium-only — but when it's there,
                  it's the fastest way to grab a color off the reference
                  screenshot the user just dropped onto the canvas. */}
              <button
                type="button"
                onClick={async () => {
                  try {
                    const ED = (
                      window as unknown as {
                        EyeDropper?: new () => {
                          open: () => Promise<{ sRGBHex: string }>
                        }
                      }
                    ).EyeDropper
                    if (!ED) return
                    const ed = new ED()
                    const r = await ed.open()
                    if (r?.sRGBHex) commit(r.sRGBHex)
                  } catch {
                    /* user cancelled */
                  }
                }}
                title="Eyedropper"
                aria-label="Eyedropper"
                className="size-7 rounded border border-border bg-background text-xs hover:bg-muted"
              >
                ⌖
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onCommit?.(e.target.value)}
        className="h-7 border-0 bg-transparent px-0 font-mono text-xs focus-visible:ring-0"
      />
    </div>
  )
}
