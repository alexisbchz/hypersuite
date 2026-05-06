"use client"

import { useEffect, type Ref } from "react"

import { cn } from "@workspace/ui/lib/utils"

/** The document area: a sized container that pans + zooms via CSS custom
 *  properties set imperatively, with a transparency-checker pattern as the
 *  bottom-most child. All visual styling lives in `globals.css`
 *  (`.doc-surface` / `.doc-pattern`); this component is a thin shell that
 *  forwards the ref, sizes the box, and pushes pan/zoom into custom props.
 *
 *  The custom-property writes go through `style.setProperty` rather than
 *  React's `style` prop, so reconciliation never has to diff a transform
 *  string and the browser's compositor sees a single property change per
 *  pan/zoom tick instead of a full attribute repaint. */
export function DocSurface({
  ref,
  width,
  height,
  panX,
  panY,
  scale,
  showGrid,
  hidden,
  className,
  children,
  ...rest
}: {
  ref?: Ref<HTMLDivElement>
  width: number
  height: number
  panX: number
  panY: number
  scale: number
  showGrid: boolean
  hidden?: boolean
  className?: string
  children: React.ReactNode
} & Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "style" | "ref" | "children" | "hidden" | "className"
>) {
  return (
    <div
      ref={(node) => {
        if (typeof ref === "function") ref(node)
        else if (ref) (ref as { current: HTMLDivElement | null }).current = node
        if (!node) return
        // Pan rounded to whole pixels — sub-pixel pan creates anti-alias
        // jitter on layer edges and on the pattern tile boundaries.
        // Scale clamped to 4 decimals — keeps zoom smooth without
        // poisoning `calc(20px / var(--doc-scale))` with a float tail
        // that yields irrational tile sizes.
        node.style.setProperty("--pan-x", `${Math.round(panX)}px`)
        node.style.setProperty("--pan-y", `${Math.round(panY)}px`)
        node.style.setProperty("--doc-scale", scale.toFixed(4))
      }}
      data-doc-surface="true"
      hidden={hidden}
      className={cn("doc-surface", className)}
      style={{ width, height }}
      {...rest}
    >
      <div className="doc-pattern" data-grid={showGrid ? "" : undefined} />
      {children}
    </div>
  )
}

/** Hook variant for cases where the doc surface element is rendered
 *  externally — keeps the imperative custom-prop writes in one place. */
export function useDocSurfaceVars(
  ref: { current: HTMLElement | null },
  panX: number,
  panY: number,
  scale: number
) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.setProperty("--pan-x", `${panX}px`)
    el.style.setProperty("--pan-y", `${panY}px`)
    el.style.setProperty("--doc-scale", String(scale))
  }, [ref, panX, panY, scale])
}
