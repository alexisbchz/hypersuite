"use client"

import { Canvas } from "./canvas"
import { CommandPalette } from "./chrome/command-palette"
import { EditorTabBar } from "./chrome/editor-tab-bar"
import { StatusBar } from "./chrome/status-bar"
import { ToolPalette } from "./chrome/tool-palette"
import { TopBar } from "./chrome/top-bar"
import { EditorProvider } from "./editor"
import { KeyboardShortcuts } from "./keyboard-shortcuts"
import { RightPanel } from "./panels/right-panel"

/** Top-level image editor — provides editor state, mounts the chrome
 *  (top-bar, tabs, tool palette, status bar, panels), and renders the
 *  canvas. Drop this into a route to get the full editor.
 *
 *  Responsive layout:
 *  - `lg+` (≥1024px): vertical ToolPalette + inline RightPanel.
 *  - `md` (768–1023px): vertical ToolPalette; RightPanel opened as Sheet from TopBar.
 *  - `< md` (phones): horizontal ToolPalette pinned above StatusBar; RightPanel as Sheet. */
export function ImageEditor() {
  return (
    <EditorProvider>
      <KeyboardShortcuts />
      <CommandPalette />
      <div className="flex h-svh w-full flex-col overflow-hidden bg-background text-foreground">
        <TopBar />
        <EditorTabBar />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <ToolPalette className="hidden md:flex" />
          <Canvas />
          <RightPanel />
        </div>
        <ToolPalette orientation="horizontal" className="md:hidden" />
        <StatusBar />
      </div>
    </EditorProvider>
  )
}
