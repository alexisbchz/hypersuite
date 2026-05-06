export type LayerKind = "image" | "text" | "shape" | "group"

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
