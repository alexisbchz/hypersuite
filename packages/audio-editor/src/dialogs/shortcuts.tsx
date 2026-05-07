"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

import { useEditor } from "../editor"

const SECTIONS: { title: string; rows: [string, string][] }[] = [
  {
    title: "Tools",
    rows: [
      ["Select", "V"],
      ["Split", "S"],
      ["Draw region", "D"],
      ["Pan", "H"],
      ["Zoom", "Z"],
    ],
  },
  {
    title: "Transport",
    rows: [
      ["Play / Pause", "Space"],
      ["Stop", "Enter"],
      ["Go to start", "Home"],
      ["Go to end", "End"],
      ["Nudge playhead 0.1s", "← / →"],
      ["Nudge playhead 1s", "Shift + ← / →"],
    ],
  },
  {
    title: "Edit",
    rows: [
      ["Undo", "⌘Z"],
      ["Redo", "⌘⇧Z"],
      ["Cut", "⌘X"],
      ["Copy", "⌘C"],
      ["Paste", "⌘V"],
      ["Duplicate", "⌘D"],
      ["Delete", "Del / Backspace"],
      ["Select all", "⌘A"],
    ],
  },
  {
    title: "View",
    rows: [
      ["Zoom in", "⌘+"],
      ["Zoom out", "⌘−"],
      ["Wheel zoom", "⌘ + Wheel"],
      ["Horizontal scroll", "Shift + Wheel"],
    ],
  },
  {
    title: "Generate",
    rows: [
      ["Generate speech", "⌘G"],
      ["Export WAV", "⌘E"],
    ],
  },
]

export function ShortcutsDialog() {
  const { shortcutsDialogOpen, setShortcutsDialogOpen } = useEditor()
  return (
    <Dialog
      open={shortcutsDialogOpen}
      onOpenChange={setShortcutsDialogOpen}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Shortcuts don&apos;t fire while typing in inputs.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {section.title}
              </h3>
              <ul className="space-y-1">
                {section.rows.map(([label, key]) => (
                  <li
                    key={label}
                    className="flex items-center justify-between"
                  >
                    <span>{label}</span>
                    <kbd className="rounded-sm border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                      {key}
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
