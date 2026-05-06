"use client"

import Image from "next/image"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Delete02Icon,
  MoreHorizontalIcon,
  Settings02Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

import { useEditor } from "./editor-context"

export function TopBar() {
  const { generations, clear } = useEditor()

  return (
    <header className="flex h-11 shrink-0 items-center border-b border-border bg-background pe-2">
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              href="/"
              className="-mr-[1px] flex h-11 w-12 shrink-0 items-center justify-center hover:bg-muted"
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

      <div className="ml-auto flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                onClick={clear}
                disabled={generations.length === 0}
              >
                <HugeiconsIcon icon={Delete02Icon} />
                Clear all
              </Button>
            }
          />
          <TooltipContent>Delete all generations</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-11" />

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
