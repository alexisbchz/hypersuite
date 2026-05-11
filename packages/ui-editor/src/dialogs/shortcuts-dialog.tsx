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
  onOpenChange: (v: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Everything you can do without lifting your hands from the keyboard.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SHORTCUTS.map((g) => (
            <section key={g.group} className="flex flex-col gap-1">
              <h3 className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                {g.group}
              </h3>
              <ul className="flex flex-col gap-1">
                {g.items.map((i) => (
                  <li
                    key={i.keys}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-muted-foreground">{i.label}</span>
                    <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                      {i.keys}
                    </kbd>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
