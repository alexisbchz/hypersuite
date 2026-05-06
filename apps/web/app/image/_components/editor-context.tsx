"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"
import type { Layer, ToolId } from "./types"

type EditorState = {
  tool: ToolId
  setTool: (t: ToolId) => void
  layers: Layer[]
  selectedId: string | null
  select: (id: string | null) => void
  toggleVisible: (id: string) => void
  toggleLocked: (id: string) => void
  rename: (id: string, name: string) => void
  patch: (id: string, p: Partial<Layer>) => void
  reorder: (id: string, dir: "up" | "down") => void
  moveTo: (id: string, targetIndex: number) => void
  add: () => void
  addImage: (
    file: File,
    opts?: { x?: number; y?: number; maxSize?: number }
  ) => Promise<void>
  remove: (id: string) => void
  zoom: number
  setZoom: (z: number) => void
}

const Ctx = createContext<EditorState | null>(null)

const initial: Layer[] = [
  {
    id: "bg",
    name: "Background",
    kind: "shape",
    visible: true,
    locked: true,
    opacity: 100,
    blendMode: "normal",
    x: 0,
    y: 0,
    width: 1200,
    height: 800,
    rotation: 0,
    color: "var(--color-muted)",
  },
  {
    id: "photo",
    name: "Hero photo",
    kind: "image",
    visible: true,
    locked: false,
    opacity: 100,
    blendMode: "normal",
    x: 80,
    y: 80,
    width: 720,
    height: 480,
    rotation: 0,
  },
  {
    id: "rect",
    name: "Accent rectangle",
    kind: "shape",
    visible: true,
    locked: false,
    opacity: 90,
    blendMode: "multiply",
    x: 640,
    y: 360,
    width: 360,
    height: 280,
    rotation: -6,
    color: "oklch(0.6 0.22 3.958)",
  },
  {
    id: "title",
    name: "Title",
    kind: "text",
    visible: true,
    locked: false,
    opacity: 100,
    blendMode: "normal",
    x: 120,
    y: 600,
    width: 600,
    height: 80,
    rotation: 0,
    color: "var(--color-foreground)",
  },
]

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [tool, setTool] = useState<ToolId>("move")
  const [layers, setLayers] = useState<Layer[]>(initial)
  const [selectedId, setSelectedId] = useState<string | null>("photo")
  const [zoom, setZoom] = useState(75)

  const select = useCallback((id: string | null) => setSelectedId(id), [])

  const toggleVisible = useCallback((id: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    )
  }, [])

  const toggleLocked = useCallback((id: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l))
    )
  }, [])

  const rename = useCallback((id: string, name: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, name } : l))
    )
  }, [])

  const patch = useCallback((id: string, p: Partial<Layer>) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...p } : l))
    )
  }, [])

  const reorder = useCallback((id: string, dir: "up" | "down") => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id)
      if (idx < 0) return prev
      const swap = dir === "up" ? idx - 1 : idx + 1
      if (swap < 0 || swap >= prev.length) return prev
      const next = prev.slice()
      ;[next[idx], next[swap]] = [next[swap]!, next[idx]!]
      return next
    })
  }, [])

  const moveTo = useCallback((id: string, targetIndex: number) => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id)
      if (idx < 0) return prev
      const clamped = Math.max(0, Math.min(prev.length, targetIndex))
      let insertAt = clamped
      if (idx < clamped) insertAt -= 1
      if (insertAt === idx) return prev
      const next = prev.slice()
      const [item] = next.splice(idx, 1)
      next.splice(insertAt, 0, item!)
      return next
    })
  }, [])

  const add = useCallback(() => {
    setLayers((prev) => {
      const id = `layer-${Date.now()}`
      const next: Layer = {
        id,
        name: `Layer ${prev.length + 1}`,
        kind: "shape",
        visible: true,
        locked: false,
        opacity: 100,
        blendMode: "normal",
        x: 200,
        y: 200,
        width: 300,
        height: 200,
        rotation: 0,
        color: "oklch(0.823 0.12 346.018)",
      }
      setSelectedId(id)
      return [next, ...prev]
    })
  }, [])

  const remove = useCallback((id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id))
    setSelectedId((cur) => (cur === id ? null : cur))
  }, [])

  const addImage = useCallback(
    async (
      file: File,
      opts: { x?: number; y?: number; maxSize?: number } = {}
    ) => {
      if (!file.type.startsWith("image/")) return
      const src = URL.createObjectURL(file)
      const dims = await new Promise<{ w: number; h: number }>(
        (resolve, reject) => {
          const img = new window.Image()
          img.onload = () =>
            resolve({ w: img.naturalWidth, h: img.naturalHeight })
          img.onerror = reject
          img.src = src
        }
      )
      const max = opts.maxSize ?? 600
      const ratio = Math.min(1, max / Math.max(dims.w, dims.h))
      const width = Math.round(dims.w * ratio)
      const height = Math.round(dims.h * ratio)
      const id = `img-${Date.now()}`
      const layer: Layer = {
        id,
        name: file.name.replace(/\.[^.]+$/, "") || "Image",
        kind: "image",
        visible: true,
        locked: false,
        opacity: 100,
        blendMode: "normal",
        x: Math.round((opts.x ?? 600) - width / 2),
        y: Math.round((opts.y ?? 400) - height / 2),
        width,
        height,
        rotation: 0,
        src,
      }
      setLayers((prev) => [layer, ...prev])
      setSelectedId(id)
    },
    []
  )

  const value = useMemo<EditorState>(
    () => ({
      tool,
      setTool,
      layers,
      selectedId,
      select,
      toggleVisible,
      toggleLocked,
      rename,
      patch,
      reorder,
      moveTo,
      add,
      addImage,
      remove,
      zoom,
      setZoom,
    }),
    [tool, layers, selectedId, select, toggleVisible, toggleLocked, rename, patch, reorder, moveTo, add, addImage, remove, zoom]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useEditor() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useEditor must be used within EditorProvider")
  return v
}
