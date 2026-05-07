import type { Rect, ResizeHandle } from "../lib/geometry"

export type DragState = {
  primaryId: string
  pointerId: number
  startClientX: number
  startClientY: number
  starts: Map<string, { x: number; y: number }>
  shifted: boolean
  moved: boolean
  committed: boolean
}

export type MarqueeState = {
  pointerId: number
  startDocX: number
  startDocY: number
  curDocX: number
  curDocY: number
  additive: boolean
  preselected: string[]
}

export type ShapeDrawState = {
  pointerId: number
  startDocX: number
  startDocY: number
  curDocX: number
  curDocY: number
  variant: "rect" | "ellipse"
}

export type StrokeState = {
  pointerId: number
  layerId: string
  mode: "pencil" | "brush" | "eraser"
}

export type ZoomDragState = {
  pointerId: number
  startDocX: number
  startDocY: number
  curDocX: number
  curDocY: number
}

export type ResizeState = {
  id: string
  handle: ResizeHandle
  pointerId: number
  startClientX: number
  startClientY: number
  startX: number
  startY: number
  startW: number
  startH: number
  ratio: number
  committed: boolean
  moved: boolean
}

export type RotateState = {
  id: string
  pointerId: number
  cx: number
  cy: number
  startAngle: number
  startRotation: number
  committed: boolean
}

export type MultiTransformStart = {
  id: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  fontSize?: number
}

export type MultiResizeState = {
  pointerId: number
  handle: ResizeHandle
  startClientX: number
  startClientY: number
  bounds: Rect
  pivot: { x: number; y: number }
  starts: MultiTransformStart[]
  committed: boolean
  moved: boolean
}

export type MultiRotateState = {
  pointerId: number
  cx: number
  cy: number
  startAngle: number
  starts: MultiTransformStart[]
  committed: boolean
}

export type PanState = {
  pointerId: number
  startClientX: number
  startClientY: number
  startPanX: number
  startPanY: number
}

export type CropHandle =
  | "nw"
  | "ne"
  | "sw"
  | "se"
  | "n"
  | "s"
  | "e"
  | "w"
  | "move"

export const SNAP_THRESHOLD = 6
export const DEFAULT_DOC_W = 1200
export const DEFAULT_DOC_H = 800

/** Tools whose clicks must reach the container handler even when they land
 *  on a layer (so the user can paint, draw shapes, drop anchors, place text
 *  on top of existing artwork, sample a color, or magic-wand a region). */
export const CANVAS_DRAW_TOOLS = new Set([
  "pencil",
  "brush",
  "eraser",
  "shape",
  "pen",
  "text",
  "wand",
  "picker",
])

export const isCanvasDrawTool = (tool: string) => CANVAS_DRAW_TOOLS.has(tool)
