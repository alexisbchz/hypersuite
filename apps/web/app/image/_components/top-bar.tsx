"use client"

import Image from "next/image"
import Link from "next/link"
import { useCallback, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  Download04Icon,
  MoreHorizontalIcon,
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { useEditor } from "./editor-context"
import {
  EXPORT_FORMATS,
  exportComposition,
  makeColorResolver,
  type ExportFormat,
} from "./export"

const ZOOM_PRESETS = [25, 50, 75, 100, 150, 200, 400]

export function TopBar() {
  const { zoom, setZoom, layers } = useEditor()
  const [name, setName] = useState("Untitled")
  const [exporting, setExporting] = useState<ExportFormat | null>(null)

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
        <TooltipContent>Back to home</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-11" />

      <nav className="flex items-center text-sm">
        {["File", "Edit", "View", "Object", "Filter"].map((m) => (
          <button
            key={m}
            className="rounded-md px-2 py-1 text-foreground/80 hover:bg-muted hover:text-foreground"
          >
            {m}
          </button>
        ))}
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
              <Button variant="outline" size="icon-sm" aria-label="Undo">
                <HugeiconsIcon icon={Undo02Icon} />
              </Button>
            }
          />
          <TooltipContent>Undo · ⌘Z</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="outline" size="icon-sm" aria-label="Redo">
                <HugeiconsIcon icon={Redo02Icon} />
              </Button>
            }
          />
          <TooltipContent>Redo · ⌘⇧Z</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-11" />

        <div className="relative">
          <select
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-7 cursor-pointer appearance-none rounded-md border border-border bg-background pe-6 ps-2 text-xs font-medium text-foreground outline-none hover:bg-muted focus:border-ring"
          >
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
        <Button size="sm">Share</Button>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" size="icon-sm" aria-label="Settings">
                <HugeiconsIcon icon={Settings02Icon} />
              </Button>
            }
          />
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>
        <Button variant="ghost" size="icon-sm" aria-label="More">
          <HugeiconsIcon icon={MoreHorizontalIcon} />
        </Button>
      </div>
    </header>
  )
}
