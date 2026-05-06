"use client"

import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Delete02Icon,
  ImageIcon,
  ClipboardIcon,
} from "@hugeicons/core-free-icons"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { useEditor } from "../editor"

type Asset = {
  id: string
  name: string
  blob: Blob
  url: string
}

export function AssetsPanel() {
  const { addImage } = useEditor()
  const [assets, setAssets] = useState<Asset[]>([])
  const [drop, setDrop] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    return () => {
      // Revoke object URLs on unmount
      for (const a of assets) URL.revokeObjectURL(a.url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addFiles = (files: File[]) => {
    const next: Asset[] = []
    for (const f of files) {
      if (!f.type.startsWith("image/")) continue
      const url = URL.createObjectURL(f)
      next.push({
        id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: f.name,
        blob: f,
        url,
      })
    }
    if (next.length) setAssets((cur) => [...next, ...cur])
  }

  const placeAsset = async (a: Asset) => {
    const file = new File([a.blob], a.name, { type: a.blob.type })
    await addImage(file)
  }

  const handlePaste = async () => {
    try {
      const items = await (
        navigator.clipboard as unknown as {
          read: () => Promise<
            Array<{
              types: string[]
              getType: (t: string) => Promise<Blob>
            }>
          >
        }
      ).read()
      const files: File[] = []
      for (const item of items) {
        for (const t of item.types) {
          if (t.startsWith("image/")) {
            const b = await item.getType(t)
            files.push(new File([b], `pasted.${t.split("/")[1]}`, { type: t }))
          }
        }
      }
      if (files.length) addFiles(files)
    } catch {
      /* user cancelled or unsupported */
    }
  }

  return (
    <div
      className={cn(
        "flex h-full flex-col",
        drop && "ring-2 ring-primary ring-inset"
      )}
      onDragOver={(e) => {
        if (!Array.from(e.dataTransfer.types).includes("Files")) return
        e.preventDefault()
        e.dataTransfer.dropEffect = "copy"
        setDrop(true)
      }}
      onDragLeave={() => setDrop(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDrop(false)
        const files = Array.from(e.dataTransfer.files)
        addFiles(files)
      }}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <p className="text-xs font-medium text-foreground">Assets</p>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => inputRef.current?.click()}
            aria-label="Add"
          >
            <HugeiconsIcon icon={Add01Icon} />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handlePaste}
            aria-label="Paste from clipboard"
          >
            <HugeiconsIcon icon={ClipboardIcon} />
          </Button>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          addFiles(files)
          e.target.value = ""
        }}
      />
      {assets.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-xs text-muted-foreground">
          Drop images here, paste from clipboard, or browse to add.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5 px-2 pb-2">
          {assets.map((a) => (
            <button
              key={a.id}
              type="button"
              draggable
              onClick={() => placeAsset(a)}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "copy"
                // The canvas already handles file drops; we encode the asset
                // url so the canvas can fetch and add it as an image layer.
                e.dataTransfer.setData("text/uri-list", a.url)
              }}
              className="group relative aspect-square overflow-hidden rounded ring-1 ring-border hover:ring-ring"
              title={a.name}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.url}
                alt={a.name}
                draggable={false}
                className="size-full object-cover"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  URL.revokeObjectURL(a.url)
                  setAssets((cur) => cur.filter((x) => x.id !== a.id))
                }}
                aria-label="Remove"
                className="absolute end-1 top-1 inline-flex size-5 items-center justify-center rounded bg-background/80 text-muted-foreground opacity-0 ring-1 ring-border backdrop-blur transition-opacity group-hover:opacity-100 hover:text-destructive"
              >
                <HugeiconsIcon icon={Delete02Icon} className="size-3" />
              </button>
            </button>
          ))}
        </div>
      )}
      {assets.length > 0 && (
        <p className="px-3 pb-2 text-[10px] text-muted-foreground">
          Click a tile to place at canvas center, or drag onto the canvas.
        </p>
      )}
      <div className="mt-auto" />
      <div
        aria-hidden
        className="px-3 pb-3 text-[10px] text-muted-foreground/70"
      >
        <HugeiconsIcon icon={ImageIcon} className="me-1 inline size-3" />
        Assets are kept in memory for this session.
      </div>
    </div>
  )
}
