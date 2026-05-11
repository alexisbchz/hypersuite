"use client"

import Image from "next/image"
import Link from "next/link"
import { useRef } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  Image01Icon,
  KeyboardIcon,
  LinkSquare02Icon,
  MoreHorizontalIcon,
  Redo02Icon,
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

import { useEditor } from "../editor"

const ZOOM_PRESETS = [25, 50, 75, 100, 150, 200, 400]

export function TopBar({
  onToggleShortcuts,
}: {
  onToggleShortcuts: () => void
}) {
  const {
    zoom,
    setZoom,
    undo,
    redo,
    canUndo,
    canRedo,
    addImage,
    addPlayground,
    resetView,
    resetDoc,
  } = useEditor()

  const fileInputRef = useRef<HTMLInputElement | null>(null)

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

      <div className="flex items-center gap-0.5 px-1">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="rounded-md px-2 py-1 text-sm text-foreground/80 hover:bg-muted hover:text-foreground data-popup-open:bg-muted">
                File
              </button>
            }
          />
          <DropdownMenuContent align="start" className="min-w-52">
            <DropdownMenuItem onClick={() => addPlayground()}>
              New playground
              <DropdownMenuShortcut>P</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              Import image…
              <DropdownMenuShortcut>I</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                if (
                  typeof window !== "undefined" &&
                  window.confirm(
                    "Reset canvas? All frames and undo history will be cleared."
                  )
                ) {
                  resetDoc()
                }
              }}
            >
              Reset canvas
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="rounded-md px-2 py-1 text-sm text-foreground/80 hover:bg-muted hover:text-foreground data-popup-open:bg-muted">
                Edit
              </button>
            }
          />
          <DropdownMenuContent align="start" className="min-w-52">
            <DropdownMenuItem onClick={undo} disabled={!canUndo}>
              Undo
              <DropdownMenuShortcut>⌘Z</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={redo} disabled={!canRedo}>
              Redo
              <DropdownMenuShortcut>⌘⇧Z</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="rounded-md px-2 py-1 text-sm text-foreground/80 hover:bg-muted hover:text-foreground data-popup-open:bg-muted">
                View
              </button>
            }
          />
          <DropdownMenuContent align="start" className="min-w-52">
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
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Zoom presets</DropdownMenuLabel>
            {ZOOM_PRESETS.map((z) => (
              <DropdownMenuItem key={z} onClick={() => setZoom(z)}>
                {z}%
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Separator orientation="vertical" className="mx-1 h-11" />

      <div className="ml-auto flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                onClick={() => addPlayground()}
                className="hidden sm:inline-flex"
              >
                <HugeiconsIcon icon={LinkSquare02Icon} />
                Playground
              </Button>
            }
          />
          <TooltipContent>Add a new playground frame · P</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="hidden sm:inline-flex"
              >
                <HugeiconsIcon icon={Image01Icon} />
                Image
              </Button>
            }
          />
          <TooltipContent>Import a reference screenshot · I</TooltipContent>
        </Tooltip>

        <Separator
          orientation="vertical"
          className="mx-1 hidden h-11 sm:block"
        />

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

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" aria-label="More">
                <HugeiconsIcon icon={MoreHorizontalIcon} />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="min-w-52">
            <DropdownMenuItem onClick={onToggleShortcuts}>
              <HugeiconsIcon icon={KeyboardIcon} className="size-3.5" />
              Keyboard shortcuts
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

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? [])
          for (const f of files) await addImage(f)
          e.target.value = ""
        }}
      />
    </header>
  )
}
