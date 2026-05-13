import { DEFAULT_PREFS, type Prefs } from "./doc"
import type { Project } from "../lib/types"

export const AUTOSAVE_DELAY_MS = 400

const PROJECT_KEY = "hypercreate.audio.project.v1"
const PREFS_KEY = "hypercreate.audio.prefs.v1"

const DB_NAME = "hypercreate-audio"
const DB_VERSION = 1
const BLOBS_STORE = "blobs"

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(BLOBS_STORE)) {
        db.createObjectStore(BLOBS_STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function putBlob(key: string, blob: Blob): Promise<void> {
  if (typeof window === "undefined") return
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(BLOBS_STORE, "readwrite")
    tx.objectStore(BLOBS_STORE).put(blob, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function getBlob(key: string): Promise<Blob | null> {
  if (typeof window === "undefined") return null
  const db = await openDb()
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(BLOBS_STORE, "readonly")
    const req = tx.objectStore(BLOBS_STORE).get(key)
    req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null)
    req.onerror = () => reject(req.error)
  })
  db.close()
  return blob
}

export async function deleteBlob(key: string): Promise<void> {
  if (typeof window === "undefined") return
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(BLOBS_STORE, "readwrite")
    tx.objectStore(BLOBS_STORE).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function listBlobKeys(): Promise<string[]> {
  if (typeof window === "undefined") return []
  const db = await openDb()
  const keys = await new Promise<string[]>((resolve, reject) => {
    const tx = db.transaction(BLOBS_STORE, "readonly")
    const req = tx.objectStore(BLOBS_STORE).getAllKeys()
    req.onsuccess = () => resolve(req.result as string[])
    req.onerror = () => reject(req.error)
  })
  db.close()
  return keys
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
    // quota exceeded — ignore
  }
}

export function loadPersistedProject(): Project | null {
  const parsed = readJSON<Project>(PROJECT_KEY)
  if (!parsed || !Array.isArray(parsed.tracks) || !Array.isArray(parsed.clips))
    return null
  return parsed
}

export function savePersistedProject(project: Project) {
  writeJSON(PROJECT_KEY, project)
}

export function loadPersistedPrefs(): Prefs {
  const parsed = readJSON<Partial<Prefs>>(PREFS_KEY)
  return { ...DEFAULT_PREFS, ...(parsed ?? {}) }
}

export function savePersistedPrefs(prefs: Prefs) {
  writeJSON(PREFS_KEY, prefs)
}

export async function pruneOrphanBlobs(usedKeys: Set<string>): Promise<void> {
  const keys = await listBlobKeys()
  for (const k of keys) {
    if (!usedKeys.has(k)) await deleteBlob(k)
  }
}
