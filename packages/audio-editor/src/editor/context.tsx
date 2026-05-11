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
  ensureRunning,
  getEngine,
  scheduleGraph,
  setMasterGain as setEngineMasterGain,
} from "../lib/audio-graph"
import { clampClipFade, projectDuration } from "../lib/geometry"
import type {
  Clip,
  ClipboardEntry,
  Project,
  Selection,
  ToolId,
  Track,
  WaveformPeaks,
} from "../lib/types"
import { computePeaks, decodeBlobToAudioBuffer } from "../lib/waveform"

import {
  DEFAULT_PREFS,
  HISTORY_LIMIT,
  PX_PER_SEC_MAX,
  PX_PER_SEC_MIN,
  makeDefaultProject,
  makeDefaultTrack,
  type Prefs,
} from "./doc"
import {
  AUTOSAVE_DELAY_MS,
  deleteBlob,
  getBlob,
  loadPersistedPrefs,
  loadPersistedProject,
  pruneOrphanBlobs,
  putBlob,
  savePersistedPrefs,
  savePersistedProject,
} from "./storage"

type DocState = {
  tracks: Track[]
  clips: Clip[]
  past: { tracks: Track[]; clips: Clip[] }[]
  future: { tracks: Track[]; clips: Clip[] }[]
}

export type EditorState = {
  // project meta
  projectName: string
  setProjectName: (name: string) => void
  sampleRate: number
  bitDepth: 16 | 24 | 32
  setBitDepth: (b: 16 | 24 | 32) => void

  // doc
  tracks: Track[]
  clips: Clip[]
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void

  // tracks
  addTrack: () => Track
  removeTrack: (id: string) => void
  renameTrack: (id: string, name: string) => void
  setTrackMuted: (id: string, muted: boolean) => void
  setTrackSoloed: (id: string, soloed: boolean) => void
  setTrackGain: (id: string, db: number) => void
  setTrackPan: (id: string, pan: number) => void
  reorderTrack: (id: string, toIndex: number) => void
  setTrackHeight: (id: string, height: number) => void

  // clips
  addClip: (
    blob: Blob,
    trackId: string,
    startSec: number,
    name?: string
  ) => Promise<Clip | null>
  moveClip: (id: string, toStartSec: number, toTrackId?: string) => void
  trimClip: (id: string, side: "left" | "right", deltaSec: number) => void
  splitClipAt: (id: string, timeSec: number) => void
  deleteClips: (ids: string[]) => void
  setClipGain: (id: string, db: number) => void
  setClipFade: (id: string, fadeIn?: number, fadeOut?: number) => void
  renameClip: (id: string, name: string) => void
  duplicateClips: (ids: string[]) => void

  // clipboard
  copy: (ids?: string[]) => void
  cut: (ids?: string[]) => void
  paste: () => void
  clipboardSize: number

  // selection / view / tool
  tool: ToolId
  setTool: (t: ToolId) => void
  selection: Selection
  setSelection: (s: Selection) => void
  selectClip: (id: string, additive?: boolean) => void
  clearSelection: () => void

  pxPerSec: number
  setPxPerSec: (px: number) => void
  zoomBy: (factor: number, anchorSec?: number) => void
  scrollX: number
  setScrollX: (x: number) => void

  playhead: number
  setPlayhead: (t: number) => void
  playing: boolean
  play: () => void
  pause: () => void
  stop: () => void
  toggleTransport: () => void

  masterGainDb: number
  setMasterGainDb: (db: number) => void

  // buffers / peaks (read-only views)
  getBuffer: (bufferRef: string) => AudioBuffer | undefined
  getPeaks: (bufferRef: string) => WaveformPeaks | undefined
  getBlob: (bufferRef: string) => Blob | undefined

  // tts bridge
  insertTtsClip: (blob: Blob, prompt: string) => Promise<Clip | null>

  // prefs
  prefs: Prefs
  setPrefs: (p: Prefs) => void

  // dialogs
  ttsDialogOpen: boolean
  setTtsDialogOpen: (v: boolean) => void
  exportDialogOpen: boolean
  setExportDialogOpen: (v: boolean) => void
  shortcutsDialogOpen: boolean
  setShortcutsDialogOpen: (v: boolean) => void

  hovered: { time: number; trackId: string | null } | null
  setHovered: (h: { time: number; trackId: string | null } | null) => void
}

