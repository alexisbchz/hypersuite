"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"

import { useEditor } from "../editor"

const PRESETS: Array<{ label: string; w: number; h: number }> = [
  { label: "Square 1080", w: 1080, h: 1080 },
  { label: "Landscape", w: 1200, h: 800 },
  { label: "FHD", w: 1920, h: 1080 },
  { label: "A4 @ 300dpi", w: 2480, h: 3508 },
]

export function DocumentDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { docSettings, setDocSettings } = useEditor()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Document settings</DialogTitle>
          <DialogDescription>
            Canvas size, background, and print metadata.
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
                  onClick={() =>
                    setDocSettings({ width: p.w, height: p.h })
                  }
                  className={cn(
                    "rounded-md border border-border px-2 py-1.5 text-xs",
                    docSettings.width === p.w && docSettings.height === p.h
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
                value={docSettings.width}
                onChange={(e) =>
                  setDocSettings({
                    width: Math.max(1, parseInt(e.target.value || "0", 10)),
                  })
                }
              />
            </div>
            <div className="grid gap-1">
              <Label>Height (px)</Label>
              <Input
                type="number"
                min={1}
                value={docSettings.height}
                onChange={(e) =>
                  setDocSettings({
                    height: Math.max(1, parseInt(e.target.value || "0", 10)),
                  })
                }
              />
            </div>
          </div>

          <div className="grid gap-1">
            <Label>Background</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={
                  /^#/.test(docSettings.background)
                    ? docSettings.background
                    : "#ffffff"
                }
                onChange={(e) =>
                  setDocSettings({ background: e.target.value })
                }
                className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent"
              />
              <Input
                value={docSettings.background}
                onChange={(e) =>
                  setDocSettings({ background: e.target.value })
                }
                placeholder="#ffffff or var(--color-background)"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="grid gap-1">
              <Label>DPI</Label>
              <Input
                type="number"
                min={1}
                value={docSettings.dpi}
                onChange={(e) =>
                  setDocSettings({ dpi: Math.max(1, parseInt(e.target.value || "72", 10)) })
                }
              />
            </div>
            <div className="grid gap-1">
              <Label>Bleed (px)</Label>
              <Input
                type="number"
                min={0}
                value={docSettings.bleed}
                onChange={(e) =>
                  setDocSettings({
                    bleed: Math.max(0, parseInt(e.target.value || "0", 10)),
                  })
                }
              />
            </div>
            <div className="grid gap-1">
              <Label>Safe area (px)</Label>
              <Input
                type="number"
                min={0}
                value={docSettings.safeArea}
                onChange={(e) =>
                  setDocSettings({
                    safeArea: Math.max(
                      0,
                      parseInt(e.target.value || "0", 10)
                    ),
                  })
                }
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
