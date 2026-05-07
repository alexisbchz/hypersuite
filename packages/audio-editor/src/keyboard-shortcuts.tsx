"use client"

import { useEffect } from "react"
import { useEditor } from "./editor"
import type { ToolId } from "./lib/types"

const TOOL_KEYS: Record<string, ToolId> = {
  v: "select",
  s: "split",
  t: "trim",
  d: "draw",
  h: "pan",
  z: "zoom",
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    target.isContentEditable === true
  )
}

export function KeyboardShortcuts() {
  const {
    setTool,
    undo,
    redo,
    toggleTransport,
    stop,
    setPlayhead,
    playhead,
    pxPerSec,
    zoomBy,
    selection,
    deleteClips,
    duplicateClips,
    copy,
    cut,
    paste,
    clips,
    setSelection,
    setTtsDialogOpen,
    setExportDialogOpen,
    setShortcutsDialogOpen,
  } = useEditor()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return
      const meta = e.metaKey || e.ctrlKey
      const k = e.key.toLowerCase()

      if (meta && k === "z" && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }
      if (meta && (k === "y" || (k === "z" && e.shiftKey))) {
        e.preventDefault()
        redo()
        return
      }
      if (meta && k === "g") {
        e.preventDefault()
        setTtsDialogOpen(true)
        return
      }
      if (meta && k === "e") {
        e.preventDefault()
        setExportDialogOpen(true)
        return
      }
      if (meta && k === "a") {
        e.preventDefault()
        setSelection({ kind: "clips", clipIds: clips.map((c) => c.id) })
        return
      }
      if (meta && (k === "+" || k === "=")) {
        e.preventDefault()
        zoomBy(1.4)
        return
      }
      if (meta && k === "-") {
        e.preventDefault()
        zoomBy(1 / 1.4)
        return
      }
      const ids = selection?.kind === "clips" ? selection.clipIds : []
      if (meta && k === "d") {
        e.preventDefault()
        if (ids.length) duplicateClips(ids)
        return
      }
      if (meta && k === "c") {
        if (ids.length) {
          e.preventDefault()
          copy(ids)
        }
        return
      }
      if (meta && k === "x") {
        if (ids.length) {
          e.preventDefault()
          cut(ids)
        }
        return
      }
      if (meta && k === "v") {
        e.preventDefault()
        paste()
        return
      }

      if (e.key === " ") {
        e.preventDefault()
        toggleTransport()
        return
      }
      if (e.key === "Enter") {
        e.preventDefault()
        stop()
        return
      }
      if (e.key === "Home") {
        e.preventDefault()
        setPlayhead(0)
        return
      }
      if (e.key === "End") {
        e.preventDefault()
        const total = clips.reduce(
          (m, c) => Math.max(m, c.start + c.duration),
          0
        )
        setPlayhead(total)
        return
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (ids.length) {
          e.preventDefault()
          deleteClips(ids)
          setSelection(null)
        }
        return
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        const step = e.shiftKey ? 1 : 0.1
        setPlayhead(Math.max(0, playhead - step))
        return
      }
      if (e.key === "ArrowRight") {
        e.preventDefault()
        const step = e.shiftKey ? 1 : 0.1
        setPlayhead(playhead + step)
        return
      }
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault()
        setShortcutsDialogOpen(true)
        return
      }

      if (TOOL_KEYS[k]) {
        e.preventDefault()
        setTool(TOOL_KEYS[k]!)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [
    clips,
    copy,
    cut,
    deleteClips,
    duplicateClips,
    paste,
    playhead,
    pxPerSec,
    redo,
    selection,
    setExportDialogOpen,
    setPlayhead,
    setSelection,
    setShortcutsDialogOpen,
    setTool,
    setTtsDialogOpen,
    stop,
    toggleTransport,
    undo,
    zoomBy,
  ])

  return null
}
