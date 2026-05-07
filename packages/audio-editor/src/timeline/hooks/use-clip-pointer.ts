"use client"

import { useCallback, useRef } from "react"
import { useEditor } from "../../editor"
import type { Clip, Track } from "../../lib/types"

type Mode =
  | { kind: "drag"; clip: Clip; startX: number; startTime: number }
  | { kind: "trim"; clip: Clip; side: "left" | "right"; startX: number }

export function useClipPointer(track: Track) {
  const {
    tool,
    pxPerSec,
    moveClip,
    trimClip,
    selectClip,
    setSelection,
    splitClipAt,
    setPlayhead,
    deleteClips,
  } = useEditor()
  const modeRef = useRef<Mode | null>(null)

  const onMove = useCallback(
    (e: PointerEvent) => {
      const m = modeRef.current
      if (!m) return
      const dx = e.clientX - m.startX
      const dt = dx / pxPerSec
      if (m.kind === "drag") {
        moveClip(m.clip.id, m.startTime + dt)
      } else if (m.kind === "trim") {
        trimClip(m.clip.id, m.side, dt)
        m.startX = e.clientX
        // refresh latest clip duration via stale closure: trimClip is committed
      }
    },
    [moveClip, pxPerSec, trimClip]
  )

  const onUp = useCallback(() => {
    modeRef.current = null
    window.removeEventListener("pointermove", onMove)
    window.removeEventListener("pointerup", onUp)
  }, [onMove])

  const onClipPointerDown = useCallback(
    (e: React.PointerEvent, clip: Clip, side: "body" | "left" | "right") => {
      if (tool === "split" && side === "body") {
        const targetEl = e.currentTarget as HTMLElement
        const rect = targetEl.getBoundingClientRect()
        const ratio = (e.clientX - rect.left) / rect.width
        const splitTime = clip.start + ratio * clip.duration
        splitClipAt(clip.id, splitTime)
        return
      }
      e.preventDefault()
      e.stopPropagation()
      selectClip(clip.id, e.shiftKey)
      if (side === "body") {
        modeRef.current = {
          kind: "drag",
          clip,
          startX: e.clientX,
          startTime: clip.start,
        }
      } else {
        modeRef.current = {
          kind: "trim",
          clip,
          side,
          startX: e.clientX,
        }
      }
      window.addEventListener("pointermove", onMove)
      window.addEventListener("pointerup", onUp, { once: true })
    },
    [onMove, onUp, selectClip, splitClipAt, tool]
  )

  return { onClipPointerDown }
}
