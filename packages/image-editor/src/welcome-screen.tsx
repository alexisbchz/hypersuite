"use client"

import { useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  FolderOpenIcon,
  Image01Icon,
  ImageAdd01Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@workspace/ui/components/button"

import { useEditor } from "./editor"
import { loadHyperimg } from "./lib/hyperimg"
import { NewDocumentDialog } from "./dialogs/new-document-dialog"

export function WelcomeScreen() {
  const { newTab, openImageInNewTab, recents } = useEditor()
  const [showNew, setShowNew] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handlePickFile = async (file: File) => {
    if (file.name.toLowerCase().endsWith(".hyperimg")) {
      const snap = await loadHyperimg(file)
      newTab({
        name: file.name.replace(/\.hyperimg$/i, ""),
        layers: snap.layers,
        docSettings: snap.doc,
      })
      return
    }
    if (file.type.startsWith("image/")) {
      await openImageInNewTab(file)
    }
  }

  return (
    <>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
        <div className="pointer-events-auto w-full max-w-md rounded-xl border border-border bg-background/95 p-7 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.18),0_40px_80px_-32px_rgba(0,0,0,0.25)] backdrop-blur-md">
          <div className="flex flex-col items-center text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <HugeiconsIcon icon={Image01Icon} className="size-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold tracking-tight">
              Hypersuite Image
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Start a new project or open a file to get started
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-auto flex-col gap-1.5 py-4"
              onClick={() => setShowNew(true)}
            >
              <HugeiconsIcon icon={ImageAdd01Icon} className="size-5" />
              <span className="text-sm font-medium">New project</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-1.5 py-4"
              onClick={() => fileRef.current?.click()}
            >
              <HugeiconsIcon icon={FolderOpenIcon} className="size-5" />
              <span className="text-sm font-medium">Open from computer</span>
            </Button>
          </div>

          {recents.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                Recent
              </p>
              <ul className="space-y-1 text-sm">
                {recents.slice(0, 5).map((r) => (
                  <li
                    key={`${r.savedAt}-${r.name}`}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-foreground/80"
                  >
                    <span className="truncate">{r.name}</span>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                      {formatRelative(r.savedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            or drop a file anywhere on this canvas
          </p>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,.hyperimg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void handlePickFile(f)
          e.target.value = ""
        }}
      />

      <NewDocumentDialog open={showNew} onOpenChange={setShowNew} />
    </>
  )
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.round(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString()
}
