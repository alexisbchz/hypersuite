import type { Layer } from "./types"

export type Rect = { x: number; y: number; width: number; height: number }
export type Vec2 = { x: number; y: number }
export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w"

export function rotateVec(v: Vec2, rotationDeg: number): Vec2 {
  const r = (rotationDeg * Math.PI) / 180
  const cos = Math.cos(r)
  const sin = Math.sin(r)
  return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos }
}

/** Convert a screen-space delta into the rect's local frame (rotation removed). */
export function toLocal(dx: number, dy: number, rotationDeg: number): Vec2 {
  return rotateVec({ x: dx, y: dy }, -rotationDeg)
}

function pivotLocalForHandle(
  handle: ResizeHandle,
  w: number,
  h: number
): Vec2 {
  let x = 0
  let y = 0
  if (handle === "e" || handle === "ne" || handle === "se") x = -w / 2
  else if (handle === "w" || handle === "nw" || handle === "sw") x = w / 2
  if (handle === "s" || handle === "se" || handle === "sw") y = -h / 2
  else if (handle === "n" || handle === "ne" || handle === "nw") y = h / 2
  return { x, y }
}

/**
 * Resize a rotated rect by dragging `handle`. The opposite handle/edge stays
 * pinned in world space.
 *
 * `localDelta` = pointer delta in the rect's local frame (use `toLocal` first).
 * Returns the new (x, y, width, height).
 */
export function resizeRotatedRect(
  start: Rect,
  handle: ResizeHandle,
  localDelta: Vec2,
  rotationDeg: number,
  keepAspect: boolean
): Rect {
  let dw = 0
  let dh = 0
  if (handle === "e" || handle === "ne" || handle === "se") dw = localDelta.x
  else if (handle === "w" || handle === "nw" || handle === "sw")
    dw = -localDelta.x
  if (handle === "s" || handle === "se" || handle === "sw") dh = localDelta.y
  else if (handle === "n" || handle === "ne" || handle === "nw")
    dh = -localDelta.y

  let newW = start.width + dw
  let newH = start.height + dh

  const isCorner =
    handle === "nw" || handle === "ne" || handle === "sw" || handle === "se"
  if (keepAspect && isCorner && start.height > 0) {
    const ratio = start.width / start.height
    const wByH = newH * ratio
    const hByW = newW / ratio
    if (Math.abs(newW - wByH) > Math.abs(newH - hByW)) {
      newH = newW / ratio
    } else {
      newW = newH * ratio
    }
  }

  newW = Math.max(1, newW)
  newH = Math.max(1, newH)

  const pivotLocal = pivotLocalForHandle(handle, start.width, start.height)
  const startCenter = {
    x: start.x + start.width / 2,
    y: start.y + start.height / 2,
  }
  const pivotRot = rotateVec(pivotLocal, rotationDeg)
  const pivotWorld = {
    x: startCenter.x + pivotRot.x,
    y: startCenter.y + pivotRot.y,
  }

  const pivotLocalNew = pivotLocalForHandle(handle, newW, newH)
  const pivotRotNew = rotateVec(pivotLocalNew, rotationDeg)
  const newCenter = {
    x: pivotWorld.x - pivotRotNew.x,
    y: pivotWorld.y - pivotRotNew.y,
  }

  return {
    x: newCenter.x - newW / 2,
    y: newCenter.y - newH / 2,
    width: newW,
    height: newH,
  }
}

