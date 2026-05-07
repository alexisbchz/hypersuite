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

import {
  DEFAULT_DOC_SETTINGS,
  DEFAULT_PREFS,
  DEFAULT_VIEW_TOGGLES,
  type DocSettings,
  type Prefs,
  type Recent,
  type ViewToggles,
} from "./doc"
import {
  AUTOSAVE_DELAY_MS,
  RECENTS_LIMIT,
  clearPersistedDoc,
  loadPersistedDoc,
  loadPersistedPrefs,
  loadPersistedRecents,
  savePersistedDoc,
  savePersistedPrefs,
  savePersistedRecents,
} from "./storage"
import {
  anchorsToSvgD,
  pathBoundsFromAnchors,
  pathBoundsUnion,
} from "../lib/geometry"
import type { Anchor, Layer, ShapeVariant, ToolId } from "../lib/types"
import {
  drawImageCover,
  extractUnderMask,
  invertMaskOverlay,
  type PixelMask,
  type WandMaskMode,
  type WandSampleSize,
} from "../canvas/utils"

const HISTORY_LIMIT = 100

export type Tab = { id: string; name: string }

type TabSnapshot = {
  layers: Layer[]
  past: Layer[][]
  future: Layer[][]
  selectedIds: string[]
  docSettings: DocSettings
  zoom: number
  panX: number
  panY: number
}

type DocState = {
  layers: Layer[]
  past: Layer[][]
  future: Layer[][]
}

