"use client"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { Separator } from "@workspace/ui/components/separator"

import { TracksPanel } from "./tracks-panel"
import { ClipPanel } from "./clip-panel"
import { ProjectPanel } from "./project-panel"

export function RightPanel() {
  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-border bg-background">
      <Tabs defaultValue="tracks" className="flex flex-1 flex-col">
        <TabsList className="mx-2 mt-2 grid grid-cols-3">
          <TabsTrigger value="tracks">Tracks</TabsTrigger>
          <TabsTrigger value="clip">Clip</TabsTrigger>
          <TabsTrigger value="project">Project</TabsTrigger>
        </TabsList>
        <Separator className="mt-2" />

        <TabsContent value="tracks" className="flex-1 overflow-y-auto">
          <TracksPanel />
        </TabsContent>
        <TabsContent value="clip" className="flex-1 overflow-y-auto">
          <ClipPanel />
        </TabsContent>
        <TabsContent value="project" className="flex-1 overflow-y-auto">
          <ProjectPanel />
        </TabsContent>
      </Tabs>
    </aside>
  )
}