/** Axis-aligned bounding box of a (possibly rotated) layer in document coords. */
export function rotatedAABB(
  layer: Pick<Layer, "x" | "y" | "width" | "height" | "rotation">
): Rect {
  if (!layer.rotation) {
    return { x: layer.x, y: layer.y, width: layer.width, height: layer.height }
  }
  const cx = layer.x + layer.width / 2
  const cy = layer.y + layer.height / 2
  const w2 = layer.width / 2
  const h2 = layer.height / 2
  const corners: Vec2[] = [
    { x: -w2, y: -h2 },
    { x: w2, y: -h2 },
    { x: w2, y: h2 },
    { x: -w2, y: h2 },
  ].map((v) => {
    const r = rotateVec(v, layer.rotation)
    return { x: cx + r.x, y: cy + r.y }
  })
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const c of corners) {
    if (c.x < minX) minX = c.x
    if (c.y < minY) minY = c.y
    if (c.x > maxX) maxX = c.x
    if (c.y > maxY) maxY = c.y
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export function selectionBoundsOf(
  layers: Pick<Layer, "id" | "x" | "y" | "width" | "height" | "rotation">[],
  ids: string[]
): Rect | null {
  const sel = layers.filter((l) => ids.includes(l.id))
  if (sel.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const l of sel) {
    const r = rotatedAABB(l)
    if (r.x < minX) minX = r.x
    if (r.y < minY) minY = r.y
    if (r.x + r.width > maxX) maxX = r.x + r.width
    if (r.y + r.height > maxY) maxY = r.y + r.height
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

// ---------------------------------------------------------------- Snapping --

export type SnapResult = {
  dx: number
  dy: number
  vGuides: number[]
  hGuides: number[]
}

export type EdgeFlags = {
  l: boolean
  r: boolean
  cx: boolean
  t: boolean
  b: boolean
  cy: boolean
}

const ALL_EDGES: EdgeFlags = {
  l: true,
  r: true,
  cx: true,
  t: true,
  b: true,
  cy: true,
}

function xLinesOf(r: Rect, edges: EdgeFlags): number[] {
  const out: number[] = []
  if (edges.l) out.push(r.x)
  if (edges.cx) out.push(r.x + r.width / 2)
  if (edges.r) out.push(r.x + r.width)
  return out
}
function yLinesOf(r: Rect, edges: EdgeFlags): number[] {
  const out: number[] = []
  if (edges.t) out.push(r.y)
  if (edges.cy) out.push(r.y + r.height / 2)
  if (edges.b) out.push(r.y + r.height)
  return out
}

/**
 * Edge-snap. Filters which lines of `rect` participate via `edges` (defaults
 * to all 6). Candidates always contribute all 6.
 */
export function computeSnap(
  rect: Rect,
  candidates: Rect[],
  threshold: number,
  edges: EdgeFlags = ALL_EDGES
): SnapResult {
  const draggedXs = xLinesOf(rect, edges)
  const draggedYs = yLinesOf(rect, edges)

  let bestDx = 0
  let bestDxDist = threshold + 1
  let bestDy = 0
  let bestDyDist = threshold + 1
  const vGuides: number[] = []
  const hGuides: number[] = []

  for (const c of candidates) {
    for (const dx of draggedXs) {
      for (const cx of xLinesOf(c, ALL_EDGES)) {
        const d = cx - dx
        const ad = Math.abs(d)
        if (ad < bestDxDist) {
          bestDxDist = ad
          bestDx = d
          vGuides.length = 0
          vGuides.push(cx)
        } else if (
          ad === bestDxDist &&
          d === bestDx &&
          !vGuides.includes(cx)
        ) {
          vGuides.push(cx)
        }
      }
    }
    for (const dy of draggedYs) {
      for (const cy of yLinesOf(c, ALL_EDGES)) {
        const d = cy - dy
        const ad = Math.abs(d)
        if (ad < bestDyDist) {
          bestDyDist = ad
          bestDy = d
          hGuides.length = 0
          hGuides.push(cy)
        } else if (
          ad === bestDyDist &&
          d === bestDy &&
          !hGuides.includes(cy)
        ) {
          hGuides.push(cy)
        }
      }
    }
  }

  return {
    dx: bestDxDist <= threshold ? bestDx : 0,
    dy: bestDyDist <= threshold ? bestDy : 0,
    vGuides: bestDxDist <= threshold ? vGuides : [],
    hGuides: bestDyDist <= threshold ? hGuides : [],
  }
}

/** Which edges of a rect actually move when dragging a given resize handle. */
export function edgesForHandle(handle: ResizeHandle): EdgeFlags {
  return {
    l: handle === "w" || handle === "nw" || handle === "sw",
    r: handle === "e" || handle === "ne" || handle === "se",
    t: handle === "n" || handle === "nw" || handle === "ne",
    b: handle === "s" || handle === "sw" || handle === "se",
    cx: false,
    cy: false,
  }
}

// --------------------------------------------------- Equal-spacing guides --

export type SpacingSpan = { a: number; b: number; cross: number; gap: number }
export type SpacingGuides = {
  axis: "x" | "y"
  spans: SpacingSpan[]
}

export type SpacingResult = {
  dx: number
  dy: number
  spacing: SpacingGuides[]
}

/**
 * Find equal-spacing snaps. Looks for static peers that already share a gap;
 * if `dragged` placed before/after them keeps that gap, snap and emit dashed
 * spans for visual feedback.
 */
export function computeSpacingGuides(
  dragged: Rect,
  others: Rect[],
  threshold: number
): SpacingResult {
  let snapDx = 0
  let snapDy = 0
  let bestDxDist = threshold + 1
  let bestDyDist = threshold + 1
  let bestX: SpacingGuides | null = null
  let bestY: SpacingGuides | null = null

  const overlapsY = (a: Rect, b: Rect) =>
    a.y < b.y + b.height && a.y + a.height > b.y
  const overlapsX = (a: Rect, b: Rect) =>
    a.x < b.x + b.width && a.x + a.width > b.x

  // X axis
  const hPeers = others
    .filter((o) => overlapsY(o, dragged))
    .sort((a, b) => a.x - b.x)
  for (let i = 0; i < hPeers.length; i++) {
    for (let j = i + 1; j < hPeers.length; j++) {
      const A = hPeers[i]!
      const B = hPeers[j]!
      const knownGap = B.x - (A.x + A.width)
      if (knownGap <= 0) continue
      const cross = Math.max(A.y, B.y) + Math.min(A.y + A.height, B.y + B.height)
      const crossY = cross / 2
      // Place dragged left of A
      const targetLeft = A.x - knownGap - dragged.width
      const dxL = targetLeft - dragged.x
      if (Math.abs(dxL) < bestDxDist) {
        bestDxDist = Math.abs(dxL)
        snapDx = dxL
        bestX = {
          axis: "x",
          spans: [
            {
              a: targetLeft + dragged.width,
              b: A.x,
              cross: crossY,
              gap: knownGap,
            },
            { a: A.x + A.width, b: B.x, cross: crossY, gap: knownGap },
          ],
        }
      }
      // Place dragged right of B
      const targetRight = B.x + B.width + knownGap
      const dxR = targetRight - dragged.x
      if (Math.abs(dxR) < bestDxDist) {
        bestDxDist = Math.abs(dxR)
        snapDx = dxR
        bestX = {
          axis: "x",
          spans: [
            { a: A.x + A.width, b: B.x, cross: crossY, gap: knownGap },
            {
              a: B.x + B.width,
              b: targetRight,
              cross: crossY,
              gap: knownGap,
            },
          ],
        }
      }
    }
  }

  // Y axis
  const vPeers = others
    .filter((o) => overlapsX(o, dragged))
    .sort((a, b) => a.y - b.y)
  for (let i = 0; i < vPeers.length; i++) {
    for (let j = i + 1; j < vPeers.length; j++) {
      const A = vPeers[i]!
      const B = vPeers[j]!
      const knownGap = B.y - (A.y + A.height)
      if (knownGap <= 0) continue
      const cross =
        Math.max(A.x, B.x) + Math.min(A.x + A.width, B.x + B.width)
      const crossX = cross / 2
      const targetTop = A.y - knownGap - dragged.height
      const dyT = targetTop - dragged.y
      if (Math.abs(dyT) < bestDyDist) {
        bestDyDist = Math.abs(dyT)
        snapDy = dyT
        bestY = {
          axis: "y",
          spans: [
            {
              a: targetTop + dragged.height,
              b: A.y,
              cross: crossX,
              gap: knownGap,
            },
            { a: A.y + A.height, b: B.y, cross: crossX, gap: knownGap },
          ],
        }
      }
      const targetBot = B.y + B.height + knownGap
      const dyB = targetBot - dragged.y
      if (Math.abs(dyB) < bestDyDist) {
        bestDyDist = Math.abs(dyB)
        snapDy = dyB
        bestY = {
          axis: "y",
          spans: [
            { a: A.y + A.height, b: B.y, cross: crossX, gap: knownGap },
            {
              a: B.y + B.height,
              b: targetBot,
              cross: crossX,
              gap: knownGap,
            },
          ],
        }
      }
    }
  }

  const spacing: SpacingGuides[] = []
  if (bestX && bestDxDist <= threshold) spacing.push(bestX)
  if (bestY && bestDyDist <= threshold) spacing.push(bestY)

  return {
    dx: bestDxDist <= threshold ? snapDx : 0,
    dy: bestDyDist <= threshold ? snapDy : 0,
    spacing,
  }
}
