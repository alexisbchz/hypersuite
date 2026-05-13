"use client"

import Image from "next/image"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Download04Icon,
  KeyboardIcon,
  MagicWand01Icon,
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

export function TopBar() {
  const {
    projectName,
    setProjectName,
    canUndo,
    canRedo,
    undo,
    redo,
    setTtsDialogOpen,
    setExportDialogOpen,
    setShortcutsDialogOpen,
    clips,
  } = useEditor()

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
                alt="Hypercreate"
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

      <div className="flex items-center gap-1 px-2">
        <input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="h-7 max-w-56 rounded-sm bg-transparent px-1.5 text-sm font-medium outline-none focus:bg-muted"
          aria-label="Project name"
        />
      </div>

      <Separator orientation="vertical" className="h-11" />

      <div className="flex items-center gap-0.5 px-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={undo}
                disabled={!canUndo}
                aria-label="Undo"
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
                variant="ghost"
                size="icon-sm"
                onClick={redo}
                disabled={!canRedo}
                aria-label="Redo"
              >
                <HugeiconsIcon icon={Redo02Icon} />
              </Button>
            }
          />
          <TooltipContent>Redo · ⌘⇧Z</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-11" />

      <div className="ml-auto flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTtsDialogOpen(true)}
              >
                <HugeiconsIcon icon={MagicWand01Icon} />
                Generate speech
              </Button>
            }
          />
          <TooltipContent>Generate speech with Pocket TTS · ⌘G</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="default"
                size="sm"
                onClick={() => setExportDialogOpen(true)}
                disabled={clips.length === 0}
              >
                <HugeiconsIcon icon={Download04Icon} />
                Export
              </Button>
            }
          />
          <TooltipContent>Mix down to WAV · ⌘E</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-11" />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" aria-label="More">
                <HugeiconsIcon icon={MoreHorizontalIcon} />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="min-w-48">
            <DropdownMenuItem onClick={() => setShortcutsDialogOpen(true)}>
              <HugeiconsIcon icon={KeyboardIcon} />
              Keyboard shortcuts
              <DropdownMenuShortcut>?</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setExportDialogOpen(true)}>
              <HugeiconsIcon icon={Download04Icon} />
              Export
              <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
      </div>
    </header>
  )
}
