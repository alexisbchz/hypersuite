"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { buildStarterScene } from "../lib/starter-playgrounds"
import type { Frame, ImageFrame, PlaygroundFrame, ToolId } from "../lib/types"
import {
  AUTOSAVE_DELAY_MS,
  clearPersistedDoc,
  loadPersistedDoc,
  savePersistedDoc,
} from "./storage"

const HISTORY_LIMIT = 100

const DEFAULT_PLAYGROUND_HTML = `<div class="flex h-full w-full items-center justify-center bg-slate-50 p-8">
  <div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
    <h1 class="text-2xl font-semibold text-slate-900">Hello, Tailwind</h1>
    <p class="mt-2 text-sm text-slate-600">
      Edit this HTML in the right panel. Hit ⌘S to save.
    </p>
    <button class="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
      Get started
    </button>
  </div>
</div>`

type DocState = {
  frames: Frame[]
  past: Frame[][]
  future: Frame[][]
}

type EditorState = {
  tool: ToolId
  setTool: (t: ToolId) => void

  frames: Frame[]
  selectedIds: string[]
  selectedId: string | null
  selectedFrame: Frame | null
  isSelected: (id: string) => boolean
  select: (
    id: string | null,
    opts?: { additive?: boolean; toggle?: boolean }
  ) => void
  selectMany: (ids: string[]) => void

  addImage: (
    file: File,
    opts?: { x?: number; y?: number }
  ) => Promise<string | null>
  addPlayground: (opts?: { x?: number; y?: number }) => string
  duplicate: (id?: string) => void
  remove: (id?: string) => void
  rename: (id: string, name: string) => void
  patch: (id: string, p: Partial<Frame>) => void
  patchPlayground: (id: string, p: Partial<PlaygroundFrame>) => void
  patchImage: (id: string, p: Partial<ImageFrame>) => void
  nudge: (ids: string[], dx: number, dy: number) => void

  zoom: number
  setZoom: (z: number) => void
  panX: number
  panY: number
  setPan: (x: number, y: number) => void
  resetView: () => void

  spacePressed: boolean
  setSpacePressed: (v: boolean) => void

  commit: () => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean

  resetDoc: () => void
}

const Ctx = createContext<EditorState | null>(null)

