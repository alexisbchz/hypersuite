export type LayerKind = "image" | "text" | "shape" | "group" | "path" | "raster"

export type ShadowEffect = {
  x: number
  y: number
  blur: number
  color: string
}

export type StrokeEffect = {
  width: number
  color: string
}

export type LayerEffects = {
  shadow?: ShadowEffect | null
  innerShadow?: ShadowEffect | null
  blur?: number | null
  stroke?: StrokeEffect | null
}

export type ShapeVariant = "rect" | "ellipse"

export type Crop = {
  x: number
  y: number
  width: number
  height: number
}

export type Anchor = {
  x: number
  y: number
  /** outgoing handle in absolute doc coords; undefined = corner */
  hOut?: { x: number; y: number }
  /** incoming handle (mirror of hOut by default) */
  hIn?: { x: number; y: number }
}

export type ImageAdjustments = {
  brightness?: number
  contrast?: number
  saturation?: number
  hue?: number
}

export type LayerFilters = {
  sharpen?: { strength: number }
  noise?: { amount: number; mono: boolean }
  grain?: { amount: number; scale: number }
}

export type Layer = {
  id: string
  name: string
  kind: LayerKind
  visible: boolean
  locked: boolean
  opacity: number
  blendMode: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  color?: string
  src?: string
  text?: string
  fontSize?: number
  fontWeight?: number
  /** Google Font family name, or undefined for system UI. */
  fontFamily?: string
  effects?: LayerEffects
  /** Image adjustments (brightness/contrast/saturation/hue) for image and raster layers. */
  adjustments?: ImageAdjustments
  /** Filters (sharpen/noise/grain) for any layer. */
  filters?: LayerFilters
  shape?: ShapeVariant
  path?: string
  pathClosed?: boolean
  pathStrokeWidth?: number
  /** Anchors in absolute doc coordinates (preferred over `path` for editable paths). */
  anchors?: Anchor[]
  /** Stored as a PNG data URL, or null while empty.
   *
   *  When `sourceDataUrl` is also set on the layer, this field is a
   *  *cache* of `source × mask` rebuilt on every mask edit — readers
   *  (export, wand composite) can keep using it transparently. */
  rasterDataUrl?: string | null
  /** Original full-RGB pixels for a non-destructively masked raster. Set
   *  by AI background removal so the user can paint pixels back via the
   *  Refine tool. PNG data URL. */
  sourceDataUrl?: string | null
  /** Editable alpha mask paired with `sourceDataUrl`. White/opaque pixels
   *  are kept; black/transparent pixels are dropped from the composite.
   *  PNG data URL. */
  maskDataUrl?: string | null
  /** Pixel dimensions of the raster buffer (separate from layer size for resampling). */
  rasterWidth?: number
  rasterHeight?: number
  /** Source-pixel crop for image layers (in source-image coordinates). */
  crop?: Crop | null
  /** Original image natural dimensions (used for crop math). */
  naturalWidth?: number
  naturalHeight?: number
  /** Group membership — undefined or missing means top-level. */
  parentId?: string
}

export type ToolId =
  | "move"
  | "pan"
  | "marquee"
  | "pen"
  | "pencil"
  | "brush"
  | "eraser"
  | "text"
  | "shape"
  | "crop"
  | "picker"
  | "wand"
  | "zoom"
