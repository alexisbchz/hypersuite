"use client"

import { useEffect } from "react"

import { useEditor } from "./editor"
import type { ToolId } from "./lib/types"

const TOOL_KEYS: Record<string, ToolId> = {
  v: "move",
  h: "pan",
  m: "marquee",
  p: "pen",
  n: "pencil",
  b: "brush",
  e: "eraser",
  t: "text",
  u: "shape",
  c: "crop",
  i: "picker",
  w: "wand",
  z: "zoom",
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
      { keys: "⌘D", label: "Duplicate" },
      { keys: "⌘A", label: "Select all" },
      { keys: "⌘G", label: "Group" },
      { keys: "⌘⇧G", label: "Ungroup" },
      { keys: "⌫ / Delete", label: "Delete" },
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
    group: "Arrange",
    items: [
      { keys: "⌘[", label: "Send backward" },
      { keys: "⌘]", label: "Bring forward" },
    ],
  },
  {
    group: "View",
    items: [
      { keys: "⌘0", label: "Reset view" },
      { keys: "⌘1", label: "Zoom to fit" },
      { keys: "⌘2", label: "Zoom to selection" },
      { keys: "⌘= / ⌘-", label: "Zoom in / out" },
      { keys: "Space (hold)", label: "Pan" },
    ],
  },
  {
    group: "Tools",
    items: [
      { keys: "V", label: "Move" },
      { keys: "H", label: "Hand / Pan" },
      { keys: "M", label: "Marquee" },
      { keys: "P", label: "Pen" },
      { keys: "N", label: "Pencil" },
      { keys: "B", label: "Brush" },
      { keys: "E", label: "Eraser" },
      { keys: "T", label: "Text" },
      { keys: "U", label: "Shape" },
      { keys: "C", label: "Crop" },
      { keys: "I", label: "Picker" },
      { keys: "W", label: "Wand" },
      { keys: "Z", label: "Zoom" },
    ],
  },
]

function isEditableTarget(t: EventTarget | null) {
  const el = t as HTMLElement | null
  if (!el) return false
  if (el.isContentEditable) return true
  const tag = el.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
}

export function KeyboardShortcuts() {
  const editor = useEditor()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return

      const meta = e.metaKey || e.ctrlKey

      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault()
        if (e.shiftKey) editor.redo()
        else editor.undo()
        return
      }

      if (meta && e.key.toLowerCase() === "y" && !e.shiftKey) {
        e.preventDefault()
        editor.redo()
        return
      }

      if (meta && e.key.toLowerCase() === "d") {
        e.preventDefault()
        editor.duplicate()
        return
      }

      if (meta && e.key.toLowerCase() === "a") {
        e.preventDefault()
        editor.selectAll()
        return
      }

      if (meta && e.key.toLowerCase() === "g") {
        e.preventDefault()
        if (e.shiftKey) {
          if (editor.selectedId) {
            const sel = editor.layers.find((l) => l.id === editor.selectedId)
            if (sel?.kind === "group") editor.ungroup(sel.id)
          }
        } else {
          if (editor.selectedIds.length >= 1) {
            editor.addGroup(editor.selectedIds)
          }
        }
        return
      }

      if (meta && e.key === "0") {
        e.preventDefault()
        editor.resetView()
        return
      }

      if (meta && e.key === "]") {
        if (editor.selectedId) {
          e.preventDefault()
          editor.reorder(editor.selectedId, "up")
        }
        return
      }

      if (meta && e.key === "[") {
        if (editor.selectedId) {
          e.preventDefault()
          editor.reorder(editor.selectedId, "down")
        }
        return
      }

      if (meta && (e.key === "=" || e.key === "+")) {
        e.preventDefault()
        editor.setZoom(Math.round(editor.zoom * 1.2))
        return
      }

      if (meta && e.key === "-") {
        e.preventDefault()
        editor.setZoom(Math.round(editor.zoom / 1.2))
        return
      }

      if (e.key === "Escape") {
        editor.select(null)
        return
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (editor.selectedIds.length) {
          e.preventDefault()
          editor.remove()
        }
        return
      }

      if (
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown"
      ) {
        if (!editor.selectedIds.length) return
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        const dx =
          e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0
        const dy =
          e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0
        editor.nudge(editor.selectedIds, dx, dy)
        return
      }

      if (e.code === "Space" && !e.repeat) {
        e.preventDefault()
        editor.setSpacePressed(true)
        return
      }

      if (e.altKey || meta) return
      const key = e.key.toLowerCase()
      const toolId = TOOL_KEYS[key]
      if (toolId) {
        e.preventDefault()
        editor.setTool(toolId)
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        editor.setSpacePressed(false)
      }
    }

    const onBlur = () => editor.setSpacePressed(false)

    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    window.addEventListener("blur", onBlur)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
      window.removeEventListener("blur", onBlur)
    }
  }, [editor])

  return null
}
