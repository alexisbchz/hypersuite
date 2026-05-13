"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Copy01Icon,
  Download04Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuTrigger,
} from "@workspace/ui/components/context-menu"
import { cn } from "@workspace/ui/lib/utils"

type CopyState = "idle" | "copied" | "error"

export function LogoMenu() {
  const [copyState, setCopyState] = useState<CopyState>("idle")
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (resetRef.current) clearTimeout(resetRef.current)
    }
  }, [])

  const scheduleReset = () => {
    if (resetRef.current) clearTimeout(resetRef.current)
    resetRef.current = setTimeout(() => {
      setCopyState("idle")
      resetRef.current = null
    }, 2000)
  }

  const handleCopy = async () => {
    try {
      const res = await fetch("/logo.svg")
      const text = await res.text()
      await navigator.clipboard.writeText(text)
      setCopyState("copied")
    } catch {
      setCopyState("error")
    }
    scheduleReset()
  }

  const handleDownload = () => {
    const a = document.createElement("a")
    a.href = "/logo.svg"
    a.download = "hypercreate-logo.svg"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <span className="mb-3 inline-block">
            <Image
              src="/logo.svg"
              alt="Hypercreate logo"
              width={40}
              height={40}
              priority
              className="size-10 rounded-full"
            />
          </span>
        }
      />
      <ContextMenuContent className="min-w-52">
        <ContextMenuGroup>
          <ContextMenuLabel>Logo</ContextMenuLabel>
          <ContextMenuItem onClick={handleCopy} closeOnClick={false}>
            <span className="relative block size-4 shrink-0">
              <HugeiconsIcon
                icon={Copy01Icon}
                className={cn(
                  "absolute inset-0 size-4 transition-all duration-200 ease-out",
                  copyState === "idle"
                    ? "translate-y-0 scale-100 opacity-100"
                    : "-translate-y-1 scale-90 opacity-0"
                )}
              />
              <HugeiconsIcon
                icon={Tick02Icon}
                className={cn(
                  "absolute inset-0 size-4 transition-all duration-200 ease-out",
                  copyState === "copied"
                    ? "translate-y-0 scale-100 opacity-100"
                    : "translate-y-1 scale-90 opacity-0"
                )}
              />
            </span>
            <span className="relative block min-w-[8.5rem]">
              <span
                className={cn(
                  "block transition-all duration-200 ease-out",
                  copyState === "idle"
                    ? "translate-y-0 opacity-100"
                    : "-translate-y-1 opacity-0"
                )}
              >
                Copy to clipboard
              </span>
              <span
                className={cn(
                  "absolute inset-0 transition-all duration-200 ease-out",
                  copyState === "copied"
                    ? "translate-y-0 opacity-100"
                    : "translate-y-1 opacity-0"
                )}
              >
                Copied
              </span>
              <span
                className={cn(
                  "absolute inset-0 transition-all duration-200 ease-out",
                  copyState === "error"
                    ? "translate-y-0 opacity-100"
                    : "translate-y-1 opacity-0"
                )}
              >
                Copy failed
              </span>
            </span>
          </ContextMenuItem>
          <ContextMenuItem onClick={handleDownload}>
            <HugeiconsIcon icon={Download04Icon} />
            Download image
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  )
}