const loadImageEl = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`image load failed: ${src}`))
    img.src = src
  })

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error("read failed"))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [tool, setTool] = useState<ToolId>("move")
  const [doc, setDoc] = useState<DocState>({
    frames: [],
    past: [],
    future: [],
  })
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [zoom, setZoomState] = useState(100)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [spacePressed, setSpacePressed] = useState(false)
  const hydratedRef = useRef(false)

  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true
    const saved = loadPersistedDoc()
    if (saved && saved.frames.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDoc({ frames: saved.frames, past: [], future: [] })
      setZoomState(saved.zoom)
      setPanX(saved.panX)
      setPanY(saved.panY)
    } else {
      // First visit (or a previously-cleared canvas): pre-seed with the
      // starter playgrounds so the editor lands populated and clickable
      // rather than a blank page. Zoom set low enough that the whole
      // starter grid fits in a typical viewport (~1280×600 canvas surface).
      setDoc({ frames: buildStarterScene(), past: [], future: [] })
      setZoomState(45)
    }
  }, [])

  useEffect(() => {
    if (!hydratedRef.current) return
    const t = window.setTimeout(
      () =>
        savePersistedDoc({
          frames: doc.frames,
          zoom,
          panX,
          panY,
        }),
      AUTOSAVE_DELAY_MS
    )
    return () => window.clearTimeout(t)
  }, [doc.frames, zoom, panX, panY])

  const select = useCallback(
    (
      id: string | null,
      opts: { additive?: boolean; toggle?: boolean } = {}
    ) => {
      if (id === null) {
        setSelectedIds([])
        return
      }
      setSelectedIds((prev) => {
        if (opts.toggle) {
          return prev.includes(id)
            ? prev.filter((x) => x !== id)
            : [...prev, id]
        }
        if (opts.additive) {
          return prev.includes(id) ? prev : [...prev, id]
        }
        return [id]
      })
    },
    []
  )

  const selectMany = useCallback((ids: string[]) => {
    setSelectedIds(ids)
  }, [])

  const isSelected = useCallback(
    (id: string) => selectedIds.includes(id),
    [selectedIds]
  )

  const commit = useCallback(() => {
    setDoc((d) => ({
      frames: d.frames,
      past: [...d.past, d.frames].slice(-HISTORY_LIMIT),
      future: [],
    }))
  }, [])

  const apply = useCallback((updater: (frames: Frame[]) => Frame[]) => {
    setDoc((d) => {
      const next = updater(d.frames)
      if (next === d.frames) return d
      return {
        frames: next,
        past: [...d.past, d.frames].slice(-HISTORY_LIMIT),
        future: [],
      }
    })
  }, [])

  const undo = useCallback(() => {
    setDoc((d) => {
      if (!d.past.length) return d
      const previous = d.past[d.past.length - 1]!
      return {
        frames: previous,
        past: d.past.slice(0, -1),
        future: [d.frames, ...d.future].slice(0, HISTORY_LIMIT),
      }
    })
  }, [])

  const redo = useCallback(() => {
    setDoc((d) => {
      if (!d.future.length) return d
      const next = d.future[0]!
      return {
        frames: next,
        past: [...d.past, d.frames].slice(-HISTORY_LIMIT),
        future: d.future.slice(1),
      }
    })
  }, [])

  const patch = useCallback((id: string, p: Partial<Frame>) => {
    setDoc((d) => ({
      ...d,
      frames: d.frames.map((f) =>
        f.id === id ? ({ ...f, ...p } as Frame) : f
      ),
    }))
  }, [])

  const patchPlayground = useCallback(
    (id: string, p: Partial<PlaygroundFrame>) => {
      setDoc((d) => ({
        ...d,
        frames: d.frames.map((f) =>
          f.id === id && f.kind === "playground" ? { ...f, ...p } : f
        ),
      }))
    },
    []
  )

  const patchImage = useCallback((id: string, p: Partial<ImageFrame>) => {
    setDoc((d) => ({
      ...d,
      frames: d.frames.map((f) =>
        f.id === id && f.kind === "image" ? { ...f, ...p } : f
      ),
    }))
  }, [])

  const rename = useCallback(
    (id: string, name: string) => {
      apply((fs) => fs.map((f) => (f.id === id ? { ...f, name } : f)))
    },
    [apply]
  )

  const nudge = useCallback(
    (ids: string[], dx: number, dy: number) => {
      const idSet = new Set(ids)
      apply((fs) =>
        fs.map((f) =>
          idSet.has(f.id) && !f.locked ? { ...f, x: f.x + dx, y: f.y + dy } : f
        )
      )
    },
    [apply]
  )

  const addImage = useCallback(
    async (file: File, opts: { x?: number; y?: number } = {}) => {
      if (!file.type.startsWith("image/")) return null
      const src = await readFileAsDataUrl(file)
      const img = await loadImageEl(src)
      const maxSide = 800
      const ratio = Math.min(
        1,
        maxSide / Math.max(img.naturalWidth, img.naturalHeight)
      )
      const width = Math.round(img.naturalWidth * ratio)
      const height = Math.round(img.naturalHeight * ratio)
      // Default to the world point currently centered in the viewport so
      // imported images appear right where the user is looking.
      const scale = zoom / 100
      const centerX = -panX / scale
      const centerY = -panY / scale
      const x = opts.x ?? centerX
      const y = opts.y ?? centerY
      const id = `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const frame: ImageFrame = {
        id,
        kind: "image",
        name: file.name.replace(/\.[^.]+$/, "") || "Reference",
        x: Math.round(x - width / 2),
        y: Math.round(y - height / 2),
        width,
        height,
        locked: false,
        src,
        opacity: 100,
      }
      apply((fs) => [...fs, frame])
      setSelectedIds([id])
      return id
    },
    [apply, panX, panY, zoom]
  )

  const addPlayground = useCallback(
    (opts: { x?: number; y?: number } = {}) => {
      const id = `pg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const width = 640
      const height = 400
      // Default spawn position is the world point currently centered in
      // the visible canvas viewport — that's `-pan / scale`. Without this
      // a new playground would always land at world (0, 0), often far
      // off-screen if the user has panned to inspect a frame.
      const scale = zoom / 100
      const centerX = -panX / scale
      const centerY = -panY / scale
      const x = opts.x ?? centerX
      const y = opts.y ?? centerY
      const frame: PlaygroundFrame = {
        id,
        kind: "playground",
        name: "Playground",
        x: Math.round(x - width / 2),
        y: Math.round(y - height / 2),
        width,
        height,
        locked: false,
        html: DEFAULT_PLAYGROUND_HTML,
        background: "#ffffff",
      }
      apply((fs) => [...fs, frame])
      setSelectedIds([id])
      return id
    },
    [apply, panX, panY, zoom]
  )

  const duplicate = useCallback(
    (id?: string) => {
      const targets = id ? [id] : selectedIds
      if (!targets.length) return
      const newIds: string[] = []
      apply((fs) => {
        const next = fs.slice()
        for (const t of targets) {
          const idx = next.findIndex((f) => f.id === t)
          if (idx < 0) continue
          const src = next[idx]!
          const dupId = `${src.id}-copy-${Date.now()}-${newIds.length}`
          newIds.push(dupId)
          const dup: Frame = {
            ...src,
            id: dupId,
            name: `${src.name} copy`,
            x: src.x + 32,
            y: src.y + 32,
            locked: false,
          }
          next.push(dup)
        }
        return next
      })
      if (newIds.length) setSelectedIds(newIds)
    },
    [apply, selectedIds]
  )

  const remove = useCallback(
    (id?: string) => {
      const targets = id ? [id] : selectedIds
      if (!targets.length) return
      const idSet = new Set(targets)
      apply((fs) => {
        const next = fs.filter((f) => !idSet.has(f.id))
        return next.length === fs.length ? fs : next
      })
      setSelectedIds((cur) => cur.filter((s) => !targets.includes(s)))
    },
    [apply, selectedIds]
  )

  const setZoom = useCallback((z: number) => {
    setZoomState(Math.min(800, Math.max(10, z)))
  }, [])

  const setPan = useCallback((x: number, y: number) => {
    setPanX(x)
    setPanY(y)
  }, [])

  const resetView = useCallback(() => {
    setZoomState(100)
    setPanX(0)
    setPanY(0)
  }, [])

  const resetDoc = useCallback(() => {
    setDoc({ frames: buildStarterScene(), past: [], future: [] })
    setSelectedIds([])
    setZoomState(45)
    setPanX(0)
    setPanY(0)
    clearPersistedDoc()
  }, [])

  const selectedId = selectedIds[0] ?? null
  const selectedFrame = doc.frames.find((f) => f.id === selectedId) ?? null

  const value = useMemo<EditorState>(
    () => ({
      tool,
      setTool,
      frames: doc.frames,
      selectedIds,
      selectedId,
      selectedFrame,
      isSelected,
      select,
      selectMany,
      addImage,
      addPlayground,
      duplicate,
      remove,
      rename,
      patch,
      patchPlayground,
      patchImage,
      nudge,
      zoom,
      setZoom,
      panX,
      panY,
      setPan,
      resetView,
      spacePressed,
      setSpacePressed,
      commit,
      undo,
      redo,
      canUndo: doc.past.length > 0,
      canRedo: doc.future.length > 0,
      resetDoc,
    }),
    [
      tool,
      doc,
      selectedIds,
      selectedId,
      selectedFrame,
      isSelected,
      select,
      selectMany,
      addImage,
      addPlayground,
      duplicate,
      remove,
      rename,
      patch,
      patchPlayground,
      patchImage,
      nudge,
      zoom,
      setZoom,
      panX,
      panY,
      setPan,
      resetView,
      spacePressed,
      commit,
      undo,
      redo,
      resetDoc,
    ]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useEditor() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useEditor must be used within EditorProvider")
  return v
}
