import { Canvas } from "./_components/canvas"
import { EditorProvider } from "./_components/editor-context"
import { KeyboardShortcuts } from "./_components/keyboard-shortcuts"
import { RightPanel } from "./_components/right-panel"
import { StatusBar } from "./_components/status-bar"
import { ToolPalette } from "./_components/tool-palette"
import { TopBar } from "./_components/top-bar"

export const metadata = {
  title: "Image",
}

export default function Page() {
  return (
    <EditorProvider>
      <KeyboardShortcuts />
      <div className="flex h-svh w-full flex-col overflow-hidden bg-background text-foreground">
        <TopBar />
        <div className="flex flex-1 overflow-hidden">
          <ToolPalette />
          <Canvas />
          <RightPanel />
        </div>
        <StatusBar />
      </div>
    </EditorProvider>
  )
}
