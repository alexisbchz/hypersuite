"use client"

import { TopBar } from "./chrome/top-bar"
import { ToolPalette } from "./chrome/tool-palette"
import { TransportBar } from "./chrome/transport-bar"
import { StatusBar } from "./chrome/status-bar"
import { ExportDialog } from "./dialogs/export-dialog"
import { ShortcutsDialog } from "./dialogs/shortcuts"
import { TtsComposer } from "./dialogs/tts-composer"
import { EditorProvider } from "./editor"
import { KeyboardShortcuts } from "./keyboard-shortcuts"
import { RightPanel } from "./panels/right-panel"
import { Timeline } from "./timeline/timeline"

/**
 * Top-level audio editor — provides editor state, mounts the chrome
 * (top-bar, transport, tool palette, right panel, status bar) and
 * renders the timeline. Drop this into a route to get the full editor.
 */
export function AudioEditor() {
  return (
    <EditorProvider>
      <KeyboardShortcuts />
      <TtsComposer />
      <ExportDialog />
      <ShortcutsDialog />
      <div className="flex h-svh w-full flex-col overflow-hidden bg-background text-foreground">
        <TopBar />
        <TransportBar />
        <div className="flex flex-1 overflow-hidden">
          <ToolPalette />
          <Timeline />
          <RightPanel />
        </div>
        <StatusBar />
      </div>
    </EditorProvider>
  )
}
