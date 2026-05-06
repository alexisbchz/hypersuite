"use client"

import { useCallback, useEffect, useState } from "react"

import type { Anchor } from "../../lib/types"

/** Pen-tool state machine: drops anchors with each click, hovers a preview
 *  segment to the cursor, finishes on click-on-first-anchor (closed),
 *  Enter (open), or 3rd-party trigger (return value). Esc cancels.
 *  State is auto-cleared when the user switches to another tool. */
export function usePenTool(opts: {
  tool: string
  brushColor: string
  addPath: (opts: {
    anchors: Anchor[]
    closed: boolean
    strokeWidth?: number
    color?: string
  }) => string
}) {
  const { tool, brushColor, addPath } = opts
  const [penAnchors, setPenAnchors] = useState<Anchor[]>([])
  const [penHover, setPenHover] = useState<{ x: number; y: number } | null>(
    null
  )

  const finishPenPath = useCallback(
    (closed: boolean) => {
      if (penAnchors.length >= 2) {
        addPath({
          anchors: penAnchors,
          closed,
          strokeWidth: 2,
          color: brushColor,
        })
      }
      setPenAnchors([])
      setPenHover(null)
    },
    [penAnchors, addPath, brushColor]
  )

  // Esc cancels the in-progress path; Enter finishes it open.
  useEffect(() => {
    if (tool !== "pen") return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPenAnchors([])
        setPenHover(null)
      } else if (e.key === "Enter") {
        finishPenPath(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [tool, finishPenPath])

  // Discard any in-flight anchors when the user switches tools.
  useEffect(() => {
    if (tool !== "pen" && penAnchors.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPenAnchors([])
      setPenHover(null)
    }
  }, [tool, penAnchors.length])

  return {
    penAnchors,
    setPenAnchors,
    penHover,
    setPenHover,
    finishPenPath,
  }
}
