export type ToolId = "move" | "pan" | "playground" | "image"

export type FrameKind = "image" | "playground"

export type BaseFrame = {
  id: string
  name: string
  kind: FrameKind
  x: number
  y: number
  width: number
  height: number
  locked: boolean
}

export type ImageFrame = BaseFrame & {
  kind: "image"
  src: string
  /** Visual opacity 0..100. Lower it so the screenshot acts as a tracing
   *  reference behind the playground you're building. */
  opacity: number
}

export type PlaygroundFrame = BaseFrame & {
  kind: "playground"
  html: string
  /** Background color shown behind the rendered playground content. */
  background: string
}

export type Frame = ImageFrame | PlaygroundFrame

export type Point = { x: number; y: number }

export type ResizeHandle = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w"
