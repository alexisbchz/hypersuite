"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type Props = {
  html: string
  background: string
  width: number
  height: number
}

/** Renders the user's HTML+Tailwind inside a sandboxed iframe with the
 *  Tailwind Play CDN injected. The iframe is the natural pixel size of
 *  the frame so font metrics and breakpoints behave as they would in a
 *  real browser; the surrounding canvas scales it via CSS transform. */
export function PlaygroundPreview({ html, background, width, height }: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  // Debounce HTML edits so a flurry of keystrokes doesn't thrash the
  // iframe; 80ms is short enough to feel live but long enough to coalesce.
  const [debouncedHtml, setDebouncedHtml] = useState(html)
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedHtml(html), 80)
    return () => window.clearTimeout(t)
  }, [html])

  const srcDoc = useMemo(
    () => buildSrcDoc(debouncedHtml, background),
    [debouncedHtml, background]
  )

  return (
    <iframe
      ref={iframeRef}
      title="Playground preview"
      sandbox="allow-scripts"
      srcDoc={srcDoc}
      style={{ width, height }}
      className="block border-0 bg-white"
    />
  )
}

function buildSrcDoc(html: string, background: string) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<script src="https://cdn.tailwindcss.com?plugins=forms,typography,aspect-ratio,line-clamp"></script>
<style>
  html, body { margin: 0; padding: 0; height: 100%; background: ${escapeAttr(background)}; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
  *, *::before, *::after { box-sizing: border-box; }
</style>
</head>
<body>${html}</body>
</html>`
}

function escapeAttr(s: string) {
  return s.replace(/"/g, "&quot;").replace(/</g, "&lt;")
}
