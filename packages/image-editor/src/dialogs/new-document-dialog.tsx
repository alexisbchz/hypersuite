"use client"

import { useEffect, useState } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"

import { useEditor } from "../editor"
import { DEFAULT_DOC_SETTINGS } from "../editor/doc"
import type { Layer } from "../lib/types"

const PRESETS: Array<{ label: string; w: number; h: number }> = [
  { label: "Square 1080", w: 1080, h: 1080 },
  { label: "Landscape", w: 1200, h: 800 },
  { label: "FHD", w: 1920, h: 1080 },
  { label: "A4 @ 300dpi", w: 2480, h: 3508 },
]

export function NewDocumentDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { newTab } = useEditor()
  const [width, setWidth] = useState(DEFAULT_DOC_SETTINGS.width)
  const [height, setHeight] = useState(DEFAULT_DOC_SETTINGS.height)
  const [background, setBackground] = useState(DEFAULT_DOC_SETTINGS.background)

  useEffect(() => {
    if (!open) return
    setWidth(DEFAULT_DOC_SETTINGS.width)
    setHeight(DEFAULT_DOC_SETTINGS.height)
    setBackground(DEFAULT_DOC_SETTINGS.background)
  }, [open])

  const handleCreate = () => {
    const bg: Layer = {
      id: `bg-${Date.now()}`,
      name: "Background",
      kind: "shape",
      visible: true,
      locked: true,
      opacity: 100,
      blendMode: "normal",
      x: 0,
      y: 0,
      width,
      height,
      rotation: 0,
      color: background,
    }
    newTab({
      name: "Untitled",
      layers: [bg],
      docSettings: { width, height, background },
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New document</DialogTitle>
          <DialogDescription>
            Pick a preset or enter custom dimensions. Opens in a new tab.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Presets</Label>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setWidth(p.w)
                    setHeight(p.h)
                  }}
                  className={cn(
                    "rounded-md border border-border px-2 py-1.5 text-xs",
                    width === p.w && height === p.h
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted"
                  )}
                >
                  {p.label}
                  <span className="ms-1 font-mono text-[10px] opacity-70">
                    {p.w}×{p.h}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1">
              <Label>Width (px)</Label>
              <Input
                type="number"
                min={1}
                value={width}
                onChange={(e) =>
                  setWidth(Math.max(1, parseInt(e.target.value || "0", 10)))
                }
              />
            </div>
            <div className="grid gap-1">
              <Label>Height (px)</Label>
              <Input
                type="number"
                min={1}
                value={height}
                onChange={(e) =>
                  setHeight(Math.max(1, parseInt(e.target.value || "0", 10)))
                }
              />
            </div>
          </div>

          <div className="grid gap-1">
            <Label>Background</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={/^#/.test(background) ? background : "#ffffff"}
                onChange={(e) => setBackground(e.target.value)}
                className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent"
              />
              <Input
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                placeholder="#ffffff or var(--color-background)"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
