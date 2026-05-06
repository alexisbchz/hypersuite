"use client"

import type { Anchor } from "../lib/types"

/** Live preview rendered while the user is dropping anchors with the pen
 *  tool. Shows the path so far + a dashed segment to the cursor. Anchor
 *  dots are square; the first anchor is filled to indicate "click here to
 *  close the path". */
export function PenOverlay({
  anchors,
  hover,
  scale,
  docW,
  docH,
}: {
  anchors: Anchor[]
  hover: { x: number; y: number } | null
  scale: number
  docW: number
  docH: number
}) {
  const inv = 1 / Math.max(scale, 0.001)
  const handle = 8
  const lineWidth = 1 / Math.max(scale, 0.001)
  const d =
    anchors.length === 0
      ? ""
      : anchors
          .map((a, i) => {
            if (i === 0) return `M${a.x} ${a.y}`
            const prev = anchors[i - 1]!
            if (prev.hOut || a.hIn) {
              const c1 = prev.hOut ?? { x: prev.x, y: prev.y }
              const c2 = a.hIn ?? { x: a.x, y: a.y }
              return `C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${a.x} ${a.y}`
            }
            return `L${a.x} ${a.y}`
          })
          .join(" ") + (hover ? ` L${hover.x} ${hover.y}` : "")
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{ overflow: "visible" }}
    >
      <svg
        width={docW}
        height={docH}
        className="absolute inset-0"
        style={{ overflow: "visible" }}
      >
        <path
          d={d}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={lineWidth}
          strokeDasharray={`${4 * inv} ${4 * inv}`}
        />
        {anchors.map((a, i) => (
          <g key={i}>
            {a.hIn && (
              <line
                x1={a.x}
                y1={a.y}
                x2={a.hIn.x}
                y2={a.hIn.y}
                stroke="var(--color-primary)"
                strokeWidth={lineWidth}
                opacity={0.6}
              />
            )}
            {a.hOut && (
              <line
                x1={a.x}
                y1={a.y}
                x2={a.hOut.x}
                y2={a.hOut.y}
                stroke="var(--color-primary)"
                strokeWidth={lineWidth}
                opacity={0.6}
              />
            )}
          </g>
        ))}
      </svg>
      {anchors.map((a, i) => (
        <div key={`anc-${i}`}>
          <div
            className="absolute"
            style={{
              left: a.x,
              top: a.y,
              width: handle,
              height: handle,
              transform: `translate(-50%, -50%) scale(${inv})`,
              background:
                i === 0 ? "var(--color-primary)" : "var(--color-background)",
              border: "1.5px solid var(--color-primary)",
              borderRadius: i === 0 ? "50%" : 2,
            }}
          />
          {a.hIn && (
            <div
              className="absolute"
              style={{
                left: a.hIn.x,
                top: a.hIn.y,
                width: handle - 2,
                height: handle - 2,
                transform: `translate(-50%, -50%) scale(${inv})`,
                background: "var(--color-background)",
                border: "1px solid var(--color-primary)",
                borderRadius: "50%",
              }}
            />
          )}
          {a.hOut && (
            <div
              className="absolute"
              style={{
                left: a.hOut.x,
                top: a.hOut.y,
                width: handle - 2,
                height: handle - 2,
                transform: `translate(-50%, -50%) scale(${inv})`,
                background: "var(--color-background)",
                border: "1px solid var(--color-primary)",
                borderRadius: "50%",
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

/** Edit handles for an existing path layer. Drag the anchor (square) to
 *  translate the whole anchor + its handles; drag a handle dot to reshape
 *  the curve, mirrored on the opposite side for smooth tangents. */
export function PathEditOverlay({
  layerId,
  anchors,
  onChange,
  onCommit,
  scale,
}: {
  layerId: string
  anchors: Anchor[]
  onChange: (anchors: Anchor[]) => void
  onCommit: () => void
  scale: number
}) {
  const inv = 1 / Math.max(scale, 0.001)
  const handle = 9

  const startDrag = (
    e: React.PointerEvent,
    idx: number,
    kind: "anchor" | "in" | "out"
  ) => {
    e.stopPropagation()
    e.preventDefault()
    const a = anchors[idx]
    if (!a) return
    const startClientX = e.clientX
    const startClientY = e.clientY
    const start = {
      ...a,
      hIn: a.hIn ? { ...a.hIn } : undefined,
      hOut: a.hOut ? { ...a.hOut } : undefined,
    }
    let committed = false
    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startClientX) / scale
      const dy = (ev.clientY - startClientY) / scale
      if (!committed && Math.hypot(dx, dy) > 1) {
        onCommit()
        committed = true
      }
      const next = anchors.slice()
      if (kind === "anchor") {
        next[idx] = {
          x: start.x + dx,
          y: start.y + dy,
          hIn: start.hIn
            ? { x: start.hIn.x + dx, y: start.hIn.y + dy }
            : undefined,
          hOut: start.hOut
            ? { x: start.hOut.x + dx, y: start.hOut.y + dy }
            : undefined,
        }
      } else if (kind === "out") {
        const newOut = {
          x: (start.hOut?.x ?? start.x) + dx,
          y: (start.hOut?.y ?? start.y) + dy,
        }
        const mirroredIn = {
          x: 2 * start.x - newOut.x,
          y: 2 * start.y - newOut.y,
        }
        next[idx] = { ...start, hOut: newOut, hIn: mirroredIn }
      } else {
        const newIn = {
          x: (start.hIn?.x ?? start.x) + dx,
          y: (start.hIn?.y ?? start.y) + dy,
        }
        const mirroredOut = {
          x: 2 * start.x - newIn.x,
          y: 2 * start.y - newIn.y,
        }
        next[idx] = { ...start, hIn: newIn, hOut: mirroredOut }
      }
      onChange(next)
    }
    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }

  const dot = (
    cx: number,
    cy: number,
    onPointerDown: (e: React.PointerEvent) => void,
    filled: boolean,
    cursor = "pointer"
  ) => (
    <div
      onPointerDown={onPointerDown}
      className="pointer-events-auto absolute"
      style={{
        left: cx,
        top: cy,
        width: handle,
        height: handle,
        transform: `translate(-50%, -50%) scale(${inv})`,
        background: filled ? "var(--color-primary)" : "var(--color-background)",
        border: "1.5px solid var(--color-primary)",
        borderRadius: filled ? "50%" : 2,
        cursor,
        touchAction: "none",
      }}
    />
  )

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      data-layer={layerId}
      style={{ overflow: "visible" }}
    >
      {anchors.map((a, i) => (
        <div key={i}>
          {dot(a.x, a.y, (e) => startDrag(e, i, "anchor"), false, "move")}
          {a.hIn && dot(a.hIn.x, a.hIn.y, (e) => startDrag(e, i, "in"), true)}
          {a.hOut &&
            dot(a.hOut.x, a.hOut.y, (e) => startDrag(e, i, "out"), true)}
        </div>
      ))}
    </div>
  )
}
