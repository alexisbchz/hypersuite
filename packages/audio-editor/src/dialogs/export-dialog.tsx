"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Download04Icon } from "@hugeicons/core-free-icons"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { useEditor } from "../editor"
import { audioBufferToWav, downloadBlob, renderMixdown } from "../lib/export"

export function ExportDialog() {
  const {
    exportDialogOpen,
    setExportDialogOpen,
    projectName,
    sampleRate,
    bitDepth,
    setBitDepth,
    masterGainDb,
    tracks,
    clips,
    getBuffer,
  } = useEditor()
  const [filename, setFilename] = useState(() => slugify(projectName))
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onExport = async () => {
    setError(null)
    setExporting(true)
    try {
      const buffers = new Map<string, AudioBuffer>()
      for (const c of clips) {
        const buf = getBuffer(c.bufferRef)
        if (buf) buffers.set(c.bufferRef, buf)
      }
      const rendered = await renderMixdown({
        sampleRate,
        bitDepth,
        masterGainDb,
        tracks,
        clips,
        buffers,
      })
      const blob = audioBufferToWav(rendered, bitDepth)
      downloadBlob(blob, `${filename || "mixdown"}.wav`)
      setExportDialogOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export mixdown</DialogTitle>
          <DialogDescription>
            Renders all tracks to a single WAV via OfflineAudioContext.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="filename">Filename</Label>
            <div className="flex items-center gap-2">
              <Input
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
              />
              <span className="text-sm text-muted-foreground">.wav</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Bit depth</Label>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-between"
                  >
                    {bitDepth}-bit {bitDepth === 32 ? "(float)" : "(PCM)"}
                  </Button>
                }
              />
              <DropdownMenuContent>
                {[16, 24, 32].map((b) => (
                  <DropdownMenuItem
                    key={b}
                    onClick={() => setBitDepth(b as 16 | 24 | 32)}
                  >
                    {b}-bit {b === 32 ? "(float)" : "(PCM)"}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setExportDialogOpen(false)}
            disabled={exporting}
          >
            Cancel
          </Button>
          <Button onClick={onExport} disabled={exporting || clips.length === 0}>
            {exporting ? (
              <>Exporting…</>
            ) : (
              <>
                <HugeiconsIcon icon={Download04Icon} />
                Export WAV
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function slugify(s: string) {
  return (
    s
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "mixdown"
  )
}