const Ctx = createContext<EditorState | null>(null)

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const initialProject = useMemo(() => makeDefaultProject(), [])

  const [projectId, setProjectId] = useState(initialProject.id)
  const [projectName, setProjectName] = useState(initialProject.name)
  const [sampleRate] = useState(initialProject.sampleRate)
  const [bitDepth, setBitDepth] = useState<16 | 24 | 32>(
    initialProject.bitDepth
  )

  const [doc, setDoc] = useState<DocState>({
    tracks: initialProject.tracks,
    clips: initialProject.clips,
    past: [],
    future: [],
  })

  const [tool, setTool] = useState<ToolId>("select")
  const [selection, setSelection] = useState<Selection>(null)
  const [pxPerSec, setPxPerSecState] = useState(initialProject.pxPerSec)
  const [scrollX, setScrollX] = useState(initialProject.scrollX)
  const [playhead, setPlayheadState] = useState(initialProject.playhead)
  const [playing, setPlaying] = useState(false)
  const [masterGainDb, setMasterGainDbState] = useState(
    initialProject.masterGainDb
  )

  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS)
  const [ttsDialogOpen, setTtsDialogOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false)
  const [hovered, setHovered] = useState<{
    time: number
    trackId: string | null
  } | null>(null)

  const [clipboard, setClipboard] = useState<ClipboardEntry[]>([])

  // Audio buffer caches (in-memory)
  const blobsRef = useRef<Map<string, Blob>>(new Map())
  const buffersRef = useRef<Map<string, AudioBuffer>>(new Map())
  const peaksRef = useRef<Map<string, WaveformPeaks>>(new Map())
  const [bufferTick, setBufferTick] = useState(0)
  const bumpBuffers = () => setBufferTick((x) => x + 1)

  const hydratedRef = useRef(false)
  const playbackRef = useRef<{
    handle: ReturnType<typeof scheduleGraph>
    startedAt: number
    fromTime: number
    raf: number | null
  } | null>(null)

  // ---- history primitives ----
  const apply = useCallback(
    (
      updater: (s: { tracks: Track[]; clips: Clip[] }) => {
        tracks: Track[]
        clips: Clip[]
      }
    ) => {
      setDoc((d) => {
        const next = updater({ tracks: d.tracks, clips: d.clips })
        if (next.tracks === d.tracks && next.clips === d.clips) return d
        return {
          tracks: next.tracks,
          clips: next.clips,
          past: [...d.past, { tracks: d.tracks, clips: d.clips }].slice(
            -HISTORY_LIMIT
          ),
          future: [],
        }
      })
    },
    []
  )

  const undo = useCallback(() => {
    setDoc((d) => {
      if (!d.past.length) return d
      const prev = d.past[d.past.length - 1]!
      return {
        tracks: prev.tracks,
        clips: prev.clips,
        past: d.past.slice(0, -1),
        future: [{ tracks: d.tracks, clips: d.clips }, ...d.future].slice(
          0,
          HISTORY_LIMIT
        ),
      }
    })
  }, [])

  const redo = useCallback(() => {
    setDoc((d) => {
      if (!d.future.length) return d
      const nxt = d.future[0]!
      return {
        tracks: nxt.tracks,
        clips: nxt.clips,
        past: [...d.past, { tracks: d.tracks, clips: d.clips }].slice(
          -HISTORY_LIMIT
        ),
        future: d.future.slice(1),
      }
    })
  }, [])

  // ---- track ops ----
  const addTrack = useCallback((): Track => {
    const newTrack = makeDefaultTrack(doc.tracks.length)
    apply((s) => ({ tracks: [...s.tracks, newTrack], clips: s.clips }))
    return newTrack
  }, [apply, doc.tracks.length])

  const removeTrack = useCallback(
    (id: string) => {
      apply((s) => ({
        tracks: s.tracks.filter((t) => t.id !== id),
        clips: s.clips.filter((c) => c.trackId !== id),
      }))
    },
    [apply]
  )

  const renameTrack = useCallback(
    (id: string, name: string) => {
      apply((s) => ({
        tracks: s.tracks.map((t) => (t.id === id ? { ...t, name } : t)),
        clips: s.clips,
      }))
    },
    [apply]
  )

  const setTrackMuted = useCallback(
    (id: string, muted: boolean) => {
      apply((s) => ({
        tracks: s.tracks.map((t) => (t.id === id ? { ...t, muted } : t)),
        clips: s.clips,
      }))
    },
    [apply]
  )

  const setTrackSoloed = useCallback(
    (id: string, soloed: boolean) => {
      apply((s) => ({
        tracks: s.tracks.map((t) => (t.id === id ? { ...t, soloed } : t)),
        clips: s.clips,
      }))
    },
    [apply]
  )

  const setTrackGain = useCallback(
    (id: string, db: number) => {
      apply((s) => ({
        tracks: s.tracks.map((t) => (t.id === id ? { ...t, gainDb: db } : t)),
        clips: s.clips,
      }))
    },
    [apply]
  )

  const setTrackPan = useCallback(
    (id: string, pan: number) => {
      apply((s) => ({
        tracks: s.tracks.map((t) => (t.id === id ? { ...t, pan } : t)),
        clips: s.clips,
      }))
    },
    [apply]
  )

  const reorderTrack = useCallback(
    (id: string, toIndex: number) => {
      apply((s) => {
        const idx = s.tracks.findIndex((t) => t.id === id)
        if (idx < 0) return s
        const next = [...s.tracks]
        const [item] = next.splice(idx, 1)
        next.splice(Math.max(0, Math.min(next.length, toIndex)), 0, item!)
        return { tracks: next, clips: s.clips }
      })
    },
    [apply]
  )

  const setTrackHeight = useCallback(
    (id: string, height: number) => {
      apply((s) => ({
        tracks: s.tracks.map((t) =>
          t.id === id
            ? { ...t, height: Math.max(48, Math.min(320, height)) }
            : t
        ),
        clips: s.clips,
      }))
    },
    [apply]
  )

  // ---- clip ops ----
  const cacheBuffer = useCallback(
    async (bufferRef: string, blob: Blob): Promise<AudioBuffer | null> => {
      blobsRef.current.set(bufferRef, blob)
      try {
        const { context } = getEngine()
        const buf = await decodeBlobToAudioBuffer(context, blob)
        buffersRef.current.set(bufferRef, buf)
        peaksRef.current.set(bufferRef, computePeaks(buf))
        bumpBuffers()
        return buf
      } catch (err) {
        console.error("decode failed", err)
        return null
      }
    },
    []
  )

  const addClip = useCallback(
    async (
      blob: Blob,
      trackId: string,
      startSec: number,
      name?: string
    ): Promise<Clip | null> => {
      const bufferRef = crypto.randomUUID()
      // Persist blob first.
      try {
        await putBlob(bufferRef, blob)
      } catch {}
      const buf = await cacheBuffer(bufferRef, blob)
      if (!buf) return null

      const clip: Clip = {
        id: crypto.randomUUID(),
        trackId,
        name: name ?? "Clip",
        bufferRef,
        start: Math.max(0, startSec),
        offset: 0,
        duration: buf.duration,
        gainDb: 0,
        fadeInSec: 0,
        fadeOutSec: 0,
      }
      apply((s) => ({ tracks: s.tracks, clips: [...s.clips, clip] }))
      return clip
    },
    [apply, cacheBuffer]
  )

  const moveClip = useCallback(
    (id: string, toStartSec: number, toTrackId?: string) => {
      apply((s) => ({
        tracks: s.tracks,
        clips: s.clips.map((c) =>
          c.id === id
            ? {
                ...c,
                start: Math.max(0, toStartSec),
                trackId: toTrackId ?? c.trackId,
              }
            : c
        ),
      }))
    },
    [apply]
  )

  const trimClip = useCallback(
    (id: string, side: "left" | "right", deltaSec: number) => {
      apply((s) => ({
        tracks: s.tracks,
        clips: s.clips.map((c) => {
          if (c.id !== id) return c
          if (side === "left") {
            const buf = buffersRef.current.get(c.bufferRef)
            const maxLeft = Math.min(c.duration - 0.05, c.duration - 0)
            const dl = Math.max(-c.offset, Math.min(maxLeft, deltaSec))
            const newOffset = Math.max(0, c.offset + dl)
            const newDuration = Math.max(0.05, c.duration - dl)
            const newStart = Math.max(0, c.start + dl)
            return clampClipFade({
              ...c,
              offset: newOffset,
              duration: newDuration,
              start: newStart,
            })
          } else {
            const buf = buffersRef.current.get(c.bufferRef)
            const maxRight = buf
              ? buf.duration - c.offset - c.duration
              : Infinity
            const dr = Math.max(
              -(c.duration - 0.05),
              Math.min(maxRight, deltaSec)
            )
            return clampClipFade({
              ...c,
              duration: Math.max(0.05, c.duration + dr),
            })
          }
        }),
      }))
    },
    [apply]
  )

  const splitClipAt = useCallback(
    (id: string, timeSec: number) => {
      apply((s) => {
        const c = s.clips.find((x) => x.id === id)
        if (!c) return s
        if (timeSec <= c.start + 0.01 || timeSec >= c.start + c.duration - 0.01)
          return s
        const splitOffset = timeSec - c.start
        const left: Clip = {
          ...c,
          duration: splitOffset,
          fadeOutSec: 0,
        }
        const right: Clip = {
          ...c,
          id: crypto.randomUUID(),
          start: c.start + splitOffset,
          offset: c.offset + splitOffset,
          duration: c.duration - splitOffset,
          fadeInSec: 0,
        }
        const next = s.clips.flatMap((x) =>
          x.id === id ? [clampClipFade(left), clampClipFade(right)] : [x]
        )
        return { tracks: s.tracks, clips: next }
      })
    },
    [apply]
  )

  const deleteClips = useCallback(
    (ids: string[]) => {
      const set = new Set(ids)
      apply((s) => ({
        tracks: s.tracks,
        clips: s.clips.filter((c) => !set.has(c.id)),
      }))
    },
    [apply]
  )

  const setClipGain = useCallback(
    (id: string, db: number) => {
      apply((s) => ({
        tracks: s.tracks,
        clips: s.clips.map((c) =>
          c.id === id ? { ...c, gainDb: Math.max(-60, Math.min(12, db)) } : c
        ),
      }))
    },
    [apply]
  )

  const setClipFade = useCallback(
    (id: string, fadeIn?: number, fadeOut?: number) => {
      apply((s) => ({
        tracks: s.tracks,
        clips: s.clips.map((c) => {
          if (c.id !== id) return c
          return clampClipFade({
            ...c,
            fadeInSec: fadeIn ?? c.fadeInSec,
            fadeOutSec: fadeOut ?? c.fadeOutSec,
          })
        }),
      }))
    },
    [apply]
  )

  const renameClip = useCallback(
    (id: string, name: string) => {
      apply((s) => ({
        tracks: s.tracks,
        clips: s.clips.map((c) => (c.id === id ? { ...c, name } : c)),
      }))
    },
    [apply]
  )

  const duplicateClips = useCallback(
    (ids: string[]) => {
      apply((s) => {
        const set = new Set(ids)
        const dups = s.clips
          .filter((c) => set.has(c.id))
          .map((c) => ({
            ...c,
            id: crypto.randomUUID(),
            start: c.start + c.duration,
          }))
        return { tracks: s.tracks, clips: [...s.clips, ...dups] }
      })
    },
    [apply]
  )

  // ---- clipboard ----
  const copy = useCallback(
    (ids?: string[]) => {
      const targetIds = (
        ids ?? (selection?.kind === "clips" ? selection.clipIds : [])
      ).filter(Boolean)
      const set = new Set(targetIds)
      const entries: ClipboardEntry[] = []
      for (const c of doc.clips) {
        if (!set.has(c.id)) continue
        const blob = blobsRef.current.get(c.bufferRef)
        if (!blob) continue
        const { id: _id, trackId: _tid, start: _start, ...rest } = c
        entries.push({ clip: rest, blob })
      }
      if (entries.length) setClipboard(entries)
    },
    [doc.clips, selection]
  )

  const cut = useCallback(
    (ids?: string[]) => {
      const targetIds =
        ids ?? (selection?.kind === "clips" ? selection.clipIds : [])
      copy(targetIds)
      deleteClips(targetIds)
    },
    [copy, deleteClips, selection]
  )

  const paste = useCallback(() => {
    if (!clipboard.length) return
    const baseTrack = doc.tracks[0]?.id
    if (!baseTrack) return
    let cursor = playhead
    void Promise.all(
      clipboard.map(async (entry) => {
        const c = await addClip(entry.blob, baseTrack, cursor, entry.clip.name)
        if (c) cursor += c.duration
      })
    )
  }, [addClip, clipboard, doc.tracks, playhead])

  // ---- selection ----
  const selectClip = useCallback((id: string, additive = false) => {
    setSelection((prev) => {
      const cur = prev?.kind === "clips" ? prev.clipIds : []
      if (additive) {
        const set = new Set(cur)
        if (set.has(id)) set.delete(id)
        else set.add(id)
        const arr = [...set]
        return arr.length ? { kind: "clips", clipIds: arr } : null
      }
      return { kind: "clips", clipIds: [id] }
    })
  }, [])

  const clearSelection = useCallback(() => setSelection(null), [])

  // ---- view / zoom ----
  const setPxPerSec = useCallback((px: number) => {
    setPxPerSecState(Math.max(PX_PER_SEC_MIN, Math.min(PX_PER_SEC_MAX, px)))
  }, [])

  const zoomBy = useCallback((factor: number) => {
    setPxPerSecState((p) =>
      Math.max(PX_PER_SEC_MIN, Math.min(PX_PER_SEC_MAX, p * factor))
    )
  }, [])

  const setPlayhead = useCallback((t: number) => {
    setPlayheadState(Math.max(0, t))
  }, [])

  // ---- transport ----
  const stopPlayback = useCallback(() => {
    if (!playbackRef.current) return
    playbackRef.current.handle.stop()
    if (playbackRef.current.raf !== null)
      cancelAnimationFrame(playbackRef.current.raf)
    playbackRef.current = null
    setPlaying(false)
  }, [])

  const play = useCallback(async () => {
    if (playing) return
    await ensureRunning()
    const { context, master } = getEngine()
    const handle = scheduleGraph({
      context,
      destination: master,
      tracks: doc.tracks,
      clips: doc.clips,
      buffers: buffersRef.current,
      startTimeSec: playhead,
      contextStart: context.currentTime + 0.05,
    })
    if (handle.duration <= 0) {
      handle.stop()
      return
    }
    playbackRef.current = {
      handle,
      startedAt: context.currentTime + 0.05,
      fromTime: playhead,
      raf: null,
    }
    setPlaying(true)

    const tick = () => {
      const pb = playbackRef.current
      if (!pb) return
      const elapsed = context.currentTime - pb.startedAt
      const t = pb.fromTime + Math.max(0, elapsed)
      setPlayheadState(t)
      if (elapsed >= pb.handle.duration) {
        stopPlayback()
        setPlayheadState(pb.fromTime + pb.handle.duration)
        return
      }
      pb.raf = requestAnimationFrame(tick)
    }
    playbackRef.current.raf = requestAnimationFrame(tick)
  }, [doc.clips, doc.tracks, playhead, playing, stopPlayback])

  const pause = useCallback(() => {
    stopPlayback()
  }, [stopPlayback])

  const stop = useCallback(() => {
    stopPlayback()
    setPlayheadState(0)
  }, [stopPlayback])

  const toggleTransport = useCallback(() => {
    if (playing) pause()
    else void play()
  }, [pause, play, playing])

  const setMasterGainDb = useCallback((db: number) => {
    setMasterGainDbState(db)
    setEngineMasterGain(db)
  }, [])

  // ---- buffer accessors ----
  const getBuffer = useCallback(
    (ref: string) => {
      void bufferTick
      return buffersRef.current.get(ref)
    },
    [bufferTick]
  )
  const getPeaks = useCallback(
    (ref: string) => {
      void bufferTick
      return peaksRef.current.get(ref)
    },
    [bufferTick]
  )
  const getBlobLocal = useCallback((ref: string) => {
    return blobsRef.current.get(ref)
  }, [])

  // ---- TTS bridge ----
  const insertTtsClip = useCallback(
    async (blob: Blob, prompt: string) => {
      const trackId = doc.tracks[0]?.id ?? addTrack().id
      const name = prompt.trim().replace(/\s+/g, " ").slice(0, 40) || "Speech"
      return addClip(blob, trackId, playhead, name)
    },
    [addClip, addTrack, doc.tracks, playhead]
  )

  // ---- prefs persistence ----
  const setPrefs = useCallback((p: Prefs) => setPrefsState(p), [])

  // ---- hydrate from storage on mount ----
  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true
    const saved = loadPersistedProject()
    if (saved) {
      setProjectId(saved.id)
      setProjectName(saved.name)
      setBitDepth(saved.bitDepth)
      setDoc({
        tracks: saved.tracks,
        clips: saved.clips,
        past: [],
        future: [],
      })
      setPxPerSecState(saved.pxPerSec)
      setScrollX(saved.scrollX)
      setMasterGainDbState(saved.masterGainDb)
      // hydrate blobs from IDB
      void (async () => {
        for (const c of saved.clips) {
          if (buffersRef.current.has(c.bufferRef)) continue
          const b = await getBlob(c.bufferRef)
          if (b) await cacheBuffer(c.bufferRef, b)
        }
      })()
    }
    setPrefsState(loadPersistedPrefs())
  }, [cacheBuffer])

  // ---- autosave (debounced) ----
  useEffect(() => {
    if (!hydratedRef.current) return
    const t = window.setTimeout(() => {
      const proj: Project = {
        id: projectId,
        name: projectName,
        sampleRate,
        bitDepth,
        tracks: doc.tracks,
        clips: doc.clips,
        pxPerSec,
        scrollX,
        playhead,
        selection: null,
        masterGainDb,
        loop: null,
      }
      savePersistedProject(proj)
    }, AUTOSAVE_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [
    bitDepth,
    doc.clips,
    doc.tracks,
    masterGainDb,
    playhead,
    projectId,
    projectName,
    pxPerSec,
    sampleRate,
    scrollX,
  ])

  useEffect(() => {
    if (!hydratedRef.current) return
    savePersistedPrefs(prefs)
  }, [prefs])

  // Prune orphaned blobs whenever clip set changes (debounced via effect deps).
  useEffect(() => {
    if (!hydratedRef.current) return
    const t = window.setTimeout(() => {
      const used = new Set(doc.clips.map((c) => c.bufferRef))
      void pruneOrphanBlobs(used)
    }, 4000)
    return () => window.clearTimeout(t)
  }, [doc.clips])

  // Apply master gain to engine
  useEffect(() => {
    setEngineMasterGain(masterGainDb)
  }, [masterGainDb])

  // Cleanup playback on unmount
  useEffect(() => {
    return () => stopPlayback()
  }, [stopPlayback])

  const value = useMemo<EditorState>(
    () => ({
      projectName,
      setProjectName,
      sampleRate,
      bitDepth,
      setBitDepth,

      tracks: doc.tracks,
      clips: doc.clips,
      canUndo: doc.past.length > 0,
      canRedo: doc.future.length > 0,
      undo,
      redo,

      addTrack,
      removeTrack,
      renameTrack,
      setTrackMuted,
      setTrackSoloed,
      setTrackGain,
      setTrackPan,
      reorderTrack,
      setTrackHeight,

      addClip,
      moveClip,
      trimClip,
      splitClipAt,
      deleteClips,
      setClipGain,
      setClipFade,
      renameClip,
      duplicateClips,

      copy,
      cut,
      paste,
      clipboardSize: clipboard.length,

      tool,
      setTool,
      selection,
      setSelection,
      selectClip,
      clearSelection,

      pxPerSec,
      setPxPerSec,
      zoomBy,
      scrollX,
      setScrollX,

      playhead,
      setPlayhead,
      playing,
      play,
      pause,
      stop,
      toggleTransport,

      masterGainDb,
      setMasterGainDb,

      getBuffer,
      getPeaks,
      getBlob: getBlobLocal,

      insertTtsClip,

      prefs,
      setPrefs,

      ttsDialogOpen,
      setTtsDialogOpen,
      exportDialogOpen,
      setExportDialogOpen,
      shortcutsDialogOpen,
      setShortcutsDialogOpen,

      hovered,
      setHovered,
    }),
    [
      addClip,
      addTrack,
      bitDepth,
      clipboard.length,
      clearSelection,
      copy,
      cut,
      deleteClips,
      doc.clips,
      doc.future.length,
      doc.past.length,
      doc.tracks,
      duplicateClips,
      exportDialogOpen,
      getBlobLocal,
      getBuffer,
      getPeaks,
      hovered,
      insertTtsClip,
      masterGainDb,
      moveClip,
      pause,
      paste,
      play,
      playhead,
      playing,
      prefs,
      projectName,
      pxPerSec,
      redo,
      removeTrack,
      renameClip,
      renameTrack,
      reorderTrack,
      sampleRate,
      scrollX,
      selectClip,
      selection,
      setClipFade,
      setClipGain,
      setMasterGainDb,
      setPlayhead,
      setPrefs,
      setPxPerSec,
      setTrackGain,
      setTrackHeight,
      setTrackMuted,
      setTrackPan,
      setTrackSoloed,
      shortcutsDialogOpen,
      splitClipAt,
      stop,
      toggleTransport,
      tool,
      trimClip,
      ttsDialogOpen,
      undo,
      zoomBy,
    ]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useEditor(): EditorState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useEditor must be used within EditorProvider")
  return ctx
}
