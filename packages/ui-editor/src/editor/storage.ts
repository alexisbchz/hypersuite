import type { Frame } from "../lib/types"

const STORAGE_KEY = "hypersuite.ui-editor.doc.v1"
export const AUTOSAVE_DELAY_MS = 600

type Persisted = {
  frames: Frame[]
  zoom: number
  panX: number
  panY: number
}

export function loadPersistedDoc(): Persisted | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Persisted
    if (!parsed || !Array.isArray(parsed.frames)) return null
    return parsed
  } catch {
    return null
  }
}

export function savePersistedDoc(snap: Persisted) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snap))
  } catch {
    // localStorage may be unavailable (private mode, quota) — skip silently.
  }
}

export function clearPersistedDoc() {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
