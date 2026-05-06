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
import type { Anchor, Layer, ShapeVariant, ToolId } from "./types"

export function anchorsToSvgD(
  anchors: Anchor[],
  closed: boolean,
  origin: { x: number; y: number }
) {
  if (!anchors.length) return ""
  const ox = origin.x
  const oy = origin.y
  const segs: string[] = []
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i]!
    if (i === 0) {
      segs.push(`M${a.x - ox} ${a.y - oy}`)
      continue
    }
    const prev = anchors[i - 1]!
    const c1 = prev.hOut
    const c2 = a.hIn
    if (c1 || c2) {
      const cp1 = c1 ?? { x: prev.x, y: prev.y }
      const cp2 = c2 ?? { x: a.x, y: a.y }
      segs.push(
        `C${cp1.x - ox} ${cp1.y - oy} ${cp2.x - ox} ${cp2.y - oy} ${a.x - ox} ${a.y - oy}`
      )
    } else {
      segs.push(`L${a.x - ox} ${a.y - oy}`)
    }
  }
  if (closed && anchors.length >= 2) {
    const first = anchors[0]!
    const last = anchors[anchors.length - 1]!
    const c1 = last.hOut
    const c2 = first.hIn
    if (c1 || c2) {
      const cp1 = c1 ?? { x: last.x, y: last.y }
      const cp2 = c2 ?? { x: first.x, y: first.y }
      segs.push(
        `C${cp1.x - ox} ${cp1.y - oy} ${cp2.x - ox} ${cp2.y - oy} ${first.x - ox} ${first.y - oy}`
      )
    }
    segs.push("Z")
  }
  return segs.join(" ")
}

type DocState = {
  layers: Layer[]
  past: Layer[][]
  future: Layer[][]
}

type SelectOpts = { additive?: boolean; toggle?: boolean }

export type DocSettings = {
  width: number
  height: number
  background: string
  dpi: number
  bleed: number
  safeArea: number
}

export const DEFAULT_DOC_SETTINGS: DocSettings = {
  width: 1200,
  height: 800,
  background: "var(--color-background)",
  dpi: 72,
  bleed: 0,
  safeArea: 0,
}

export type Prefs = {
  snapThreshold: number
  defaultZoom: number
}

export const DEFAULT_PREFS: Prefs = {
  snapThreshold: 6,
  defaultZoom: 75,
}

export type ViewToggles = {
  rulers: boolean
  grid: boolean
  snapping: boolean
  guides: boolean
}

export const DEFAULT_VIEW_TOGGLES: ViewToggles = {
  rulers: false,
  grid: false,
  snapping: true,
  guides: true,
}

export type Recent = {
  name: string
  thumbnail: string
  savedAt: number
}

