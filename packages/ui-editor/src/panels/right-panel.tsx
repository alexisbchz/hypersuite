"use client"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { Separator } from "@workspace/ui/components/separator"

import { FramesPanel } from "./frames-panel"
import { LibraryPanel } from "./library-panel"
import { PropertiesPanel } from "./properties-panel"

export function RightPanelContent() {
  return (
    <Tabs
      defaultValue="properties"
      className="flex h-full min-h-0 flex-col"
    >
      <TabsList className="mx-2 mt-2 grid grid-cols-3">
        <TabsTrigger value="properties">Properties</TabsTrigger>
        <TabsTrigger value="frames">Frames</TabsTrigger>
        <TabsTrigger value="library">Library</TabsTrigger>
      </TabsList>
      <Separator className="mt-2" />

      <TabsContent value="properties" className="min-h-0 flex-1 overflow-y-auto">
        <PropertiesPanel />
      </TabsContent>
      <TabsContent value="frames" className="min-h-0 flex-1 overflow-hidden">
        <FramesPanel />
      </TabsContent>
      <TabsContent value="library" className="min-h-0 flex-1 overflow-hidden">
        <LibraryPanel />
      </TabsContent>
    </Tabs>
  )
}

export function RightPanel() {
  return (
    <aside className="hidden w-72 shrink-0 flex-col border-l border-border bg-background lg:flex">
      <RightPanelContent />
    </aside>
  )
}
