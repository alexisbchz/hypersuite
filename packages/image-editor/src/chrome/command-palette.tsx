"use client"

import { useEffect, useState } from "react"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@workspace/ui/components/command"

import { useEditor } from "../editor"

export const CMD_EVENTS = {
  newDocument: "hypersuite:cmd:new-document",
  openFile: "hypersuite:cmd:open-file",
  save: "hypersuite:cmd:save",
  exportPng: "hypersuite:cmd:export-png",
  exportJpeg: "hypersuite:cmd:export-jpeg",
  exportWebp: "hypersuite:cmd:export-webp",
  exportSvg: "hypersuite:cmd:export-svg",
  documentSettings: "hypersuite:cmd:document-settings",
  shortcuts: "hypersuite:cmd:shortcuts",
} as const

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const editor = useEditor()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const run = (fn: () => void) => () => {
    setOpen(false)
    // Defer so the dialog close animation doesn't race the action.
    setTimeout(fn, 0)
  }

  const fire = (eventName: string) =>
    run(() => window.dispatchEvent(new CustomEvent(eventName)))

  const noSel = editor.selectedIds.length === 0
  const sel = editor.layers.find((l) => l.id === editor.selectedId) ?? null
  const bgEligible =
    sel !== null &&
    !sel.locked &&
    (sel.kind === "image" || sel.kind === "raster") &&
    !(sel.id in editor.bgRemovalProgress)

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command palette"
      description="Search and run any editor action"
    >
      <Command>
        <CommandInput placeholder="Type a command or search…" />
        <CommandList>
          <CommandEmpty>No commands found.</CommandEmpty>

          <CommandGroup heading="File">
            <CommandItem onSelect={fire(CMD_EVENTS.newDocument)}>
              New project…
            </CommandItem>
            <CommandItem onSelect={run(() => editor.newTab())}>
              New empty tab
            </CommandItem>
            <CommandItem onSelect={fire(CMD_EVENTS.openFile)}>
              Open .hyperimg…
            </CommandItem>
            <CommandItem onSelect={fire(CMD_EVENTS.save)}>
              Save .hyperimg
            </CommandItem>
            <CommandItem onSelect={fire(CMD_EVENTS.exportPng)}>
              Export as PNG
              <CommandShortcut>.png</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={fire(CMD_EVENTS.exportJpeg)}>
              Export as JPEG
              <CommandShortcut>.jpg</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={fire(CMD_EVENTS.exportWebp)}>
              Export as WebP
              <CommandShortcut>.webp</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={fire(CMD_EVENTS.exportSvg)}>
              Export as SVG
              <CommandShortcut>.svg</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Edit">
            <CommandItem onSelect={run(editor.undo)} disabled={!editor.canUndo}>
              Undo
              <CommandShortcut>⌘Z</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={run(editor.redo)} disabled={!editor.canRedo}>
              Redo
              <CommandShortcut>⌘⇧Z</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={run(() => editor.duplicate())}
              disabled={noSel}
            >
              Duplicate selection
              <CommandShortcut>⌘D</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={run(() => editor.remove())} disabled={noSel}>
              Delete selection
              <CommandShortcut>⌫</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={run(editor.selectAll)}>
              Select all
              <CommandShortcut>⌘A</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={run(() => editor.select(null))}
              disabled={noSel}
            >
              Deselect
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="View">
            <CommandItem
              onSelect={run(() =>
                editor.setZoom(Math.round(editor.zoom * 1.2))
              )}
            >
              Zoom in
              <CommandShortcut>⌘=</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={run(() =>
                editor.setZoom(Math.round(editor.zoom / 1.2))
              )}
            >
              Zoom out
              <CommandShortcut>⌘-</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={run(() => editor.setZoom(100))}>
              Actual size (100%)
            </CommandItem>
            <CommandItem onSelect={run(editor.resetView)}>
              Reset view
              <CommandShortcut>⌘0</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Image">
            <CommandItem
              onSelect={run(() => {
                if (sel && bgEligible)
                  void editor.removeBackgroundFromLayer(sel.id)
              })}
              disabled={!bgEligible}
            >
              Remove background
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Document">
            <CommandItem onSelect={fire(CMD_EVENTS.documentSettings)}>
              Document settings…
            </CommandItem>
            <CommandItem onSelect={fire(CMD_EVENTS.shortcuts)}>
              Keyboard shortcuts
            </CommandItem>
          </CommandGroup>

          {editor.tabs.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Tabs">
                {editor.activeTabId && (
                  <CommandItem
                    onSelect={run(() => {
                      if (editor.activeTabId)
                        editor.closeTab(editor.activeTabId)
                    })}
                  >
                    Close current tab
                    <CommandShortcut>⌘W</CommandShortcut>
                  </CommandItem>
                )}
                {editor.tabs.map((t) => (
                  <CommandItem
                    key={t.id}
                    onSelect={run(() => editor.switchTab(t.id))}
                    disabled={t.id === editor.activeTabId}
                  >
                    Go to: {t.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
