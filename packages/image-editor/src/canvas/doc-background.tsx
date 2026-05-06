"use client"

/** Doc-surface base layers: the transparency checker (always) plus an
 *  optional design grid. Each is its own `inset-0` div so the parent's
 *  size — whatever it is, however transformed — fills exactly. The
 *  user's chosen "background colour" is a real layer in the doc, not a
 *  CSS overlay here, so it doesn't double-paint.
 *
 *  Pattern is a single conic-gradient — most reliable single-prop
 *  approach, no two-gradient phase math, no SVG data-URI escaping
 *  edge cases. */
const CHECKER_PATTERN =
  "conic-gradient(#cfcfcf 0% 25%, #ffffff 25% 50%, #cfcfcf 50% 75%, #ffffff 75%)"

export function DocBackground({ showGrid }: { showGrid: boolean }) {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: CHECKER_PATTERN,
          backgroundSize: "20px 20px",
          backgroundRepeat: "repeat",
        }}
      />
      {showGrid && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, color-mix(in oklch, var(--color-foreground), transparent 90%) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklch, var(--color-foreground), transparent 90%) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            backgroundRepeat: "repeat",
          }}
        />
      )}
    </>
  )
}
