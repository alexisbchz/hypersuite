"use client"

import Image from "next/image"
import Link from "next/link"
import illustration from "../assets/illustration.webp"
import { useCallback, useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  Download04Icon,
  KeyboardIcon,
  Menu02Icon,
  MoreHorizontalIcon,
  PanelRightIcon,
  Redo02Icon,
  Settings02Icon,
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { useMediaQuery } from "@workspace/ui/hooks/use-media-query"
import { useEditor } from "../editor"
import {
  EXPORT_FORMATS,
  exportComposition,
  makeColorResolver,
  type ExportFormat,
} from "../lib/export"
import { SettingsDialog } from "../dialogs/settings-dialog"
import { DocumentDialog } from "../dialogs/document-dialog"
import { NewDocumentDialog } from "../dialogs/new-document-dialog"
import { ShortcutsDialog } from "../dialogs/shortcuts-dialog"
import { downloadBlob, loadHyperimg, saveHyperimg } from "../lib/hyperimg"
import { CMD_EVENTS } from "../chrome/command-palette"
import { RightPanelContent } from "../panels/right-panel"

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
    newTab,
    filename: name,
    setFilename: setName,
    recents,
    pushRecent,
    setProp,
    getRasterCanvas,
  } = useEditor()
  const [exporting, setExporting] = useState<ExportFormat | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showDocument, setShowDocument] = useState(false)
  const [showNewDoc, setShowNewDoc] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [menuSheetOpen, setMenuSheetOpen] = useState(false)
  const [panelsOpen, setPanelsOpen] = useState(false)
  const openInputRef = useRef<HTMLInputElement | null>(null)

  // Tablet (≥ md) uses a right-side sheet for the panels; phones (< md)
  // use a bottom sheet — feels native on each form factor.
  const tabletUp = useMediaQuery("(min-width: 768px)")

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      setExporting(format)
      try {
        await exportComposition({
          layers,
          filename: name,
          format,
          width: docSettings.width,
          height: docSettings.height,
          photoUrl: illustration.src,
          resolveColor: makeColorResolver(),
          getRasterCanvas,
        })
      } finally {
        setExporting(null)
      }
    },
    [layers, name, docSettings.width, docSettings.height, getRasterCanvas]
  )

  const handleSaveHyperimg = useCallback(async () => {
    const blob = await saveHyperimg({ layers, doc: docSettings })
    const filename = `${name || "Untitled"}.hyperimg`
    downloadBlob(blob, filename)
    pushRecent({
      name: filename,
      thumbnail: "",
      savedAt: Date.now(),
    })
  }, [layers, docSettings, name, pushRecent])

  const handleOpenHyperimgFile = useCallback(
    async (file: File) => {
      const snap = await loadHyperimg(file)
      const tabName = file.name.replace(/\.hyperimg$/i, "")
      newTab({ name: tabName, layers: snap.layers, docSettings: snap.doc })
      pushRecent({
        name: file.name,
        thumbnail: "",
        savedAt: Date.now(),
      })
    },
    [newTab, pushRecent]
  )

  const sel = layers.find((l) => l.id === selectedId) ?? null
  const selIdx = sel ? layers.findIndex((l) => l.id === sel.id) : -1
  const noSel = !sel
  const isFirst = selIdx === 0
  const isLast = selIdx === layers.length - 1

  // Bridge between the global command palette and dialog/file-input state
  // that lives only in this component.
  useEffect(() => {
    const onNew = () => setShowNewDoc(true)
    const onOpen = () => openInputRef.current?.click()
    const onSave = () => void handleSaveHyperimg()
    const onPng = () => void handleExport("png")
    const onJpeg = () => void handleExport("jpeg")
    const onWebp = () => void handleExport("webp")
    const onSvg = () => void handleExport("svg")
    const onDocSettings = () => setShowDocument(true)
    const onShortcuts = () => setShowShortcuts(true)
    window.addEventListener(CMD_EVENTS.newDocument, onNew)
    window.addEventListener(CMD_EVENTS.openFile, onOpen)
    window.addEventListener(CMD_EVENTS.save, onSave)
    window.addEventListener(CMD_EVENTS.exportPng, onPng)
    window.addEventListener(CMD_EVENTS.exportJpeg, onJpeg)
    window.addEventListener(CMD_EVENTS.exportWebp, onWebp)
    window.addEventListener(CMD_EVENTS.exportSvg, onSvg)
    window.addEventListener(CMD_EVENTS.documentSettings, onDocSettings)
    window.addEventListener(CMD_EVENTS.shortcuts, onShortcuts)
    return () => {
      window.removeEventListener(CMD_EVENTS.newDocument, onNew)
      window.removeEventListener(CMD_EVENTS.openFile, onOpen)
      window.removeEventListener(CMD_EVENTS.save, onSave)
      window.removeEventListener(CMD_EVENTS.exportPng, onPng)
      window.removeEventListener(CMD_EVENTS.exportJpeg, onJpeg)
      window.removeEventListener(CMD_EVENTS.exportWebp, onWebp)
      window.removeEventListener(CMD_EVENTS.exportSvg, onSvg)
      window.removeEventListener(CMD_EVENTS.documentSettings, onDocSettings)
      window.removeEventListener(CMD_EVENTS.shortcuts, onShortcuts)
    }
  }, [handleSaveHyperimg, handleExport])

  const triggerCls =
    "rounded-md px-2 py-1 text-sm text-foreground/80 hover:bg-muted hover:text-foreground data-popup-open:bg-muted data-popup-open:text-foreground"

  // The 6 application menus, used both in the desktop nav strip and stacked
  // vertically inside the mobile menu sheet. Closes over editor state, so
  // it's defined inline rather than extracted to a sub-component.
  const renderMenus = (vertical: boolean) => (
    <nav
      className={
        vertical
          ? "flex flex-col items-stretch gap-1 text-sm"
          : "ml-1 flex items-center text-sm"
      }
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              className={
                vertical
                  ? "rounded-md px-3 py-2 text-left text-sm hover:bg-muted data-popup-open:bg-muted"
                  : triggerCls
              }
            >
              File
            </button>
          }
        />
        <DropdownMenuContent
          align={vertical ? "start" : "start"}
          side={vertical ? "right" : "bottom"}
          className="min-w-52"
        >
          <DropdownMenuItem onClick={() => setShowNewDoc(true)}>
            New…
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
        <DropdownMenuTrigger
          render={
            <button
              className={
                vertical
                  ? "rounded-md px-3 py-2 text-left text-sm hover:bg-muted data-popup-open:bg-muted"
                  : triggerCls
              }
            >
              Edit
            </button>
          }
        />
        <DropdownMenuContent
          align="start"
          side={vertical ? "right" : "bottom"}
          className="min-w-52"
        >
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
        <DropdownMenuTrigger
          render={
            <button
              className={
                vertical
                  ? "rounded-md px-3 py-2 text-left text-sm hover:bg-muted data-popup-open:bg-muted"
                  : triggerCls
              }
            >
              View
            </button>
          }
        />
        <DropdownMenuContent
          align="start"
          side={vertical ? "right" : "bottom"}
          className="min-w-52"
        >
          <DropdownMenuItem onClick={() => setZoom(Math.round(zoom * 1.2))}>
            Zoom in
            <DropdownMenuShortcut>⌘=</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setZoom(Math.round(zoom / 1.2))}>
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
        <DropdownMenuTrigger
          render={
            <button
              className={
                vertical
                  ? "rounded-md px-3 py-2 text-left text-sm hover:bg-muted data-popup-open:bg-muted"
                  : triggerCls
              }
            >
              Image
            </button>
          }
        />
        <DropdownMenuContent
          align="start"
          side={vertical ? "right" : "bottom"}
          className="min-w-52"
        >
          <DropdownMenuItem onClick={() => setShowDocument(true)}>
            Document settings…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              className={
                vertical
                  ? "rounded-md px-3 py-2 text-left text-sm hover:bg-muted data-popup-open:bg-muted"
                  : triggerCls
              }
            >
              Object
            </button>
          }
        />
        <DropdownMenuContent
          align="start"
          side={vertical ? "right" : "bottom"}
          className="min-w-52"
        >
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
          <DropdownMenuItem onClick={() => duplicate()} disabled={noSel}>
            Duplicate
            <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              className={
                vertical
                  ? "rounded-md px-3 py-2 text-left text-sm hover:bg-muted data-popup-open:bg-muted"
                  : triggerCls
              }
            >
              Filter
            </button>
          }
        />
        <DropdownMenuContent
          align="start"
          side={vertical ? "right" : "bottom"}
          className="min-w-52"
        >
          <DropdownMenuLabel>Apply to selection</DropdownMenuLabel>
          <DropdownMenuItem
            disabled={noSel}
            onClick={() =>
              sel &&
              setProp(sel.id, {
                effects: { ...(sel.effects ?? {}), blur: 8 },
              })
            }
          >
            Blur 8px
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={noSel}
            onClick={() =>
              sel &&
              setProp(sel.id, {
                effects: { ...(sel.effects ?? {}), blur: 16 },
              })
            }
          >
            Blur 16px
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={noSel}
            onClick={() =>
              sel &&
              setProp(sel.id, {
                filters: {
                  ...(sel.filters ?? {}),
                  sharpen: { strength: 35 },
                },
              })
            }
          >
            Sharpen
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={noSel}
            onClick={() =>
              sel &&
              setProp(sel.id, {
                filters: {
                  ...(sel.filters ?? {}),
                  noise: { amount: 25, mono: false },
                },
              })
            }
          >
            Noise
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={noSel}
            onClick={() =>
              sel &&
              setProp(sel.id, {
                filters: {
                  ...(sel.filters ?? {}),
                  noise: { amount: 30, mono: true },
                },
              })
            }
          >
            Mono noise
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={noSel}
            onClick={() =>
              sel &&
              setProp(sel.id, {
                filters: {
                  ...(sel.filters ?? {}),
                  grain: { amount: 35, scale: 1 },
                },
              })
            }
          >
            Film grain
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={noSel}
            onClick={() =>
              sel &&
              setProp(sel.id, {
                filters: undefined,
                effects: sel.effects
                  ? { ...sel.effects, blur: null }
                  : undefined,
              })
            }
            variant="destructive"
          >
            Clear filters
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  )

  return (
    <header className="flex h-11 shrink-0 items-center border-b border-border bg-background pe-2">
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              href="/"
              className="-mr-px flex h-11 w-12 shrink-0 items-center justify-center hover:bg-muted"
            >
              <Image
                src="/logo.svg"
                alt="Hypersuite"
                width={20}
                height={20}
                className="mt-0.5 ml-0.5 size-5 rounded-full"
              />
            </Link>
          }
        />
        <TooltipContent>Go back home</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-11" />

      {/* Mobile: hamburger that opens the full menu strip inside a sheet. */}
      <Sheet open={menuSheetOpen} onOpenChange={setMenuSheetOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Open menu"
              className="ml-1 md:hidden"
            >
              <HugeiconsIcon icon={Menu02Icon} />
            </Button>
          }
        />
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b border-border">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>File, edit, and view actions.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-2">{renderMenus(true)}</div>
        </SheetContent>
      </Sheet>

      <div className="hidden md:contents">{renderMenus(false)}</div>

      <Separator orientation="vertical" className="mx-1 h-11" />

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="hidden w-32 rounded-md bg-transparent px-2 py-1 text-sm font-medium text-foreground outline-none hover:bg-muted focus:bg-muted sm:block sm:w-44"
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

        <Separator
          orientation="vertical"
          className="mx-1 hidden h-11 sm:block"
        />

        <div className="relative hidden sm:block">
          <select
            value={ZOOM_PRESETS.includes(zoom) ? zoom : ""}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-7 cursor-pointer appearance-none rounded-md border border-border bg-background ps-2 pe-6 text-xs font-medium text-foreground outline-none hover:bg-muted focus:border-ring"
          >
            {!ZOOM_PRESETS.includes(zoom) && (
              <option value="" disabled>
                {Math.round(zoom)}%
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

        {/* Panels sheet trigger — visible below the lg breakpoint where the
            inline RightPanel is hidden. */}
        <Sheet open={panelsOpen} onOpenChange={setPanelsOpen}>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Open panels"
                className="lg:hidden"
              >
                <HugeiconsIcon icon={PanelRightIcon} />
              </Button>
            }
          />
          <SheetContent
            side={tabletUp ? "right" : "bottom"}
            className={
              tabletUp ? "w-80 p-0 sm:max-w-sm" : "h-[80svh] max-h-[640px] p-0"
            }
          >
            <SheetHeader className="border-b border-border">
              <SheetTitle>Panels</SheetTitle>
              <SheetDescription>
                Properties, layers, and assets for the current document.
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-hidden">
              <RightPanelContent />
            </div>
          </SheetContent>
        </Sheet>

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
                <span className="hidden sm:inline">
                  {exporting
                    ? `Exporting ${exporting.toUpperCase()}…`
                    : "Export"}
                </span>
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  className="ms-0.5 -me-0.5 size-3 text-muted-foreground"
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
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Settings"
                onClick={() => setShowSettings(true)}
                className="hidden sm:inline-flex"
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
            <DropdownMenuItem
              className="sm:hidden"
              onClick={() => setShowSettings(true)}
            >
              <HugeiconsIcon icon={Settings02Icon} className="size-3.5" />
              Settings
            </DropdownMenuItem>
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
                <DropdownMenuLabel className="text-[10px] tracking-wide uppercase">
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
      <NewDocumentDialog open={showNewDoc} onOpenChange={setShowNewDoc} />
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
