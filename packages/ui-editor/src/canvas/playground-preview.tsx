"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type Props = {
  html: string
  background: string
  width: number
  height: number
}

/** Renders the user's HTML+Tailwind inside a sandboxed iframe with the
 *  Tailwind Play CDN injected.
 *
 *  Updates are sent via `postMessage` rather than by rebuilding `srcDoc`:
 *  every srcDoc swap would reload the iframe, reload the Tailwind CDN
 *  script, and produce a visible white flash on every keystroke. With
 *  postMessage the iframe loads exactly once per frame instance and
 *  swaps `document.body.innerHTML` in place. */
export function PlaygroundPreview({ html, background, width, height }: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  // Each frame gets a stable channel id so we can ignore messages from
  // other playgrounds living on the same page. Lazy-init via useState so
  // it's allocated once per component instance and stays stable across
  // re-renders (and React's strict-mode double-mount).
  const [channel] = useState<string>(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  )

  // The bootstrap document is computed once per channel — intentionally
  // NOT memoized on html/background so we don't accidentally trip a
  // srcDoc replacement (which would reload the Tailwind CDN every time).
  const bootstrapSrcDoc = useMemo(() => buildBootstrap(channel), [channel])

  // Track when the iframe has loaded its bootstrap and the inner script
  // is ready to receive `set-html` messages.
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (
        typeof e.data === "object" &&
        e.data &&
        e.data.type === "playground-ready" &&
        e.data.channel === channel
      ) {
        setReady(true)
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [channel])

  // Push HTML + background to the iframe every time they change. The
  // initial post happens as soon as the iframe signals ready; subsequent
  // edits replay immediately.
  useEffect(() => {
    if (!ready) return
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "set-html",
        channel,
        html,
        background,
      },
      "*"
    )
  }, [ready, channel, html, background])

  return (
    <iframe
      ref={iframeRef}
      title="Playground preview"
      sandbox="allow-scripts"
      srcDoc={bootstrapSrcDoc}
      style={{ width, height }}
      // `pointer-events-none` is the key — without it the iframe swallows
      // every click and the parent FrameView never sees the pointerdown
      // needed for select/drag. The Tailwind preview is read-only from
      // the editor's perspective; users edit via the Monaco code panel,
      // not by clicking inside the rendered HTML.
      className="pointer-events-none block border-0 bg-white"
    />
  )
}

/** Bootstrap HTML loaded into the iframe on first mount. Includes the
 *  Tailwind Play CDN + a tiny relay script that owns the channel and
 *  applies parent-sent HTML to the body without ever reloading. */
function buildBootstrap(channel: string) {
  // The channel is interpolated into a JS string literal — JSON-encode
  // it to avoid escaping headaches even though we currently only emit
  // UUIDs / random base36 strings.
  const channelLit = JSON.stringify(channel)
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<script src="https://cdn.tailwindcss.com?plugins=forms,typography,aspect-ratio,line-clamp"></script>
<style>
  html, body { margin: 0; padding: 0; height: 100%; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
  *, *::before, *::after { box-sizing: border-box; }
</style>
</head>
<body><div id="__root"></div>
<script>
  (function () {
    var CHANNEL = ${channelLit};
    var root = document.getElementById('__root');
    function apply(payload) {
      if (typeof payload.background === 'string') {
        document.body.style.background = payload.background;
      }
      if (typeof payload.html === 'string' && root.innerHTML !== payload.html) {
        root.innerHTML = payload.html;
        // Re-run the Tailwind CDN scanner so any new utility classes in
        // the freshly-inserted HTML get compiled. The CDN exposes its
        // entry as window.tailwind.refresh (v3) or auto-refreshes on
        // mutation via its built-in MutationObserver — be defensive.
        if (window.tailwind && typeof window.tailwind.refresh === 'function') {
          try { window.tailwind.refresh(); } catch (e) {}
        }
      }
    }
    window.addEventListener('message', function (e) {
      var d = e.data;
      if (!d || typeof d !== 'object') return;
      if (d.channel !== CHANNEL) return;
      if (d.type === 'set-html') apply(d);
    });
    // Tell the parent we're ready to receive content. Sent once at this
    // script's execution time (Tailwind CDN runs synchronously above so
    // it has already attached its mutation observer).
    parent.postMessage({ type: 'playground-ready', channel: CHANNEL }, '*');
  })();
</script>
</body>
</html>`
}
