"use client"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { Separator } from "@workspace/ui/components/separator"
import { AssetsPanel } from "../panels/assets-panel"
import { LayersPanel } from "../panels/layers-panel"
import { PropertiesPanel } from "../panels/properties-panel"

/** The properties / layers / assets stack. Used inline as the right-hand
 *  sidebar on desktop and inside a Sheet on tablet/phone — keep this
 *  component layout-agnostic so both hosts can size it themselves. */
export function RightPanelContent({
  defaultValue = "properties",
}: {
  defaultValue?: "properties" | "layers" | "assets"
}) {
  return (
    <Tabs defaultValue={defaultValue} className="flex h-full min-h-0 flex-col">
      <TabsList className="mx-2 mt-2 grid grid-cols-3">
        <TabsTrigger value="properties">Properties</TabsTrigger>
        <TabsTrigger value="layers">Layers</TabsTrigger>
        <TabsTrigger value="assets">Assets</TabsTrigger>
      </TabsList>
      <Separator className="mt-2" />

      <TabsContent value="properties" className="min-h-0 flex-1 overflow-y-auto">
        <PropertiesPanel />
      </TabsContent>
      <TabsContent value="layers" className="min-h-0 flex-1 overflow-hidden">
        <LayersPanel />
      </TabsContent>
      <TabsContent value="assets" className="min-h-0 flex-1 overflow-hidden">
        <AssetsPanel />
      </TabsContent>
    </Tabs>
  )
}

/** Inline desktop right-hand panel. Hidden below the `lg` breakpoint —
 *  on smaller viewports the panel is opened from the TopBar as a Sheet. */
export function RightPanel() {
  return (
    <aside className="hidden w-72 shrink-0 flex-col border-l border-border bg-background lg:flex">
      <RightPanelContent />
    </aside>
  )
}
