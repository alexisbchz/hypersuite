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

import { useEditor } from "../editor"
import { DEFAULT_DOC_SETTINGS } from "../editor/doc"

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

  useEffect(() => {
    if (!open) return
    setWidth(DEFAULT_DOC_SETTINGS.width)
    setHeight(DEFAULT_DOC_SETTINGS.height)
  }, [open])

  // Always start with a fully transparent doc — no auto-injected
  // "Background" shape layer. The doc surface's transparency checker
  // shows wherever no layer covers it, and the user can add a coloured
  // background as a regular shape layer if they want one.
  const handleCreate = () => {
    newTab({
      name: "Untitled",
      layers: [],
      docSettings: { width, height, background: "transparent" },
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New document</DialogTitle>
          <DialogDescription>
            Pick a preset or enter custom dimensions. Opens in a new tab with
            a transparent canvas.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Presets</Label>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => {
                const active = width === p.w && height === p.h
                return (
                  <Button
                    key={p.label}
                    variant={active ? "default" : "outline"}
                    size="sm"
                    className="justify-start"
                    onClick={() => {
                      setWidth(p.w)
                      setHeight(p.h)
                    }}
                  >
                    {p.label}
                    <span className="ms-1 font-mono text-[10px] opacity-70">
                      {p.w}×{p.h}
                    </span>
                  </Button>
                )
              })}
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
