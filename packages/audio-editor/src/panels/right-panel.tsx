"use client"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { ScrollArea } from "@workspace/ui/components/scroll-area"

import { TracksPanel } from "./tracks-panel"
import { ClipPanel } from "./clip-panel"
import { ProjectPanel } from "./project-panel"

export function RightPanel() {
  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-border bg-background">
      <Tabs defaultValue="tracks" className="flex flex-1 flex-col">
        <TabsList className="m-2">
          <TabsTrigger value="tracks">Tracks</TabsTrigger>
          <TabsTrigger value="clip">Clip</TabsTrigger>
          <TabsTrigger value="project">Project</TabsTrigger>
        </TabsList>
        <ScrollArea className="flex-1">
          <TabsContent value="tracks">
            <TracksPanel />
          </TabsContent>
          <TabsContent value="clip">
            <ClipPanel />
          </TabsContent>
          <TabsContent value="project">
            <ProjectPanel />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </aside>
  )
}
