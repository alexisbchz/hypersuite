import type { Layer } from "../lib/types"
import {
  DEFAULT_PREFS,
  DEFAULT_VIEW_TOGGLES,
  type DocSettings,
  type Prefs,
  type Recent,
  type ViewToggles,
} from "./doc"

const STORAGE_KEY = "hypersuite.image.doc.v2"
const PREFS_KEY = "hypersuite.image.prefs.v1"
const RECENTS_KEY = "hypersuite.image.recents.v1"

export const RECENTS_LIMIT = 5
export const AUTOSAVE_DELAY_MS = 400

type PersistedDoc = { layers: Layer[]; settings?: DocSettings }
type PersistedPrefs = { prefs: Prefs; viewToggles: ViewToggles }

// blob: URLs don't survive a reload, so skip those layers entirely.
function isPersistableLayer(l: Layer) {
  return !(l.src && l.src.startsWith("blob:"))
}

function readJSON<T>(key: string): T | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // quota exceeded or storage disabled — silently ignore
  }
}

export function loadPersistedDoc(): PersistedDoc | null {
  const parsed = readJSON<PersistedDoc>(STORAGE_KEY)
  if (!parsed || !Array.isArray(parsed.layers)) return null
  return parsed
}

export function savePersistedDoc(layers: Layer[], settings: DocSettings) {
  writeJSON(STORAGE_KEY, {
    layers: layers.filter(isPersistableLayer),
    settings,
  })
}

export function clearPersistedDoc() {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function loadPersistedPrefs(): PersistedPrefs {
  const parsed = readJSON<Partial<PersistedPrefs>>(PREFS_KEY)
  return {
    prefs: { ...DEFAULT_PREFS, ...(parsed?.prefs ?? {}) },
    viewToggles: { ...DEFAULT_VIEW_TOGGLES, ...(parsed?.viewToggles ?? {}) },
  }
}

export function savePersistedPrefs(prefs: Prefs, viewToggles: ViewToggles) {
  writeJSON(PREFS_KEY, { prefs, viewToggles })
}

export function loadPersistedRecents(): Recent[] {
  const parsed = readJSON<Recent[]>(RECENTS_KEY)
  return Array.isArray(parsed) ? parsed : []
}

export function savePersistedRecents(recents: Recent[]) {
  writeJSON(RECENTS_KEY, recents)
}
