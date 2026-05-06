"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

import { SHORTCUTS } from "../keyboard-shortcuts"

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Hold ⌘ on macOS, Ctrl on Windows / Linux.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[60vh] grid-cols-2 gap-x-6 gap-y-4 overflow-y-auto pr-1">
          {SHORTCUTS.map((g) => (
            <div key={g.group} className="grid gap-1">
              <p className="text-xs font-semibold text-foreground">{g.group}</p>
              <ul className="grid gap-0.5">
                {g.items.map((it) => (
                  <li
                    key={it.label}
                    className="flex items-center justify-between text-[12px]"
                  >
                    <span className="text-muted-foreground">{it.label}</span>
                    <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                      {it.keys}
                    </kbd>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
