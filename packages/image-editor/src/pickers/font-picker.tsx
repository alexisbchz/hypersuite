"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import { cn } from "@workspace/ui/lib/utils"

import {
  ALL_FONTS,
  ensureFont,
  fontStack,
  isFontLoaded,
  SYSTEM_FONT,
  type FontDef,
} from "../pickers/fonts"

type Category = FontDef["category"] | "system"

const CATEGORY_LABEL: Record<Category, string> = {
  system: "System",
  sans: "Sans",
  serif: "Serif",
  mono: "Mono",
  display: "Display",
  handwriting: "Handwriting",
}

function category(f: FontDef): Category {
  return f === SYSTEM_FONT ? "system" : f.category
}

export function FontPicker({
  value,
  onChange,
}: {
  value: string | undefined
  onChange: (family: string | undefined) => void
}) {
  const [open, setOpen] = useState(false)
  const current = ALL_FONTS.find((f) => f.family === value) ?? SYSTEM_FONT

  // Group by category for nicer browsing.
  const groups = useMemo(() => {
    const m = new Map<Category, FontDef[]>()
    for (const f of ALL_FONTS) {
      const k = category(f)
      const arr = m.get(k) ?? []
      arr.push(f)
      m.set(k, arr)
    }
    return Array.from(m.entries())
  }, [])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex h-7 w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-2 text-xs hover:bg-muted focus:border-ring focus:outline-none"
          >
            <span
              className="truncate"
              style={{ fontFamily: fontStack(current.family) }}
            >
              {current.family}
            </span>
            <span className="text-muted-foreground">▾</span>
          </button>
        }
      />
      <PopoverContent align="start" sideOffset={6} className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Search fonts…" />
          <CommandList className="max-h-72">
            <CommandEmpty>No fonts found.</CommandEmpty>
            {groups.map(([cat, list]) => (
              <CommandGroup key={cat} heading={CATEGORY_LABEL[cat]}>
                {list.map((f) => (
                  <FontRow
                    key={f.family}
                    font={f}
                    selected={f.family === current.family}
                    onPick={() => {
                      onChange(f === SYSTEM_FONT ? undefined : f.family)
                      setOpen(false)
                    }}
                  />
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function FontRow({
  font,
  selected,
  onPick,
}: {
  font: FontDef
  selected: boolean
  onPick: () => void
}) {
  // Prefetch the font when its row scrolls into view so the preview text
  // renders in its real face once it lands.
  useEffect(() => {
    if (font === SYSTEM_FONT) return
    void ensureFont(font.family)
  }, [font])
  const loaded = isFontLoaded(font.family)
  return (
    <CommandItem
      value={font.family}
      onSelect={onPick}
      className={cn(selected && "bg-accent")}
    >
      <span
        className="flex-1 truncate text-sm"
        style={{ fontFamily: fontStack(font.family) }}
      >
        {font.family}
      </span>
      {!loaded && font !== SYSTEM_FONT && (
        <span className="ms-auto text-[9px] text-muted-foreground">…</span>
      )}
    </CommandItem>
  )
}
