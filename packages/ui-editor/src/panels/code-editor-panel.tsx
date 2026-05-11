"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"

import { Skeleton } from "@workspace/ui/components/skeleton"

import { useEditor } from "../editor"
import { TAILWIND_CLASSES } from "../lib/tailwind-classes"

type MonacoModule = typeof import("monaco-editor")

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full flex-col gap-2 p-3">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    ),
  }
)

/** Monaco editor bound to the currently-selected playground frame. The
 *  editor is mounted once per selection — `path` is keyed on the frame id
 *  so Monaco preserves per-frame undo stacks and cursor positions, the
 *  way a multi-file IDE would. */
export function CodeEditorPanel() {
  const { selectedFrame, patchPlayground, commit } = useEditor()
  const isPlayground = selectedFrame?.kind === "playground"

  const commitTimerRef = useRef<number | null>(null)
  const monacoConfiguredRef = useRef(false)

  // Resolved theme for Monaco — track <html>'s `dark` class so the editor
  // theme follows next-themes without us having to subscribe to its
  // context (the panel is in @workspace/ui-editor which doesn't import
  // next-themes directly).
  const [darkTheme, setDarkTheme] = useState(false)
  useEffect(() => {
    if (typeof window === "undefined") return
    const el = document.documentElement
    const sync = () => setDarkTheme(el.classList.contains("dark"))
    sync()
    const obs = new MutationObserver(sync)
    obs.observe(el, { attributes: true, attributeFilter: ["class"] })
    return () => obs.disconnect()
  }, [])

  if (!isPlayground || !selectedFrame) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
        Select a playground to edit its code.
      </div>
    )
  }

  return (
    <MonacoEditor
      key={selectedFrame.id}
      path={`${selectedFrame.id}.html`}
      defaultLanguage="html"
      defaultValue={selectedFrame.html}
      theme={darkTheme ? "vs-dark" : "vs"}
      onChange={(value) => {
        const next = value ?? ""
        // Patch immediately (without history) so the preview updates as
        // the user types. Debounce a real `commit()` so undo lands in
        // word-sized chunks rather than per-keystroke.
        patchPlayground(selectedFrame.id, { html: next })
        if (commitTimerRef.current) {
          window.clearTimeout(commitTimerRef.current)
        }
        commitTimerRef.current = window.setTimeout(() => {
          commit()
          commitTimerRef.current = null
        }, 500)
      }}
      beforeMount={(monaco) => {
        if (monacoConfiguredRef.current) return
        monacoConfiguredRef.current = true
        configureTailwindCompletion(monaco)
      }}
      options={{
        fontSize: 13,
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        lineNumbers: "on",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: "on",
        tabSize: 2,
        renderLineHighlight: "all",
        padding: { top: 12, bottom: 12 },
        smoothScrolling: true,
        automaticLayout: true,
        formatOnPaste: true,
        guides: { indentation: true, bracketPairs: true },
        bracketPairColorization: { enabled: true },
        suggest: { showWords: false },
      }}
    />
  )
}

/** Add a Tailwind class-name completion provider scoped to `class="…"` /
 *  `className="…"` / `class='…'` attributes in HTML. We don't try to be a
 *  full LSP — that requires running the real `@tailwindcss/language-service`
 *  which depends on Node-only resolvers — but a curated 4000-class word
 *  list covers the common case and feels great. */
function configureTailwindCompletion(monaco: MonacoModule) {
  monaco.languages.registerCompletionItemProvider("html", {
    triggerCharacters: [" ", '"', "'", "-", ":"],
    provideCompletionItems(model, position) {
      const lineText = model.getLineContent(position.lineNumber)
      const before = lineText.slice(0, position.column - 1)
      // Look back for the nearest unmatched `class="` / `className="`.
      const attrMatch = before.match(
        /\b(?:class|className)\s*=\s*("|')([^"']*)$/
      )
      if (!attrMatch) return { suggestions: [] }

      // Build the partial word being typed (after the last whitespace).
      const partialMatch = before.match(/[^\s"']*$/)
      const partial = partialMatch ? partialMatch[0] : ""
      const wordStartCol = position.column - partial.length

      const range = new monaco.Range(
        position.lineNumber,
        wordStartCol,
        position.lineNumber,
        position.column
      )

      const filtered = partial
        ? TAILWIND_CLASSES.filter((c) => c.includes(partial))
        : TAILWIND_CLASSES

      // Cap to 200 so Monaco doesn't grind to a halt rendering a 4000-item
      // popup the user will never scroll through.
      const suggestions = filtered.slice(0, 200).map((cls) => ({
        label: cls,
        kind: monaco.languages.CompletionItemKind.Constant,
        insertText: cls,
        range,
        sortText: cls.startsWith(partial) ? `0${cls}` : `1${cls}`,
      }))

      return { suggestions }
    },
  })
}
