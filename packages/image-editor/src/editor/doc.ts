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