type EditorState = {
  tool: ToolId
  setTool: (t: ToolId) => void
  layers: Layer[]
  selectedIds: string[]
  selectedId: string | null
  isSelected: (id: string) => boolean
  select: (id: string | null, opts?: SelectOpts) => void
  selectMany: (ids: string[]) => void
  selectAll: () => void
  toggleVisible: (id: string) => void
  toggleLocked: (id: string) => void
  rename: (id: string, name: string) => void
  patch: (id: string, p: Partial<Layer>) => void
  patchMany: (ids: string[], updater: (l: Layer) => Partial<Layer>) => void
  setProp: (id: string, p: Partial<Layer>) => void
  reorder: (id: string, dir: "up" | "down") => void
  moveTo: (id: string, targetIndex: number) => void
  add: () => void
  duplicate: (id?: string) => void
  addImage: (
    file: File,
    opts?: { x?: number; y?: number; maxSize?: number }
  ) => Promise<void>
  addText: (opts: { x: number; y: number; text?: string }) => string
  addShape: (opts: {
    x: number
    y: number
    width: number
    height: number
    variant: ShapeVariant
    color?: string
  }) => string
  addPath: (opts: {
    anchors: Anchor[]
    closed: boolean
    strokeWidth?: number
    color?: string
  }) => string
  updatePathAnchors: (id: string, anchors: Anchor[]) => void
  addRaster: (opts: { width?: number; height?: number }) => string
  getRasterCanvas: (id: string) => HTMLCanvasElement
  commitRaster: (id: string) => void
  remove: (id?: string) => void
  nudge: (ids: string[], dx: number, dy: number) => void
  alignSelection: (
    edge: "left" | "centerX" | "right" | "top" | "centerY" | "bottom"
  ) => void
  distributeSelection: (axis: "horizontal" | "vertical") => void

  zoom: number
  setZoom: (z: number) => void
  panX: number
  panY: number
  setPan: (x: number, y: number) => void
  resetView: () => void
  zoomToRect: (
    rect: { x: number; y: number; width: number; height: number },
    viewport: { width: number; height: number }
  ) => void

  cursor: { x: number; y: number } | null
  setCursor: (c: { x: number; y: number } | null) => void

  spacePressed: boolean
  setSpacePressed: (v: boolean) => void

  // Tool settings
  shapeVariant: ShapeVariant
  setShapeVariant: (v: ShapeVariant) => void
  brushSize: number
  setBrushSize: (v: number) => void
  brushColor: string
  setBrushColor: (v: string) => void
  brushHardness: number
  setBrushHardness: (v: number) => void
  wandTolerance: number
  setWandTolerance: (v: number) => void
  pixelMask: { dataUrl: string; width: number; height: number } | null
  setPixelMask: (
    m: { dataUrl: string; width: number; height: number } | null
  ) => void
  /** Erase pixels in the active raster layer that fall under the current
   *  pixel mask. Returns true if applied. */
  eraseUnderMask: () => Promise<boolean>

  commit: () => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean

  // Document
  docSettings: DocSettings
  setDocSettings: (next: Partial<DocSettings>) => void
  replaceDoc: (layers: Layer[], settings?: Partial<DocSettings>) => void
  resetDoc: () => void

  // Editor prefs
  prefs: Prefs
  setPref: <K extends keyof Prefs>(k: K, v: Prefs[K]) => void

  // View toggles (rulers/grid/snapping/guides)
  viewToggles: ViewToggles
  setViewToggle: <K extends keyof ViewToggles>(k: K, v: boolean) => void

  // Layer groups
  addGroup: (childIds?: string[]) => string
  ungroup: (groupId: string) => void

  // Recent files
  recents: Recent[]
  pushRecent: (r: Recent) => void
  clearRecents: () => void
}

const Ctx = createContext<EditorState | null>(null)

const HISTORY_LIMIT = 100
const STORAGE_KEY = "hypersuite.image.doc.v2"
const PREFS_KEY = "hypersuite.image.prefs.v1"
const RECENTS_KEY = "hypersuite.image.recents.v1"
const RECENTS_LIMIT = 5
const AUTOSAVE_DELAY_MS = 400

function isPersistableLayer(l: Layer) {
  // blob: URLs don't survive a reload, so skip those layers entirely.
  return !(l.src && l.src.startsWith("blob:"))
}

type PersistedDoc = { layers: Layer[]; settings?: DocSettings }

function loadPersisted(): PersistedDoc | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.layers)) return null
    return parsed as PersistedDoc
  } catch {
    return null
  }
}

function loadPrefs(): {
  prefs: Prefs
  viewToggles: ViewToggles
} {
  if (typeof window === "undefined")
    return { prefs: DEFAULT_PREFS, viewToggles: DEFAULT_VIEW_TOGGLES }
  try {
    const raw = window.localStorage.getItem(PREFS_KEY)
    if (!raw) return { prefs: DEFAULT_PREFS, viewToggles: DEFAULT_VIEW_TOGGLES }
    const parsed = JSON.parse(raw)
    return {
      prefs: { ...DEFAULT_PREFS, ...(parsed.prefs ?? {}) },
      viewToggles: {
        ...DEFAULT_VIEW_TOGGLES,
        ...(parsed.viewToggles ?? {}),
      },
    }
  } catch {
    return { prefs: DEFAULT_PREFS, viewToggles: DEFAULT_VIEW_TOGGLES }
  }
}

function loadRecents(): Recent[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Recent[]) : []
  } catch {
    return []
  }
}

