"use client"

import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Button } from "@workspace/ui/components/button"

import { useEditor } from "../editor"
import { formatTime } from "../lib/geometry"

export function ProjectPanel() {
  const {
    projectName,
    setProjectName,
    sampleRate,
    bitDepth,
    setBitDepth,
    clips,
    tracks,
  } = useEditor()

  const total = clips.reduce((m, c) => Math.max(m, c.start + c.duration), 0)

  return (
    <div className="space-y-4 p-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-normal text-muted-foreground">
          Name
        </Label>
        <Input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-normal text-muted-foreground">
          Sample rate
        </Label>
        <Input value={`${sampleRate} Hz`} readOnly />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-normal text-muted-foreground">
          Export bit depth
        </Label>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between"
              >
                {bitDepth}-bit
              </Button>
            }
          />
          <DropdownMenuContent>
            {[16, 24, 32].map((b) => (
              <DropdownMenuItem
                key={b}
                onClick={() => setBitDepth(b as 16 | 24 | 32)}
              >
                {b}-bit
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <dl className="grid grid-cols-2 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Tracks</dt>
        <dd className="text-right font-mono">{tracks.length}</dd>
        <dt className="text-muted-foreground">Clips</dt>
        <dd className="text-right font-mono">{clips.length}</dd>
        <dt className="text-muted-foreground">Duration</dt>
        <dd className="text-right font-mono">{formatTime(total)}</dd>
      </dl>
    </div>
  )
}