type SelectOpts = { additive?: boolean; toggle?: boolean }

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
  addText: (opts: {
    x: number
    y: number
    text?: string
    width?: number
    height?: number
    centered?: boolean
  }) => string
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
  wandSampleSize: WandSampleSize
  setWandSampleSize: (v: WandSampleSize) => void
  wandContiguous: boolean
  setWandContiguous: (v: boolean) => void
  wandAntiAlias: boolean
  setWandAntiAlias: (v: boolean) => void
  wandSampleAllLayers: boolean
  setWandSampleAllLayers: (v: boolean) => void
  wandMode: WandMaskMode
  setWandMode: (v: WandMaskMode) => void
  pixelMask: PixelMask | null
  setPixelMask: (m: PixelMask | null) => void
  /** Erase pixels in the active raster layer that fall under the current
   *  pixel mask. Returns true if applied. */
  eraseUnderMask: () => Promise<boolean>
  /** Invert the wand mask (select inverse). */
  invertMask: () => Promise<boolean>
  /** Composite the doc, copy pixels under the mask into a new raster
   *  layer above all others, and clear the mask. Returns the new id. */
  extractMaskToLayer: () => Promise<string | null>

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

  // Tabs (multi-document editing)
  tabs: Tab[]
  activeTabId: string | null
  filename: string
  setFilename: (name: string) => void
  newTab: (opts?: {
    name?: string
    layers?: Layer[]
    docSettings?: Partial<DocSettings>
  }) => string
  switchTab: (id: string) => void
  closeTab: (id: string) => void
  renameTab: (id: string, name: string) => void
  openImageInNewTab: (file: File) => Promise<string | null>

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

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`image load failed: ${src}`))
    img.src = src
  })

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [tool, setTool] = useState<ToolId>("move")
  const [doc, setDoc] = useState<DocState>({
    layers: [],
    past: [],
    future: [],
  })
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [docSettings, setDocSettingsState] =
    useState<DocSettings>(DEFAULT_DOC_SETTINGS)
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS)
  const [viewToggles, setViewTogglesState] =
    useState<ViewToggles>(DEFAULT_VIEW_TOGGLES)
  const [recents, setRecents] = useState<Recent[]>([])
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
  const [wandSampleSize, setWandSampleSize] = useState<WandSampleSize>(1)
  const [wandContiguous, setWandContiguous] = useState(true)
  const [wandAntiAlias, setWandAntiAlias] = useState(true)
  const [wandSampleAllLayers, setWandSampleAllLayers] = useState(true)
  const [wandMode, setWandMode] = useState<WandMaskMode>("new")
  const [pixelMask, setPixelMask] = useState<PixelMask | null>(null)
  const rasterCanvasRef = useRef<Map<string, HTMLCanvasElement>>(new Map())
  const hydratedRef = useRef(false)

  // Multi-tab state. The currently-active tab's data lives in the existing
  // `doc`/`selectedIds`/`docSettings`/`zoom`/`pan*` states above (so all
  // existing logic keeps working). When switching/creating tabs we snapshot
  // the active state into `tabSnapshotsRef` and restore from it on switch.
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const tabSnapshotsRef = useRef<Map<string, TabSnapshot>>(new Map())

  // Hydrate from localStorage once on mount. Synchronous setState in an
  // effect is the React-recommended pattern for syncing with an external
  // store on mount.
  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true
    const saved = loadPersistedDoc()
    if (saved && saved.layers.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDoc({ layers: saved.layers, past: [], future: [] })
      if (saved.settings) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDocSettingsState({ ...DEFAULT_DOC_SETTINGS, ...saved.settings })
      }
      // Reify a tab for the restored autosave so the tab bar reflects it.
      const restoredId = `tab-restored-${Date.now()}`
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTabs([{ id: restoredId, name: "Untitled" }])
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTabId(restoredId)
    }
    const loaded = loadPersistedPrefs()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefsState(loaded.prefs)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setViewTogglesState(loaded.viewToggles)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecents(loadPersistedRecents())
  }, [])

  // Autosave layers + settings (debounced).
  useEffect(() => {
    if (!hydratedRef.current) return
    const t = window.setTimeout(
      () => savePersistedDoc(doc.layers, docSettings),
      AUTOSAVE_DELAY_MS
    )
    return () => window.clearTimeout(t)
  }, [doc.layers, docSettings])

  useEffect(() => {
    if (!hydratedRef.current) return
    savePersistedPrefs(prefs, viewToggles)
  }, [prefs, viewToggles])

  useEffect(() => {
    if (!hydratedRef.current) return
    savePersistedRecents(recents)
  }, [recents])

  const select = useCallback((id: string | null, opts: SelectOpts = {}) => {
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
  }, [])

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
          idSet.has(l.id) && !l.locked ? { ...l, x: l.x + dx, y: l.y + dy } : l
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
    (opts: {
      x: number
      y: number
      text?: string
      width?: number
      height?: number
      centered?: boolean
    }) => {
      const id = `text-${Date.now()}`
      const text = opts.text ?? "Text"
      const fontSize = 48
      const defaultWidth = Math.max(80, text.length * fontSize * 0.5)
      const defaultHeight = Math.round(fontSize * 1.4)
      const width = Math.round(opts.width ?? defaultWidth)
      const height = Math.round(opts.height ?? defaultHeight)
      const centered = opts.centered ?? opts.width === undefined
      const layer: Layer = {
        id,
        name: text.slice(0, 24),
        kind: "text",
        visible: true,
        locked: false,
        opacity: 100,
        blendMode: "normal",
        x: Math.round(centered ? opts.x - width / 2 : opts.x),
        y: Math.round(centered ? opts.y - height / 2 : opts.y),
        width,
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

  const addPath = useCallback(
    (opts: {
      anchors: Anchor[]
      closed: boolean
      strokeWidth?: number
      color?: string
    }) => {
      if (opts.anchors.length < 2) return ""
      const sw = opts.strokeWidth ?? 2
      const bounds = pathBoundsFromAnchors(opts.anchors, sw + 4)
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
        const bounds = pathBoundsUnion(
          anchors,
          { x: l.x, y: l.y, width: l.width, height: l.height },
          sw + 4
        )
        return {
          ...l,
          anchors,
          path: anchorsToSvgD(anchors, l.pathClosed ?? false, bounds),
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
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
    // Pick a target layer: prefer the explicit selection, otherwise fall
    // back to the only image/raster layer (the common "open as new doc"
    // flow has exactly one layer and the user shouldn't have to click it
    // before hitting Delete).
    let sel = doc.layers.find((l) => l.id === selectedIds[0])
    if (!sel || (sel.kind !== "raster" && sel.kind !== "image")) {
      const candidates = doc.layers.filter(
        (l) => (l.kind === "raster" || l.kind === "image") && !l.locked
      )
      sel = candidates.length === 1 ? candidates[0] : undefined
    }
    if (!sel) return false
    if (sel.kind !== "raster" && sel.kind !== "image") return false

    let canvas = rasterCanvasRef.current.get(sel.id)
    const isImage = sel.kind === "image"
    // Image layers aren't directly editable — Photoshop calls this "Layer
    // from Background". We rasterize on demand so Delete-erases-selection
    // works on the very first wand pass without a manual conversion step.
    if (isImage) {
      if (!sel.src) return false
      if (!canvas) {
        canvas = document.createElement("canvas")
        rasterCanvasRef.current.set(sel.id, canvas)
      }
      canvas.width = sel.width
      canvas.height = sel.height
      const c2 = canvas.getContext("2d")
      if (!c2) return false
      try {
        const srcImg = await loadImage(sel.src)
        drawImageCover(c2, srcImg, 0, 0, sel.width, sel.height)
      } catch {
        return false
      }
    }
    if (!canvas || canvas.width === 0) return false
    const ctx = canvas.getContext("2d")
    if (!ctx) return false

    const mask = await loadImage(pixelMask.dataUrl)
    const safeToDataURL = () => {
      try {
        return canvas!.toDataURL("image/png")
      } catch {
        return null
      }
    }
    const pre = isImage ? null : safeToDataURL()
    ctx.save()
    ctx.globalCompositeOperation = "destination-out"
    // Mask is in doc coords; layer canvas is in layer-local coords.
    // Translate by -layer origin so the mask aligns over the right pixels
    // (works for partial-coverage layers as well as the common full-doc
    // case where the offset is zero).
    ctx.drawImage(
      mask,
      -sel.x,
      -sel.y,
      docSettings.width,
      docSettings.height
    )
    ctx.restore()
    const post = safeToDataURL()
    ;(canvas as unknown as { __applied?: string }).__applied = post ?? ""

    const targetId = sel.id
    const layerW = sel.width
    const layerH = sel.height
    setDoc((d) => {
      const pastLayers = isImage
        ? d.layers
        : d.layers.map((l) =>
            l.id === targetId ? { ...l, rasterDataUrl: pre } : l
          )
      const nextLayers = d.layers.map((l) => {
        if (l.id !== targetId) return l
        if (isImage) {
          return {
            ...l,
            kind: "raster" as const,
            src: undefined,
            rasterDataUrl: post,
            rasterWidth: layerW,
            rasterHeight: layerH,
          }
        }
        return { ...l, rasterDataUrl: post }
      })
      return {
        layers: nextLayers,
        past: [...d.past, pastLayers].slice(-HISTORY_LIMIT),
        future: [],
      }
    })
    setSelectedIds([targetId])
    setPixelMask(null)
    return true
  }, [pixelMask, selectedIds, doc.layers, docSettings])

  const invertMask = useCallback(async () => {
    if (!pixelMask) return false
    const next = await invertMaskOverlay(pixelMask)
    if (!next) return false
    setPixelMask(next)
    return true
  }, [pixelMask])

  const extractMaskToLayer = useCallback(async () => {
    if (!pixelMask) return null
    const w = docSettings.width
    const h = docSettings.height
    const dataUrl = await extractUnderMask(
      doc.layers,
      getRasterCanvas,
      pixelMask,
      w,
      h
    )
    if (!dataUrl) return null
    const id = `raster-${Date.now()}`
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    rasterCanvasRef.current.set(id, canvas)
    // Pre-paint the canvas so subsequent strokes work without a re-load.
    const cctx = canvas.getContext("2d")
    if (cctx) {
      try {
        const img = await loadImage(dataUrl)
        cctx.drawImage(img, 0, 0, w, h)
      } catch {
        // ignore — rasterDataUrl will still hydrate it on next render
      }
    }
    const layer: Layer = {
      id,
      name: "Extract",
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
      rasterDataUrl: dataUrl,
      rasterWidth: w,
      rasterHeight: h,
    }
    apply((ls) => [layer, ...ls])
    setSelectedIds([id])
    setPixelMask(null)
    return id
  }, [apply, doc.layers, docSettings.height, docSettings.width, getRasterCanvas, pixelMask])

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
      const img = await loadImage(src)
      const max = opts.maxSize ?? 600
      const ratio = Math.min(
        1,
        max / Math.max(img.naturalWidth, img.naturalHeight)
      )
      const width = Math.round(img.naturalWidth * ratio)
      const height = Math.round(img.naturalHeight * ratio)
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
    // Keep zoom as a float so wheel zoom is smooth — small fractional
    // deltas (~0.3%) need to land in state to actually move the canvas.
    // Display sites round when rendering the percentage label.
    setZoomState(Math.min(800, Math.max(5, z)))
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
      const nextZoom = Math.round(Math.min(800, Math.max(5, nextScale * 100)))
      const ns = nextZoom / 100
      // Center the rect in the viewport. The doc is centered via flex; pan
      // shifts it from center. Doc center in doc coords is (600, 400).
      const rcx = rect.x + rect.width / 2
      const rcy = rect.y + rect.height / 2
      setZoomState(nextZoom)
      setPanX(-(rcx - 600) * ns)
      setPanY(-(rcy - 400) * ns)
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
        const minLeft = Math.min(...sel.map((l) => l.x))
        const maxRight = Math.max(...sel.map((l) => l.x + l.width))
        const minTop = Math.min(...sel.map((l) => l.y))
        const maxBottom = Math.max(...sel.map((l) => l.y + l.height))
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
        const horiz = axis === "horizontal"
        const sorted = [...sel].sort((a, b) => (horiz ? a.x - b.x : a.y - b.y))
        const first = sorted[0]!
        const last = sorted[sorted.length - 1]!
        const startPos = horiz ? first.x : first.y
        const endPos = horiz ? last.x + last.width : last.y + last.height
        const used = sorted.reduce(
          (s, l) => s + (horiz ? l.width : l.height),
          0
        )
        const gap = (endPos - startPos - used) / (sorted.length - 1)
        const positions = new Map<string, number>()
        let cursor = startPos
        for (const l of sorted) {
          positions.set(l.id, Math.round(cursor))
          cursor += (horiz ? l.width : l.height) + gap
        }
        return ls.map((l) => {
          const p = positions.get(l.id)
          if (p === undefined) return l
          return horiz ? { ...l, x: p } : { ...l, y: p }
        })
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
    setDoc({ layers: [], past: [], future: [] })
    setDocSettingsState(DEFAULT_DOC_SETTINGS)
    setSelectedIds([])
    clearPersistedDoc()
  }, [])

  // ---- Tabs ----

  const captureSnapshot = useCallback((): TabSnapshot => {
    return {
      layers: doc.layers,
      past: doc.past,
      future: doc.future,
      selectedIds,
      docSettings,
      zoom,
      panX,
      panY,
    }
  }, [doc, selectedIds, docSettings, zoom, panX, panY])

  const applySnapshot = useCallback((snap: TabSnapshot | undefined) => {
    if (snap) {
      setDoc({ layers: snap.layers, past: snap.past, future: snap.future })
      setSelectedIds(snap.selectedIds)
      setDocSettingsState(snap.docSettings)
      setZoomState(snap.zoom)
      setPanX(snap.panX)
      setPanY(snap.panY)
    } else {
      setDoc({ layers: [], past: [], future: [] })
      setSelectedIds([])
      setDocSettingsState(DEFAULT_DOC_SETTINGS)
      setZoomState(75)
      setPanX(0)
      setPanY(0)
    }
  }, [])

  const filename = useMemo(() => {
    if (!activeTabId) return "Untitled"
    return tabs.find((t) => t.id === activeTabId)?.name ?? "Untitled"
  }, [tabs, activeTabId])

  const setFilename = useCallback(
    (name: string) => {
      if (!activeTabId) return
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, name } : t))
      )
    },
    [activeTabId]
  )

  const newTab = useCallback(
    (opts?: {
      name?: string
      layers?: Layer[]
      docSettings?: Partial<DocSettings>
    }) => {
      // Snapshot current active tab before swapping.
      if (activeTabId) {
        tabSnapshotsRef.current.set(activeTabId, captureSnapshot())
      }
      const id = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const name = opts?.name ?? "Untitled"
      setTabs((prev) => [...prev, { id, name }])
      setActiveTabId(id)
      // Reset live state to the new tab's contents.
      setDoc({ layers: opts?.layers ?? [], past: [], future: [] })
      setSelectedIds([])
      setDocSettingsState({
        ...DEFAULT_DOC_SETTINGS,
        ...(opts?.docSettings ?? {}),
      })
      setZoomState(75)
      setPanX(0)
      setPanY(0)
      return id
    },
    [activeTabId, captureSnapshot]
  )

  const switchTab = useCallback(
    (id: string) => {
      if (id === activeTabId) return
      if (activeTabId) {
        tabSnapshotsRef.current.set(activeTabId, captureSnapshot())
      }
      const snap = tabSnapshotsRef.current.get(id)
      applySnapshot(snap)
      setActiveTabId(id)
    },
    [activeTabId, captureSnapshot, applySnapshot]
  )

  const closeTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        const idx = prev.findIndex((t) => t.id === id)
        if (idx < 0) return prev
        const next = prev.filter((t) => t.id !== id)
        if (id === activeTabId) {
          // Pick a neighbor to activate. Prefer the one to the right.
          const neighbor = next[idx] ?? next[idx - 1] ?? null
          if (neighbor) {
            const snap = tabSnapshotsRef.current.get(neighbor.id)
            applySnapshot(snap)
            setActiveTabId(neighbor.id)
          } else {
            applySnapshot(undefined)
            setActiveTabId(null)
          }
        }
        tabSnapshotsRef.current.delete(id)
        return next
      })
    },
    [activeTabId, applySnapshot]
  )

  const renameTab = useCallback((id: string, name: string) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)))
  }, [])

  /** Open an image file as its own tab — the doc is sized to the image's
   *  natural pixel dimensions and the image fills the canvas exactly. This
   *  is the Photoshop/Photopea "open as new document" flow and avoids the
   *  downscale → soft export problem entirely. If the active tab is empty
   *  (welcome state), replaces its content instead of stacking a new tab. */
  const openImageInNewTab = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return null
      const src = URL.createObjectURL(file)
      const img = await loadImage(src)
      const w = img.naturalWidth
      const h = img.naturalHeight
      const id = `img-${Date.now()}`
      const baseName = file.name.replace(/\.[^.]+$/, "") || "Image"
      const layer: Layer = {
        id,
        name: baseName,
        kind: "image",
        visible: true,
        locked: false,
        opacity: 100,
        blendMode: "normal",
        x: 0,
        y: 0,
        width: w,
        height: h,
        rotation: 0,
        src,
      }
      // If the active tab is currently empty (welcome state), absorb the
      // image into it rather than spawning yet another tab.
      if (activeTabId && doc.layers.length === 0) {
        setDoc({ layers: [layer], past: [], future: [] })
        setDocSettingsState({
          ...DEFAULT_DOC_SETTINGS,
          width: w,
          height: h,
          background: "transparent",
        })
        setSelectedIds([id])
        setZoomState(75)
        setPanX(0)
        setPanY(0)
        setTabs((prev) =>
          prev.map((t) => (t.id === activeTabId ? { ...t, name: baseName } : t))
        )
        return id
      }
      newTab({
        name: baseName,
        layers: [layer],
        docSettings: { width: w, height: h, background: "transparent" },
      })
      // newTab resets selection — re-select the image so it's immediately
      // editable.
      setSelectedIds([id])
      return id
    },
    [newTab, activeTabId, doc.layers]
  )

  const setPref = useCallback(<K extends keyof Prefs>(k: K, v: Prefs[K]) => {
    setPrefsState((p) => ({ ...p, [k]: v }))
  }, [])

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
        const next: Layer[] = []
        let inserted = false
        for (const l of ls) {
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
        return ls
          .filter((l) => l.id !== groupId)
          .map((l) =>
            l.parentId === groupId ? { ...l, parentId: undefined } : l
          )
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
      wandSampleSize,
      setWandSampleSize,
      wandContiguous,
      setWandContiguous,
      wandAntiAlias,
      setWandAntiAlias,
      wandSampleAllLayers,
      setWandSampleAllLayers,
      wandMode,
      setWandMode,
      pixelMask,
      setPixelMask,
      eraseUnderMask,
      invertMask,
      extractMaskToLayer,
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
      tabs,
      activeTabId,
      filename,
      setFilename,
      newTab,
      switchTab,
      closeTab,
      renameTab,
      openImageInNewTab,
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
      brushSize,
      brushColor,
      brushHardness,
      wandTolerance,
      wandSampleSize,
      wandContiguous,
      wandAntiAlias,
      wandSampleAllLayers,
      wandMode,
      pixelMask,
      eraseUnderMask,
      invertMask,
      extractMaskToLayer,
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
      tabs,
      activeTabId,
      filename,
      setFilename,
      newTab,
      switchTab,
      closeTab,
      renameTab,
      openImageInNewTab,
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