// Layer order convention: index 0 is the front-most layer (top of the
// Layers panel). Render path uses `.slice().reverse()` so layers[0] paints
// last and ends up visually on top. The initial state is therefore ordered
// front-to-back: title is at index 0, bg (background) is at the end.
const initial: Layer[] = [
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
]

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [tool, setTool] = useState<ToolId>("move")
  const [doc, setDoc] = useState<DocState>({
    layers: initial,
    past: [],
    future: [],
  })
  const [selectedIds, setSelectedIds] = useState<string[]>(["photo"])
  const [docSettings, setDocSettingsState] = useState<DocSettings>(
    DEFAULT_DOC_SETTINGS
  )
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS)
  const [viewToggles, setViewTogglesState] = useState<ViewToggles>(
    DEFAULT_VIEW_TOGGLES
  )
  const [recents, setRecents] = useState<Recent[]>([])
  const hydratedRef = useRef(false)

  // Hydrate from localStorage on mount. Synchronous setState in effect is
  // intentional here — it's the React-recommended pattern for syncing with
  // an external store on mount, and runs at most once.
  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true
    const saved = loadPersisted()
    if (saved && saved.layers.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDoc({ layers: saved.layers, past: [], future: [] })
      if (saved.settings) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDocSettingsState({ ...DEFAULT_DOC_SETTINGS, ...saved.settings })
      }
      setSelectedIds([])
    }
    const loadedPrefs = loadPrefs()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefsState(loadedPrefs.prefs)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setViewTogglesState(loadedPrefs.viewToggles)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecents(loadRecents())
  }, [])

  // Autosave on layer or settings changes (debounced)
  useEffect(() => {
    if (!hydratedRef.current) return
    if (typeof window === "undefined") return
    const t = window.setTimeout(() => {
      try {
        const persistable = doc.layers.filter(isPersistableLayer)
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ layers: persistable, settings: docSettings })
        )
      } catch {
        // quota exceeded or storage disabled — silently ignore
      }
    }, AUTOSAVE_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [doc.layers, docSettings])

  // Persist prefs + viewToggles
  useEffect(() => {
    if (!hydratedRef.current) return
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(
        PREFS_KEY,
        JSON.stringify({ prefs, viewToggles })
      )
    } catch {
      /* ignore */
    }
  }, [prefs, viewToggles])

  // Persist recents
  useEffect(() => {
    if (!hydratedRef.current) return
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(RECENTS_KEY, JSON.stringify(recents))
    } catch {
      /* ignore */
    }
  }, [recents])
  const [zoom, setZoomState] = useState(75)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const [spacePressed, setSpacePressed] = useState(false)
  const [shapeVariant, setShapeVariant] = useState<ShapeVariant>("rect")
  const [brushSize, setBrushSize] = useState(20)
  const [brushColor, setBrushColor] = useState("#111111")
  const [brushHardness, setBrushHardness] = useState(0.8)
  const [wandTolerance, setWandTolerance] = useState(32)
  const [pixelMask, setPixelMask] = useState<
    { dataUrl: string; width: number; height: number } | null
  >(null)
  const rasterCanvasRef = useRef<Map<string, HTMLCanvasElement>>(new Map())

  const select = useCallback(
    (id: string | null, opts: SelectOpts = {}) => {
      if (id === null) {
        setSelectedIds([])
        return
      }
      setSelectedIds((prev) => {
        if (opts.toggle) {
          return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
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
      layers: d.layers,
      past: [...d.past, d.layers].slice(-HISTORY_LIMIT),
      future: [],
    }))
  }, [])

  const apply = useCallback((updater: (layers: Layer[]) => Layer[]) => {
    setDoc((d) => {
      const next = updater(d.layers)
      if (next === d.layers) return d
      return {
        layers: next,
        past: [...d.past, d.layers].slice(-HISTORY_LIMIT),
        future: [],
      }
    })
  }, [])

  const undo = useCallback(() => {
    setDoc((d) => {
      if (!d.past.length) return d
      const previous = d.past[d.past.length - 1]!
      return {
        layers: previous,
        past: d.past.slice(0, -1),
        future: [d.layers, ...d.future].slice(0, HISTORY_LIMIT),
      }
    })
  }, [])

  const redo = useCallback(() => {
    setDoc((d) => {
      if (!d.future.length) return d
      const next = d.future[0]!
      return {
        layers: next,
        past: [...d.past, d.layers].slice(-HISTORY_LIMIT),
        future: d.future.slice(1),
      }
    })
  }, [])

  const toggleVisible = useCallback(
    (id: string) => {
      apply((ls) =>
        ls.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
      )
    },
    [apply]
  )

  const toggleLocked = useCallback(
    (id: string) => {
      apply((ls) =>
        ls.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l))
      )
    },
    [apply]
  )

  const rename = useCallback(
    (id: string, name: string) => {
      apply((ls) => ls.map((l) => (l.id === id ? { ...l, name } : l)))
    },
    [apply]
  )

  const patch = useCallback((id: string, p: Partial<Layer>) => {
    setDoc((d) => ({
      ...d,
      layers: d.layers.map((l) => (l.id === id ? { ...l, ...p } : l)),
    }))
  }, [])

  const patchMany = useCallback(
    (ids: string[], updater: (l: Layer) => Partial<Layer>) => {
      const idSet = new Set(ids)
      setDoc((d) => ({
        ...d,
        layers: d.layers.map((l) =>
          idSet.has(l.id) ? { ...l, ...updater(l) } : l
        ),
      }))
    },
    []
  )

  const setProp = useCallback(
    (id: string, p: Partial<Layer>) => {
      apply((ls) => ls.map((l) => (l.id === id ? { ...l, ...p } : l)))
    },
    [apply]
  )

  const nudge = useCallback(
    (ids: string[], dx: number, dy: number) => {
      const idSet = new Set(ids)
      apply((ls) =>
        ls.map((l) =>
          idSet.has(l.id) && !l.locked
            ? { ...l, x: l.x + dx, y: l.y + dy }
            : l
        )
      )
    },
    [apply]
  )

  const reorder = useCallback(
    (id: string, dir: "up" | "down") => {
      apply((ls) => {
        const idx = ls.findIndex((l) => l.id === id)
        if (idx < 0) return ls
        const swap = dir === "up" ? idx - 1 : idx + 1
        if (swap < 0 || swap >= ls.length) return ls
        const next = ls.slice()
        ;[next[idx], next[swap]] = [next[swap]!, next[idx]!]
        return next
      })
    },
    [apply]
  )

  const moveTo = useCallback(
    (id: string, targetIndex: number) => {
      apply((ls) => {
        const idx = ls.findIndex((l) => l.id === id)
        if (idx < 0) return ls
        const clamped = Math.max(0, Math.min(ls.length, targetIndex))
        let insertAt = clamped
        if (idx < clamped) insertAt -= 1
        if (insertAt === idx) return ls
        const next = ls.slice()
        const [item] = next.splice(idx, 1)
        next.splice(insertAt, 0, item!)
        return next
      })
    },
    [apply]
  )

  const add = useCallback(() => {
    let newId: string | null = null
    apply((ls) => {
      const id = `layer-${Date.now()}`
      newId = id
      const next: Layer = {
        id,
        name: `Layer ${ls.length + 1}`,
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
      return [next, ...ls]
    })
    if (newId) setSelectedIds([newId])
  }, [apply])

  const duplicate = useCallback(
    (id?: string) => {
      const targets = id ? [id] : selectedIds
      if (!targets.length) return
      const newIds: string[] = []
      apply((ls) => {
        const next = ls.slice()
        for (const t of targets) {
          const idx = next.findIndex((l) => l.id === t)
          if (idx < 0) continue
          const src = next[idx]!
          const dupId = `${src.id}-copy-${Date.now()}-${newIds.length}`
          newIds.push(dupId)
          const dup: Layer = {
            ...src,
            id: dupId,
            name: `${src.name} copy`,
            x: src.x + 24,
            y: src.y + 24,
            locked: false,
          }
          next.splice(idx, 0, dup)
        }
        return next === ls ? ls : next
      })
      if (newIds.length) setSelectedIds(newIds)
    },
    [apply, selectedIds]
  )

  const remove = useCallback(
    (id?: string) => {
      const targets = id ? [id] : selectedIds
      if (!targets.length) return
      const revoked: string[] = []
      apply((ls) => {
        const idSet = new Set(targets)
        const next = ls.filter((l) => {
          if (!idSet.has(l.id)) return true
          if (l.src && l.src.startsWith("blob:")) revoked.push(l.src)
          return false
        })
        return next.length === ls.length ? ls : next
      })
      for (const url of revoked) URL.revokeObjectURL(url)
      setSelectedIds((cur) => cur.filter((s) => !targets.includes(s)))
    },
    [apply, selectedIds]
  )

  const addText = useCallback(
    (opts: { x: number; y: number; text?: string }) => {
      const id = `text-${Date.now()}`
      const text = opts.text ?? "Text"
      const fontSize = 48
      const width = Math.max(80, text.length * fontSize * 0.5)
      const height = Math.round(fontSize * 1.4)
      const layer: Layer = {
        id,
        name: text.slice(0, 24),
        kind: "text",
        visible: true,
        locked: false,
        opacity: 100,
        blendMode: "normal",
        x: Math.round(opts.x - width / 2),
        y: Math.round(opts.y - height / 2),
        width: Math.round(width),
        height,
        rotation: 0,
        color: "var(--color-foreground)",
        text,
        fontSize,
        fontWeight: 600,
      }
      apply((ls) => [layer, ...ls])
      setSelectedIds([id])
      return id
    },
    [apply]
  )

  const addShape = useCallback(
    (opts: {
      x: number
      y: number
      width: number
      height: number
      variant: ShapeVariant
      color?: string
    }) => {
      const id = `shape-${Date.now()}`
      const layer: Layer = {
        id,
        name: opts.variant === "ellipse" ? "Ellipse" : "Rectangle",
        kind: "shape",
        visible: true,
        locked: false,
        opacity: 100,
        blendMode: "normal",
        x: Math.round(opts.x),
        y: Math.round(opts.y),
        width: Math.round(opts.width),
        height: Math.round(opts.height),
        rotation: 0,
        color: opts.color ?? "oklch(0.823 0.12 346.018)",
        shape: opts.variant,
      }
      apply((ls) => [layer, ...ls])
      setSelectedIds([id])
      return id
    },
    [apply]
  )

  const computePathBounds = (
    anchors: Anchor[],
    pad: number
  ): { x: number; y: number; width: number; height: number } => {
    const xs: number[] = []
    const ys: number[] = []
    for (const a of anchors) {
      xs.push(a.x)
      ys.push(a.y)
      if (a.hIn) {
        xs.push(a.hIn.x)
        ys.push(a.hIn.y)
      }
      if (a.hOut) {
        xs.push(a.hOut.x)
        ys.push(a.hOut.y)
      }
    }
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const maxX = Math.max(...xs)
    const maxY = Math.max(...ys)
    return {
      x: Math.floor(minX - pad),
      y: Math.floor(minY - pad),
      width: Math.ceil(maxX - minX + pad * 2),
      height: Math.ceil(maxY - minY + pad * 2),
    }
  }

  const addPath = useCallback(
    (opts: {
      anchors: Anchor[]
      closed: boolean
      strokeWidth?: number
      color?: string
    }) => {
      if (opts.anchors.length < 2) return ""
      const sw = opts.strokeWidth ?? 2
      const bounds = computePathBounds(opts.anchors, sw + 4)
      const d = anchorsToSvgD(opts.anchors, opts.closed, bounds)
      const id = `path-${Date.now()}`
      const layer: Layer = {
        id,
        name: opts.closed ? "Shape" : "Path",
        kind: "path",
        visible: true,
        locked: false,
        opacity: 100,
        blendMode: "normal",
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        rotation: 0,
        color: opts.color ?? "var(--color-foreground)",
        path: d,
        pathClosed: opts.closed,
        pathStrokeWidth: sw,
        anchors: opts.anchors,
      }
      apply((ls) => [layer, ...ls])
      setSelectedIds([id])
      return id
    },
    [apply]
  )

  const updatePathAnchors = useCallback((id: string, anchors: Anchor[]) => {
    setDoc((d) => ({
      ...d,
      layers: d.layers.map((l) => {
        if (l.id !== id || l.kind !== "path") return l
        const sw = l.pathStrokeWidth ?? 2
        const bounds = {
          x: l.x,
          y: l.y,
          width: l.width,
          height: l.height,
        }
        // Recompute bounds if anchors moved outside; use a generous union.
        const xs: number[] = [bounds.x]
        const ys: number[] = [bounds.y]
        xs.push(bounds.x + bounds.width)
        ys.push(bounds.y + bounds.height)
        for (const a of anchors) {
          xs.push(a.x, a.hIn?.x ?? a.x, a.hOut?.x ?? a.x)
          ys.push(a.y, a.hIn?.y ?? a.y, a.hOut?.y ?? a.y)
        }
        const pad = sw + 4
        const newBounds = {
          x: Math.floor(Math.min(...xs) - pad),
          y: Math.floor(Math.min(...ys) - pad),
          width: Math.ceil(Math.max(...xs) - Math.min(...xs) + pad * 2),
          height: Math.ceil(Math.max(...ys) - Math.min(...ys) + pad * 2),
        }
        const dStr = anchorsToSvgD(anchors, l.pathClosed ?? false, newBounds)
        return {
          ...l,
          anchors,
          path: dStr,
          x: newBounds.x,
          y: newBounds.y,
          width: newBounds.width,
          height: newBounds.height,
        }
      }),
    }))
  }, [])

  const getRasterCanvas = useCallback((id: string) => {
    let c = rasterCanvasRef.current.get(id)
    if (!c) {
      c = document.createElement("canvas")
      rasterCanvasRef.current.set(id, c)
    }
    return c
  }, [])

  const addRaster = useCallback(
    (opts: { width?: number; height?: number }) => {
      const id = `raster-${Date.now()}`
      const w = Math.max(1, Math.round(opts.width ?? 1200))
      const h = Math.max(1, Math.round(opts.height ?? 800))
      const canvas = document.createElement("canvas")
      canvas.width = w
      canvas.height = h
      rasterCanvasRef.current.set(id, canvas)
      const layer: Layer = {
        id,
        name: "Raster",
        kind: "raster",
        visible: true,
        locked: false,
        opacity: 100,
        blendMode: "normal",
        x: 0,
        y: 0,
        width: w,
        height: h,
        rotation: 0,
        rasterDataUrl: null,
        rasterWidth: w,
        rasterHeight: h,
      }
      apply((ls) => [layer, ...ls])
      setSelectedIds([id])
      return id
    },
    [apply]
  )

  const eraseUnderMask = useCallback(async () => {
    if (!pixelMask) return false
    if (selectedIds.length !== 1) return false
    const sel = doc.layers.find((l) => l.id === selectedIds[0])
    if (!sel || sel.kind !== "raster") return false
    const canvas = rasterCanvasRef.current.get(sel.id)
    if (!canvas) return false
    const ctx = canvas.getContext("2d")
    if (!ctx) return false
    const img = new window.Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error("mask load failed"))
      img.src = pixelMask.dataUrl
    })
    // Snapshot pre-state for undo
    let pre: string | null = null
    try {
      pre = canvas.toDataURL("image/png")
    } catch {
      pre = null
    }
    setDoc((d) => ({
      ...d,
      layers: d.layers.map((l) =>
        l.id === sel.id ? { ...l, rasterDataUrl: pre } : l
      ),
      past: [...d.past, d.layers].slice(-HISTORY_LIMIT),
      future: [],
    }))
    ctx.save()
    ctx.globalCompositeOperation = "destination-out"
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    ctx.restore()
    let post: string | null = null
    try {
      post = canvas.toDataURL("image/png")
    } catch {
      post = null
    }
    ;(canvas as unknown as { __applied?: string }).__applied = post ?? ""
    setDoc((d) => ({
      ...d,
      layers: d.layers.map((l) =>
        l.id === sel.id ? { ...l, rasterDataUrl: post } : l
      ),
    }))
    setPixelMask(null)
    return true
  }, [pixelMask, selectedIds, doc.layers])

  const commitRaster = useCallback((id: string) => {
    const canvas = rasterCanvasRef.current.get(id)
    if (!canvas) return
    let dataUrl: string | null = null
    try {
      dataUrl = canvas.toDataURL("image/png")
    } catch {
      return
    }
    setDoc((d) => ({
      ...d,
      layers: d.layers.map((l) =>
        l.id === id ? { ...l, rasterDataUrl: dataUrl } : l
      ),
    }))
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
      apply((ls) => [layer, ...ls])
      setSelectedIds([id])
    },
    [apply]
  )

  const setZoom = useCallback((z: number) => {
    setZoomState(Math.round(Math.min(800, Math.max(5, z))))
  }, [])

  const setPan = useCallback((x: number, y: number) => {
    setPanX(x)
    setPanY(y)
  }, [])

  const resetView = useCallback(() => {
    setZoomState(75)
    setPanX(0)
    setPanY(0)
  }, [])

  const zoomToRect = useCallback(
    (
      rect: { x: number; y: number; width: number; height: number },
      viewport: { width: number; height: number }
    ) => {
      const padding = 0.9
      const scaleX = (viewport.width / rect.width) * padding
      const scaleY = (viewport.height / rect.height) * padding
      const nextScale = Math.min(scaleX, scaleY, 8)
      const nextZoom = Math.round(
        Math.min(800, Math.max(5, nextScale * 100))
      )
      const ns = nextZoom / 100
      // Center the rect in the viewport. The doc is centered via flex; pan
      // shifts it from center. We want rect's center in doc coords (rcx, rcy)
      // to map to the viewport center.
      const rcx = rect.x + rect.width / 2
      const rcy = rect.y + rect.height / 2
      // Doc center in doc coords is (DOC_W/2, DOC_H/2) = (600, 400). After
      // scale, rect center sits at (rcx - 600) * ns relative to viewport center.
      // To put it at viewport center, pan must offset that.
      const newPanX = -(rcx - 600) * ns
      const newPanY = -(rcy - 400) * ns
      setZoomState(nextZoom)
      setPanX(newPanX)
      setPanY(newPanY)
    },
    []
  )

  const selectAll = useCallback(() => {
    setSelectedIds(doc.layers.filter((l) => !l.locked).map((l) => l.id))
  }, [doc.layers])

  const alignSelection = useCallback(
    (edge: "left" | "centerX" | "right" | "top" | "centerY" | "bottom") => {
      if (selectedIds.length < 2) return
      apply((ls) => {
        const sel = ls.filter((l) => selectedIds.includes(l.id) && !l.locked)
        if (sel.length < 2) return ls
        const lefts = sel.map((l) => l.x)
        const rights = sel.map((l) => l.x + l.width)
        const tops = sel.map((l) => l.y)
        const bottoms = sel.map((l) => l.y + l.height)
        const minLeft = Math.min(...lefts)
        const maxRight = Math.max(...rights)
        const minTop = Math.min(...tops)
        const maxBottom = Math.max(...bottoms)
        const cx = (minLeft + maxRight) / 2
        const cy = (minTop + maxBottom) / 2
        const idSet = new Set(sel.map((l) => l.id))
        return ls.map((l) => {
          if (!idSet.has(l.id)) return l
          switch (edge) {
            case "left":
              return { ...l, x: Math.round(minLeft) }
            case "right":
              return { ...l, x: Math.round(maxRight - l.width) }
            case "centerX":
              return { ...l, x: Math.round(cx - l.width / 2) }
            case "top":
              return { ...l, y: Math.round(minTop) }
            case "bottom":
              return { ...l, y: Math.round(maxBottom - l.height) }
            case "centerY":
              return { ...l, y: Math.round(cy - l.height / 2) }
          }
        })
      })
    },
    [apply, selectedIds]
  )

  const distributeSelection = useCallback(
    (axis: "horizontal" | "vertical") => {
      if (selectedIds.length < 3) return
      apply((ls) => {
        const sel = ls.filter((l) => selectedIds.includes(l.id) && !l.locked)
        if (sel.length < 3) return ls
        const sorted = [...sel].sort((a, b) =>
          axis === "horizontal" ? a.x - b.x : a.y - b.y
        )
        const first = sorted[0]!
        const last = sorted[sorted.length - 1]!
        if (axis === "horizontal") {
          const totalSpan = last.x + last.width - first.x
          const usedWidth = sorted.reduce((s, l) => s + l.width, 0)
          const gap = (totalSpan - usedWidth) / (sorted.length - 1)
          let cursor = first.x
          const positions = new Map<string, number>()
          for (const l of sorted) {
            positions.set(l.id, Math.round(cursor))
            cursor += l.width + gap
          }
          return ls.map((l) =>
            positions.has(l.id) ? { ...l, x: positions.get(l.id)! } : l
          )
        } else {
          const totalSpan = last.y + last.height - first.y
          const usedHeight = sorted.reduce((s, l) => s + l.height, 0)
          const gap = (totalSpan - usedHeight) / (sorted.length - 1)
          let cursor = first.y
          const positions = new Map<string, number>()
          for (const l of sorted) {
            positions.set(l.id, Math.round(cursor))
            cursor += l.height + gap
          }
          return ls.map((l) =>
            positions.has(l.id) ? { ...l, y: positions.get(l.id)! } : l
          )
        }
      })
    },
    [apply, selectedIds]
  )

  const setDocSettings = useCallback((next: Partial<DocSettings>) => {
    setDocSettingsState((s) => ({ ...s, ...next }))
  }, [])

  const replaceDoc = useCallback(
    (layers: Layer[], settings?: Partial<DocSettings>) => {
      setDoc({ layers, past: [], future: [] })
      setSelectedIds([])
      if (settings) {
        setDocSettingsState((s) => ({ ...s, ...settings }))
      }
    },
    []
  )

  const resetDoc = useCallback(() => {
    setDoc({ layers: initial, past: [], future: [] })
    setDocSettingsState(DEFAULT_DOC_SETTINGS)
    setSelectedIds([])
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY)
      } catch {
        /* ignore */
      }
    }
  }, [])

  const setPref = useCallback(
    <K extends keyof Prefs>(k: K, v: Prefs[K]) => {
      setPrefsState((p) => ({ ...p, [k]: v }))
    },
    []
  )

  const setViewToggle = useCallback(
    <K extends keyof ViewToggles>(k: K, v: boolean) => {
      setViewTogglesState((t) => ({ ...t, [k]: v }))
    },
    []
  )

  const addGroup = useCallback(
    (childIds?: string[]) => {
      const ids = childIds ?? selectedIds
      const groupId = `group-${Date.now()}`
      apply((ls) => {
        if (!ids.length) return ls
        const childSet = new Set(ids)
        const children = ls.filter((l) => childSet.has(l.id))
        if (!children.length) return ls
        const minX = Math.min(...children.map((l) => l.x))
        const minY = Math.min(...children.map((l) => l.y))
        const maxX = Math.max(...children.map((l) => l.x + l.width))
        const maxY = Math.max(...children.map((l) => l.y + l.height))
        const group: Layer = {
          id: groupId,
          name: `Group ${ls.filter((l) => l.kind === "group").length + 1}`,
          kind: "group",
          visible: true,
          locked: false,
          opacity: 100,
          blendMode: "normal",
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          rotation: 0,
        }
        const firstIdx = ls.findIndex((l) => childSet.has(l.id))
        const next: Layer[] = []
        let inserted = false
        for (let i = 0; i < ls.length; i++) {
          const l = ls[i]!
          if (childSet.has(l.id)) {
            if (!inserted) {
              next.push(group)
              inserted = true
            }
            next.push({ ...l, parentId: groupId })
          } else {
            next.push(l)
          }
        }
        if (!inserted) next.splice(firstIdx, 0, group)
        return next
      })
      setSelectedIds([groupId])
      return groupId
    },
    [apply, selectedIds]
  )

  const ungroup = useCallback(
    (groupId: string) => {
      apply((ls) => {
        const idx = ls.findIndex((l) => l.id === groupId)
        if (idx < 0 || ls[idx]!.kind !== "group") return ls
        const next = ls
          .filter((l) => l.id !== groupId)
          .map((l) => (l.parentId === groupId ? { ...l, parentId: undefined } : l))
        return next
      })
      setSelectedIds((cur) => cur.filter((id) => id !== groupId))
    },
    [apply]
  )

  const pushRecent = useCallback((r: Recent) => {
    setRecents((cur) => {
      const filtered = cur.filter((x) => x.name !== r.name)
      return [r, ...filtered].slice(0, RECENTS_LIMIT)
    })
  }, [])

  const clearRecents = useCallback(() => setRecents([]), [])

  const selectedId = selectedIds[0] ?? null

  const value = useMemo<EditorState>(
    () => ({
      tool,
      setTool,
      layers: doc.layers,
      selectedIds,
      selectedId,
      isSelected,
      select,
      selectMany,
      selectAll,
      toggleVisible,
      toggleLocked,
      rename,
      patch,
      patchMany,
      setProp,
      reorder,
      moveTo,
      add,
      duplicate,
      addImage,
      addText,
      addShape,
      addPath,
      updatePathAnchors,
      addRaster,
      getRasterCanvas,
      commitRaster,
      remove,
      nudge,
      alignSelection,
      distributeSelection,
      shapeVariant,
      setShapeVariant,
      brushSize,
      setBrushSize,
      brushColor,
      setBrushColor,
      brushHardness,
      setBrushHardness,
      wandTolerance,
      setWandTolerance,
      pixelMask,
      setPixelMask,
      eraseUnderMask,
      zoom,
      setZoom,
      panX,
      panY,
      setPan,
      resetView,
      zoomToRect,
      cursor,
      setCursor,
      spacePressed,
      setSpacePressed,
      commit,
      undo,
      redo,
      canUndo: doc.past.length > 0,
      canRedo: doc.future.length > 0,
      docSettings,
      setDocSettings,
      replaceDoc,
      resetDoc,
      prefs,
      setPref,
      viewToggles,
      setViewToggle,
      addGroup,
      ungroup,
      recents,
      pushRecent,
      clearRecents,
    }),
    [
      tool,
      doc,
      selectedIds,
      selectedId,
      zoom,
      panX,
      panY,
      cursor,
      spacePressed,
      isSelected,
      select,
      selectMany,
      selectAll,
      toggleVisible,
      toggleLocked,
      rename,
      patch,
      patchMany,
      setProp,
      reorder,
      moveTo,
      add,
      duplicate,
      addImage,
      addText,
      addShape,
      addPath,
      updatePathAnchors,
      addRaster,
      getRasterCanvas,
      commitRaster,
      remove,
      nudge,
      alignSelection,
      distributeSelection,
      shapeVariant,
      setShapeVariant,
      brushSize,
      setBrushSize,
      brushColor,
      setBrushColor,
      brushHardness,
      setBrushHardness,
      wandTolerance,
      setWandTolerance,
      pixelMask,
      setPixelMask,
      eraseUnderMask,
      setZoom,
      setPan,
      resetView,
      zoomToRect,
      commit,
      undo,
      redo,
      docSettings,
      setDocSettings,
      replaceDoc,
      resetDoc,
      prefs,
      setPref,
      viewToggles,
      setViewToggle,
      addGroup,
      ungroup,
      recents,
      pushRecent,
      clearRecents,
    ]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useEditor() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useEditor must be used within EditorProvider")
  return v
}
