"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  NextIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  PreviousIcon,
  StopCircleIcon,
  VolumeHighIcon,
  ZoomInAreaIcon,
  ZoomOutAreaIcon,
} from "@hugeicons/core-free-icons"

import { Button } from "@workspace/ui/components/button"
import { Slider } from "@workspace/ui/components/slider"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

import { useEditor } from "../editor"
import { dbToGain, formatTime } from "../lib/geometry"

export function TransportBar() {
  const {
    playhead,
    setPlayhead,
    playing,
    play,
    pause,
    stop,
    masterGainDb,
    setMasterGainDb,
    pxPerSec,
    setPxPerSec,
    zoomBy,
    clips,
  } = useEditor()

  const totalDuration = clips.reduce(
    (max, c) => Math.max(max, c.start + c.duration),
    0
  )

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setPlayhead(0)}
                aria-label="Go to start"
              >
                <HugeiconsIcon icon={PreviousIcon} />
              </Button>
            }
          />
          <TooltipContent>Go to start · Home</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant={playing ? "default" : "outline"}
                size="icon-sm"
                onClick={() => (playing ? pause() : void play())}
                aria-label={playing ? "Pause" : "Play"}
              >
                <HugeiconsIcon
                  icon={playing ? PauseCircleIcon : PlayCircleIcon}
                />
              </Button>
            }
          />
          <TooltipContent>{playing ? "Pause" : "Play"} · Space</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={stop}
                aria-label="Stop"
              >
                <HugeiconsIcon icon={StopCircleIcon} />
              </Button>
            }
          />
          <TooltipContent>Stop · Enter</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setPlayhead(totalDuration)}
                aria-label="Go to end"
              >
                <HugeiconsIcon icon={NextIcon} />
              </Button>
            }
          />
          <TooltipContent>Go to end · End</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex items-baseline gap-1.5 px-2 font-mono">
        <span className="text-base font-semibold tabular-nums">
          {formatTime(playhead, true)}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          / {formatTime(totalDuration)}
        </span>
      </div>

      <div className="ms-auto flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => zoomBy(1 / 1.4)}
                  aria-label="Zoom out"
                >
                  <HugeiconsIcon icon={ZoomOutAreaIcon} />
                </Button>
              }
            />
            <TooltipContent>Zoom out · ⌘−</TooltipContent>
          </Tooltip>
          <Slider
            min={8}
            max={800}
            step={1}
            value={[pxPerSec]}
            onValueChange={(v) =>
              setPxPerSec(Array.isArray(v) ? v[0]! : (v as number))
            }
            className="w-32"
            aria-label="Zoom"
          />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => zoomBy(1.4)}
                  aria-label="Zoom in"
                >
                  <HugeiconsIcon icon={ZoomInAreaIcon} />
                </Button>
              }
            />
            <TooltipContent>Zoom in · ⌘+</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={VolumeHighIcon}
            className="size-4 text-muted-foreground"
          />
          <Slider
            min={-60}
            max={6}
            step={0.5}
            value={[masterGainDb]}
            onValueChange={(v) =>
              setMasterGainDb(Array.isArray(v) ? v[0]! : (v as number))
            }
            className="w-32"
            aria-label="Master volume"
          />
          <span className="w-12 text-right font-mono text-xs text-muted-foreground tabular-nums">
            {masterGainDb >= 0 ? "+" : ""}
            {masterGainDb.toFixed(1)} dB
          </span>
        </div>
      </div>
    </div>
  )
}
