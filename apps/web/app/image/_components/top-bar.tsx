"use client"

import Image from "next/image"
import Link from "next/link"
import { useCallback, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  Download04Icon,
  KeyboardIcon,
  MoreHorizontalIcon,
  Redo02Icon,
  Settings02Icon,
  Share05Icon,
  Undo02Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Separator } from "@workspace/ui/components/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { useEditor } from "./editor-context"
import {
  EXPORT_FORMATS,
  exportComposition,
  makeColorResolver,
  exportToBlob,
  type ExportFormat,
} from "./export"
import { SettingsDialog } from "./settings-dialog"
import { DocumentDialog } from "./document-dialog"
import { ShortcutsDialog } from "./shortcuts-dialog"
import { downloadBlob, loadHyperimg, saveHyperimg } from "./hyperimg"

const ZOOM_PRESETS = [25, 50, 75, 100, 150, 200, 400]

export function TopBar() {
  const {
    zoom,
    setZoom,
    layers,
    selectedId,
    undo,
    redo,
    canUndo,
    canRedo,
    duplicate,
    remove,
    reorder,
    moveTo,
    resetView,
    select,
    toggleLocked,
    resetDoc,
    docSettings,
    replaceDoc,
    recents,
    pushRecent,
  } = useEditor()
  const [name, setName] = useState("Untitled")
  const [exporting, setExporting] = useState<ExportFormat | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showDocument, setShowDocument] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [shareStatus, setShareStatus] = useState<string | null>(null)
  const openInputRef = useRef<HTMLInputElement | null>(null)

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      setExporting(format)
      try {
        await exportComposition({
          layers,
          filename: name,
          format,
          resolveColor: makeColorResolver(),
        })
      } finally {
        setExporting(null)
      }
    },
    [layers, name]
  )

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareStatus("Link copied")
    } catch {
      setShareStatus("Copy failed")
    }
    setTimeout(() => setShareStatus(null), 1500)
  }, [])

  const handleSaveHyperimg = useCallback(async () => {
    try {
      const blob = await saveHyperimg({ layers, doc: docSettings })
      const filename = `${name || "Untitled"}.hyperimg`
      downloadBlob(blob, filename)
      pushRecent({
        name: filename,
        thumbnail: "",
        savedAt: Date.now(),
      })
      setShareStatus("Saved")
    } catch {
      setShareStatus("Save failed")
    }
    setTimeout(() => setShareStatus(null), 1500)
  }, [layers, docSettings, name, pushRecent])

  const handleOpenHyperimgFile = useCallback(
    async (file: File) => {
      try {
        const snap = await loadHyperimg(file)
        replaceDoc(snap.layers, snap.doc)
        const filename = file.name
        pushRecent({
          name: filename,
          thumbnail: "",
          savedAt: Date.now(),
        })
        setName(filename.replace(/\.hyperimg$/, ""))
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("open .hyperimg failed", e)
        setShareStatus("Open failed")
        setTimeout(() => setShareStatus(null), 1500)
      }
    },
    [replaceDoc, pushRecent]
  )

  const handleCopyImage = useCallback(async () => {
    try {
      const blob = await exportToBlob({
        layers,
        filename: name,
        format: "png",
        resolveColor: makeColorResolver(),
      })
      // Cast to satisfy TS lib lacking ClipboardItem in some envs.
      const Item = (
        window as unknown as {
          ClipboardItem?: new (data: Record<string, Blob>) => unknown
        }
      ).ClipboardItem
      if (!Item) throw new Error("ClipboardItem unsupported")
      await (
        navigator.clipboard as unknown as {
          write: (items: unknown[]) => Promise<void>
        }
      ).write([new Item({ "image/png": blob })])
      setShareStatus("Image copied")
    } catch {
      setShareStatus("Copy failed")
    }
    setTimeout(() => setShareStatus(null), 1500)
  }, [layers, name])

  const sel = layers.find((l) => l.id === selectedId) ?? null
  const selIdx = sel ? layers.findIndex((l) => l.id === sel.id) : -1
  const noSel = !sel
  const isFirst = selIdx === 0
  const isLast = selIdx === layers.length - 1

  const triggerCls =
    "rounded-md px-2 py-1 text-sm text-foreground/80 hover:bg-muted hover:text-foreground data-popup-open:bg-muted data-popup-open:text-foreground"

  return (
    <header className="flex h-11 shrink-0 items-center border-b border-border bg-background pe-2">
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              href="/"
              className="flex h-11 w-12 shrink-0 items-center justify-center hover:bg-muted -mr-[1px]"
            >
              <Image
                src="/logo.svg"
                alt="Hypersuite"
                width={20}
                height={20}
                className="size-5 rounded-full"
              />
            </Link>
          }
        />
        <TooltipContent>Go back home</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-11" />

      <nav className="ml-1 flex items-center text-sm">
        <DropdownMenu>
          <DropdownMenuTrigger render={<button className={triggerCls}>File</button>} />
          <DropdownMenuContent align="start" className="min-w-52">
            <DropdownMenuItem onClick={() => setShowDocument(true)}>
              Document settings…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openInputRef.current?.click()}>
              Open .hyperimg…
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSaveHyperimg}>
              Save .hyperimg
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Export as</DropdownMenuLabel>
            {EXPORT_FORMATS.map((f) => (
              <DropdownMenuItem
                key={f.id}
                onClick={() => handleExport(f.id)}
                disabled={exporting !== null}
              >
                {f.label}
                <DropdownMenuShortcut>.{f.ext}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger render={<button className={triggerCls}>Edit</button>} />
          <DropdownMenuContent align="start" className="min-w-52">
            <DropdownMenuItem onClick={undo} disabled={!canUndo}>
              Undo
              <DropdownMenuShortcut>⌘Z</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={redo} disabled={!canRedo}>
              Redo
              <DropdownMenuShortcut>⌘⇧Z</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => duplicate()} disabled={noSel}>
              Duplicate
              <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => remove()}
              disabled={noSel}
              variant="destructive"
            >
              Delete
              <DropdownMenuShortcut>⌫</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => select(null)} disabled={noSel}>
              Deselect
              <DropdownMenuShortcut>Esc</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger render={<button className={triggerCls}>View</button>} />
          <DropdownMenuContent align="start" className="min-w-52">
            <DropdownMenuItem
              onClick={() => setZoom(Math.round(zoom * 1.2))}
            >
              Zoom in
              <DropdownMenuShortcut>⌘=</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setZoom(Math.round(zoom / 1.2))}
            >
              Zoom out
              <DropdownMenuShortcut>⌘-</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setZoom(100)}>
              Actual size (100%)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={resetView}>
              Reset view
              <DropdownMenuShortcut>⌘0</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              Zoom to fit
              <DropdownMenuShortcut>⌘1</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              Zoom to selection
              <DropdownMenuShortcut>⌘2</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Zoom presets</DropdownMenuLabel>
            {ZOOM_PRESETS.map((z) => (
              <DropdownMenuItem key={z} onClick={() => setZoom(z)}>
                {z}%
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger render={<button className={triggerCls}>Object</button>} />
          <DropdownMenuContent align="start" className="min-w-52">
            <DropdownMenuItem
              onClick={() => sel && moveTo(sel.id, 0)}
              disabled={noSel || isFirst}
            >
              Bring to front
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => sel && reorder(sel.id, "up")}
              disabled={noSel || isFirst}
            >
              Bring forward
              <DropdownMenuShortcut>⌘]</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => sel && reorder(sel.id, "down")}
              disabled={noSel || isLast}
            >
              Send backward
              <DropdownMenuShortcut>⌘[</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => sel && moveTo(sel.id, layers.length)}
              disabled={noSel || isLast}
            >
              Send to back
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => sel && toggleLocked(sel.id)}
              disabled={noSel}
            >
              {sel?.locked ? "Unlock" : "Lock"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => duplicate()}
              disabled={noSel}
            >
              Duplicate
              <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger render={<button className={triggerCls}>Filter</button>} />
          <DropdownMenuContent align="start" className="min-w-52">
            <DropdownMenuLabel>Coming soon</DropdownMenuLabel>
            <DropdownMenuItem disabled>Blur…</DropdownMenuItem>
            <DropdownMenuItem disabled>Sharpen…</DropdownMenuItem>
            <DropdownMenuItem disabled>Noise…</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>

      <Separator orientation="vertical" className="mx-1 h-11" />

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-44 rounded-md bg-transparent px-2 py-1 text-sm font-medium text-foreground outline-none hover:bg-muted focus:bg-muted"
      />

      <div className="ml-auto flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Undo"
                onClick={undo}
                disabled={!canUndo}
              >
                <HugeiconsIcon icon={Undo02Icon} />
              </Button>
            }
          />
          <TooltipContent>Undo · ⌘Z</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Redo"
                onClick={redo}
                disabled={!canRedo}
              >
                <HugeiconsIcon icon={Redo02Icon} />
              </Button>
            }
          />
          <TooltipContent>Redo · ⌘⇧Z</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-11" />

        <div className="relative">
          <select
            value={ZOOM_PRESETS.includes(zoom) ? zoom : ""}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-7 cursor-pointer appearance-none rounded-md border border-border bg-background pe-6 ps-2 text-xs font-medium text-foreground outline-none hover:bg-muted focus:border-ring"
          >
            {!ZOOM_PRESETS.includes(zoom) && (
              <option value="" disabled>
                {zoom}%
              </option>
            )}
            {ZOOM_PRESETS.map((z) => (
              <option key={z} value={z}>
                {z}%
              </option>
            ))}
          </select>
          <HugeiconsIcon
            icon={ArrowLeft01Icon}
            className="pointer-events-none absolute end-1 top-1/2 size-3 -translate-y-1/2 -rotate-90 text-muted-foreground"
          />
        </div>

        <Separator orientation="vertical" className="mx-1 h-11" />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                size="sm"
                variant="outline"
                disabled={exporting !== null}
                aria-label="Export"
              >
                <HugeiconsIcon icon={Download04Icon} />
                {exporting ? `Exporting ${exporting.toUpperCase()}…` : "Export"}
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  className="-me-0.5 ms-0.5 size-3 text-muted-foreground"
                  data-icon="inline-end"
                />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuLabel>Export as</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {EXPORT_FORMATS.map((f) => (
              <DropdownMenuItem
                key={f.id}
                onClick={() => handleExport(f.id)}
                disabled={exporting !== null}
              >
                {f.label}
                <DropdownMenuShortcut>.{f.ext}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button size="sm" aria-label="Share">
                <HugeiconsIcon icon={Share05Icon} />
                {shareStatus ?? "Share"}
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem onClick={handleCopyLink}>
              Copy link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyImage}>
              Copy as image
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleExport("png")}
              disabled={exporting !== null}
            >
              Download PNG
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSaveHyperimg}>
              Save .hyperimg
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Settings"
                onClick={() => setShowSettings(true)}
              >
                <HugeiconsIcon icon={Settings02Icon} />
              </Button>
            }
          />
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" aria-label="More">
                <HugeiconsIcon icon={MoreHorizontalIcon} />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="min-w-52">
            <DropdownMenuItem onClick={() => setShowShortcuts(true)}>
              <HugeiconsIcon icon={KeyboardIcon} className="size-3.5" />
              Keyboard shortcuts
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openInputRef.current?.click()}>
              Open .hyperimg…
            </DropdownMenuItem>
            {recents.length > 0 && (
              <>
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wide">
                  Recent
                </DropdownMenuLabel>
                {recents.slice(0, 5).map((r) => (
                  <DropdownMenuItem key={`${r.name}-${r.savedAt}`} disabled>
                    {r.name}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                if (
                  typeof window !== "undefined" &&
                  window.confirm(
                    "Reset document? All layers and undo history will be cleared."
                  )
                ) {
                  resetDoc()
                }
              }}
            >
              Reset document
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/" />}>Home</DropdownMenuItem>
            <DropdownMenuItem
              render={
                <a
                  href="https://github.com/alexisbchz/hypersuite"
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              GitHub
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
      <DocumentDialog open={showDocument} onOpenChange={setShowDocument} />
      <ShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
      <input
        ref={openInputRef}
        type="file"
        accept=".hyperimg,application/zip,application/octet-stream"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void handleOpenHyperimgFile(f)
          e.target.value = ""
        }}
      />
    </header>
  )
}
