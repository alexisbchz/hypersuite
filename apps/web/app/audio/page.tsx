import { Canvas } from "./_components/canvas"
import { Composer } from "./_components/composer"
import { EditorProvider } from "./_components/editor-context"
import { TopBar } from "./_components/top-bar"

export const metadata = {
  title: "Audio",
}

export default function Page() {
  return (
    <EditorProvider>
      <div className="flex h-svh w-full flex-col overflow-hidden bg-background text-foreground">
        <TopBar />
        <Canvas />
        <Composer />
      </div>
    </EditorProvider>
  )
}
