"use client"

import { useEffect } from "react"

import { useEditor } from "./editor"
import type { ToolId } from "./lib/types"

const TOOL_KEYS: Record<string, ToolId> = {
  v: "move",
  h: "pan",
  p: "playground",
  i: "image",
}

export type ShortcutGroup = {
  group: string
  items: Array<{ keys: string; label: string }>
}

export const SHORTCUTS: ShortcutGroup[] = [
  {
    group: "Edit",
    items: [
      { keys: "⌘Z", label: "Undo" },
      { keys: "⌘⇧Z / ⌘Y", label: "Redo" },
      { keys: "⌘D", label: "Duplicate frame" },
      { keys: "⌘A", label: "Select all frames" },
      { keys: "⌫ / Delete", label: "Delete frame" },
      { keys: "Esc", label: "Deselect" },
    ],
  },
  {
    group: "Move",
    items: [
      { keys: "↑ ↓ ← →", label: "Nudge 1px" },
      { keys: "⇧ + arrows", label: "Nudge 10px" },
    ],
  },
  {
    group: "View",
    items: [
      { keys: "⌘0", label: "Reset view" },
      { keys: "⌘= / ⌘-", label: "Zoom in / out" },
      { keys: "Space (hold)", label: "Pan" },
      { keys: "⌘/Ctrl + scroll", label: "Zoom under cursor" },
    ],
  },
  {
    group: "Tools",
    items: [
      { keys: "V", label: "Move" },
      { keys: "H", label: "Hand / Pan" },
      { keys: "P", label: "Playground frame" },
      { keys: "I", label: "Reference image" },
    ],
  },
]

export function KeyboardShortcuts() {
  const {
    setTool,
    undo,
    redo,
    remove,
    duplicate,
    select,
    selectMany,
    frames,
    selectedIds,
    nudge,
    commit,
    setZoom,
    zoom,
    resetView,
    setSpacePressed,
    addPlayground,
  } = useEditor()

  useEffect(() => {
    const isEditable = (t: EventTarget | null) => {
      if (!(t instanceof HTMLElement)) return false
      const tag = t.tagName
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        t.isContentEditable ||
        // Monaco renders into divs that opt-in via this attribute when the
        // editor is focused — treat them as editable to avoid swallowing
        // keystrokes the user is trying to type into the code editor.
        t.closest('[data-monaco-editor], [contenteditable="true"]') !== null ||
        t.closest(".monaco-editor") !== null
      )
    }

    const onKey = (e: KeyboardEvent) => {
      const editable = isEditable(e.target)
      // Space-to-pan always lives at the application level so the user
      // can pan even while a property input has focus.
      if (e.code === "Space" && !e.repeat) {
        if (!editable) {
          e.preventDefault()
          setSpacePressed(true)
        }
        return
      }
      if (editable) return

      const mod = e.metaKey || e.ctrlKey

      // Undo / redo
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault()
        redo()
        return
      }

      // Duplicate / select-all
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault()
        duplicate()
        return
      }
      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault()
        selectMany(frames.map((f) => f.id))
        return
      }

      // Zoom
      if (mod && (e.key === "=" || e.key === "+")) {
        e.preventDefault()
        setZoom(Math.round(zoom * 1.2))
        return
      }
      if (mod && e.key === "-") {
        e.preventDefault()
        setZoom(Math.round(zoom / 1.2))
        return
      }
      if (mod && e.key === "0") {
        e.preventDefault()
        resetView()
        return
      }

      // Delete
      if (e.key === "Backspace" || e.key === "Delete") {
        if (selectedIds.length) {
          e.preventDefault()
          remove()
        }
        return
      }

      // Deselect
      if (e.key === "Escape") {
        select(null)
        return
      }

      // Nudge
      if (
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown"
      ) {
        if (!selectedIds.length) return
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        const dx =
          e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0
        const dy =
          e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0
        nudge(selectedIds, dx, dy)
        commit()
        return
      }

      // Tool keys
      const tool = TOOL_KEYS[e.key.toLowerCase()]
      if (tool) {
        if (tool === "playground") {
          // Tap-P drops a playground at center for one-key flow rather
          // than forcing the user to click into the canvas after.
          addPlayground()
          return
        }
        setTool(tool)
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpacePressed(false)
      }
    }

    window.addEventListener("keydown", onKey)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [
    undo,
    redo,
    duplicate,
    remove,
    select,
    selectMany,
    frames,
    selectedIds,
    nudge,
    commit,
    setZoom,
    zoom,
    resetView,
    setTool,
    setSpacePressed,
    addPlayground,
  ])

  return null
}
