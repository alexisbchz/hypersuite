"use client"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { Separator } from "@workspace/ui/components/separator"
import { AssetsPanel } from "./assets-panel"
import { LayersPanel } from "./layers-panel"
import { PropertiesPanel } from "./properties-panel"

export function RightPanel() {
  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-border bg-background">
      <Tabs defaultValue="properties" className="flex flex-1 flex-col">
        <TabsList className="mx-2 mt-2 grid grid-cols-3">
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="layers">Layers</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
        </TabsList>
        <Separator className="mt-2" />

        <TabsContent value="properties" className="flex-1 overflow-y-auto">
          <PropertiesPanel />
        </TabsContent>
        <TabsContent value="layers" className="flex-1 overflow-hidden">
          <LayersPanel />
        </TabsContent>
        <TabsContent value="assets" className="flex-1 overflow-hidden">
          <AssetsPanel />
        </TabsContent>
      </Tabs>
    </aside>
  )
}
