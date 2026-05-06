"use client"

/** Doc-surface base layers: the transparency checker (always) plus an
 *  optional design grid. Each is its own `inset-0` div so the parent's
 *  size — whatever it is, however transformed — fills exactly. The
 *  user's chosen "background colour" is a real layer in the doc, not a
 *  CSS overlay here, so it doesn't double-paint. */
const CHECKER_TILE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><rect width='10' height='10' fill='%23cfcfcf'/><rect x='10' y='10' width='10' height='10' fill='%23cfcfcf'/></svg>\")"

export function DocBackground({ showGrid }: { showGrid: boolean }) {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundColor: "#ffffff",
          backgroundImage: CHECKER_TILE,
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
