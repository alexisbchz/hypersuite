// Curated Google Fonts selection. Each entry is loaded on-demand the first
// time it's referenced — never block initial render. Subsets: latin only.

export type FontDef = {
  family: string
  category: "sans" | "serif" | "mono" | "display" | "handwriting"
  weights: number[]
}

export const SYSTEM_FONT: FontDef = {
  family: "System UI",
  category: "sans",
  weights: [300, 400, 500, 600, 700, 800],
}

export const GOOGLE_FONTS: FontDef[] = [
  { family: "Inter", category: "sans", weights: [400, 500, 600, 700, 800] },
  { family: "Geist", category: "sans", weights: [400, 500, 600, 700] },
  { family: "Manrope", category: "sans", weights: [400, 500, 600, 700, 800] },
  { family: "DM Sans", category: "sans", weights: [400, 500, 700] },
  { family: "Plus Jakarta Sans", category: "sans", weights: [400, 500, 700] },
  { family: "Outfit", category: "sans", weights: [300, 400, 600, 700, 900] },
  { family: "Space Grotesk", category: "sans", weights: [400, 500, 700] },
  { family: "Work Sans", category: "sans", weights: [400, 500, 600, 700] },
  { family: "Poppins", category: "sans", weights: [400, 500, 600, 700, 800] },
  {
    family: "Montserrat",
    category: "sans",
    weights: [400, 500, 600, 700, 800],
  },
  { family: "Nunito", category: "sans", weights: [400, 600, 700, 800] },
  { family: "Karla", category: "sans", weights: [400, 500, 700] },
  { family: "Figtree", category: "sans", weights: [400, 500, 600, 700, 800] },

  {
    family: "Playfair Display",
    category: "serif",
    weights: [400, 600, 700, 900],
  },
  { family: "Merriweather", category: "serif", weights: [400, 700, 900] },
  { family: "Fraunces", category: "serif", weights: [400, 500, 600, 700, 900] },
  { family: "Crimson Pro", category: "serif", weights: [400, 600, 700] },
  { family: "EB Garamond", category: "serif", weights: [400, 500, 700] },
  { family: "Lora", category: "serif", weights: [400, 500, 600, 700] },
  { family: "Source Serif 4", category: "serif", weights: [400, 600, 700] },

  { family: "JetBrains Mono", category: "mono", weights: [400, 500, 700] },
  { family: "Fira Code", category: "mono", weights: [400, 500, 700] },
  { family: "IBM Plex Mono", category: "mono", weights: [400, 500, 700] },
  { family: "Geist Mono", category: "mono", weights: [400, 500, 700] },

  { family: "Bebas Neue", category: "display", weights: [400] },
  { family: "Anton", category: "display", weights: [400] },
  { family: "Archivo Black", category: "display", weights: [400] },
  { family: "Unbounded", category: "display", weights: [400, 600, 800] },
  { family: "Familjen Grotesk", category: "display", weights: [400, 600, 700] },

  { family: "Caveat", category: "handwriting", weights: [400, 600, 700] },
  { family: "Pacifico", category: "handwriting", weights: [400] },
  {
    family: "Dancing Script",
    category: "handwriting",
    weights: [400, 600, 700],
  },
]

export const ALL_FONTS: FontDef[] = [SYSTEM_FONT, ...GOOGLE_FONTS]

export function findFont(family: string | null | undefined): FontDef {
  if (!family) return SYSTEM_FONT
  return ALL_FONTS.find((f) => f.family === family) ?? SYSTEM_FONT
}

export function fontStack(family: string | null | undefined): string {
  const f = findFont(family)
  if (f === SYSTEM_FONT)
    return `system-ui, -apple-system, "Segoe UI", sans-serif`
  const fallback =
    f.category === "serif"
      ? "Georgia, serif"
      : f.category === "mono"
        ? "ui-monospace, SFMono-Regular, monospace"
        : f.category === "handwriting"
          ? "cursive"
          : f.category === "display"
            ? "system-ui, sans-serif"
            : "system-ui, sans-serif"
  return `"${f.family}", ${fallback}`
}

const loadedFamilies = new Set<string>()
const inFlight = new Map<string, Promise<void>>()

function googleFontHref(f: FontDef): string {
  // Use css2 with explicit weight axis. display=swap so initial render isn't blocked.
  const ws = f.weights.join(";")
  const family = f.family.replace(/ /g, "+")
  return `https://fonts.googleapis.com/css2?family=${family}:wght@${ws}&display=swap`
}

/**
 * Lazily inject a Google Fonts <link> for the requested family. Resolves once
 * the family is reported ready by the FontFaceSet API. Idempotent.
 */
export function ensureFont(family: string | null | undefined): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  const f = findFont(family)
  if (f === SYSTEM_FONT) return Promise.resolve()
  if (loadedFamilies.has(f.family)) return Promise.resolve()
  const existing = inFlight.get(f.family)
  if (existing) return existing

  const id = `gfont-${f.family.replace(/\s+/g, "-").toLowerCase()}`
  let link = document.getElementById(id) as HTMLLinkElement | null
  if (!link) {
    // Preconnect once for the whole session
    if (!document.getElementById("gfont-preconnect")) {
      const pc1 = document.createElement("link")
      pc1.id = "gfont-preconnect"
      pc1.rel = "preconnect"
      pc1.href = "https://fonts.googleapis.com"
      document.head.appendChild(pc1)
      const pc2 = document.createElement("link")
      pc2.rel = "preconnect"
      pc2.href = "https://fonts.gstatic.com"
      pc2.crossOrigin = "anonymous"
      document.head.appendChild(pc2)
    }
    link = document.createElement("link")
    link.id = id
    link.rel = "stylesheet"
    link.href = googleFontHref(f)
    document.head.appendChild(link)
  }

  const ready = (async () => {
    try {
      // Ensure all weights load before resolving so canvas/export uses real glyphs.
      const fonts = (
        document as unknown as {
          fonts?: {
            load: (font: string) => Promise<unknown>
            ready: Promise<void>
          }
        }
      ).fonts
      if (fonts) {
        await Promise.all(
          f.weights.map((w) => fonts.load(`${w} 16px "${f.family}"`))
        )
      }
    } catch {
      /* ignore — page will fall back gracefully */
    }
    loadedFamilies.add(f.family)
  })()
  inFlight.set(f.family, ready)
  return ready
}

/** Best-effort: return whether this family is loaded in this session. */
export function isFontLoaded(family: string | null | undefined): boolean {
  const f = findFont(family)
  if (f === SYSTEM_FONT) return true
  return loadedFamilies.has(f.family)
}
