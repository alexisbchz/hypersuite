"use client"

import { useState } from "react"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable"

import { Canvas } from "./canvas/canvas"
import { StatusBar } from "./chrome/status-bar"
import { ToolPalette } from "./chrome/tool-palette"
import { TopBar } from "./chrome/top-bar"
import { ShortcutsDialog } from "./dialogs/shortcuts-dialog"
import { EditorProvider } from "./editor"
import { KeyboardShortcuts } from "./keyboard-shortcuts"
import { CodePanel } from "./panels/code-panel"
import { RightPanel } from "./panels/right-panel"

/** Top-level Hypersuite UI editor — Figma-like infinite canvas with two
 *  kinds of frames (reference images + live Tailwind playgrounds) and a
 *  bottom-docked Monaco code editor for editing the selected playground.
 *
 *  Layout:
 *  - `lg+`: vertical ToolPalette · resizable [Canvas/CodePanel] · RightPanel
 *  - `md`:  vertical ToolPalette · resizable [Canvas/CodePanel] (no inline RightPanel)
 *  - `< md`: horizontal ToolPalette pinned above StatusBar */
export function UiEditor() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  return (
    <EditorProvider>
      <KeyboardShortcuts />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <div className="flex h-svh w-full flex-col overflow-hidden bg-background text-foreground">
        <TopBar onToggleShortcuts={() => setShortcutsOpen(true)} />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <ToolPalette className="hidden md:flex" />
          <div className="flex min-w-0 flex-1 flex-col">
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={62} minSize={20}>
                <Canvas />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={38} minSize={15}>
                <CodePanel />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
          <RightPanel />
        </div>
        <ToolPalette orientation="horizontal" className="md:hidden" />
        <StatusBar />
      </div>
    </EditorProvider>
  )
}
