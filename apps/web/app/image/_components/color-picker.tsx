"use client"

import { useEffect, useState } from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

const PALETTE = [
  "#000000",
  "#1f1f1f",
  "#3a3a3a",
  "#7a7a7a",
  "#bcbcbc",
  "#ffffff",
  "#ef4444",
  "#f59e0b",
  "#facc15",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#f43f5e",
]

const RECENTS_KEY = "hypersuite.image.recents.v1.colors"
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

export function ColorPicker({
  value,
  onChange,
  onFocus,
}: {
  value: string
  onChange: (v: string) => void
  onFocus?: () => void
}) {
  const [recents, setRecents] = useState<string[]>([])
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setRecents(loadRecentColors())
  }, [])
  useEffect(() => setDraft(value), [value])

  const commit = (c: string) => {
    onChange(c)
    saveRecentColor(c)
    setRecents(loadRecentColors())
  }

  const isHex = /^#[0-9a-fA-F]{6}$/.test(value)

  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-background pe-1.5 ps-1.5 focus-within:border-ring">
      <Popover>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label="Pick color"
              onFocus={onFocus}
              className="inline-block size-4 rounded ring-1 ring-border hover:ring-ring"
              style={{ background: value }}
            />
          }
        />
        <PopoverContent align="start" sideOffset={6} className="w-52">
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
                <p className="mb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
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
                  onChange={(e) => commit(e.target.value)}
                  className="size-7 cursor-pointer rounded border border-border bg-transparent p-0"
                />
              )}
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => commit(draft)}
                className="h-7 flex-1 font-mono text-xs"
              />
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
        onFocus={onFocus}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 border-0 bg-transparent px-0 font-mono text-xs focus-visible:ring-0"
      />
    </div>
  )
}
