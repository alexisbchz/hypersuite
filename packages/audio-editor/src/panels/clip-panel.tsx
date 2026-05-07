"use client"

import { Slider } from "@workspace/ui/components/slider"

import { useEditor } from "../editor"
import { formatTime } from "../lib/geometry"

export function ClipPanel() {
  const {
    clips,
    selection,
    setClipGain,
    setClipFade,
    renameClip,
  } = useEditor()

  const selectedIds =
    selection?.kind === "clips" ? new Set(selection.clipIds) : new Set<string>()
  const selected = clips.filter((c) => selectedIds.has(c.id))

  if (selected.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Select a clip to edit its properties.
      </div>
    )
  }

  if (selected.length > 1) {
    return (
      <div className="p-3 text-sm">
        <p className="text-muted-foreground">
          {selected.length} clips selected.
        </p>
      </div>
    )
  }

  const c = selected[0]!
  return (
    <div className="space-y-4 p-3">
      <div className="space-y-1.5">
        <label className="text-xs font-normal text-muted-foreground">
          Name
        </label>
        <input
          value={c.name}
          onChange={(e) => renameClip(c.id, e.target.value)}
          className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-foreground/30"
        />
      </div>

      <dl className="grid grid-cols-2 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Start</dt>
        <dd className="text-right font-mono">{formatTime(c.start, true)}</dd>
        <dt className="text-muted-foreground">Duration</dt>
        <dd className="text-right font-mono">{formatTime(c.duration, true)}</dd>
        <dt className="text-muted-foreground">Source offset</dt>
        <dd className="text-right font-mono">{formatTime(c.offset, true)}</dd>
      </dl>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Gain</span>
          <span className="font-mono">
            {c.gainDb >= 0 ? "+" : ""}
            {c.gainDb.toFixed(1)} dB
          </span>
        </div>
        <Slider
          min={-60}
          max={12}
          step={0.5}
          value={[c.gainDb]}
          onValueChange={(v) =>
            setClipGain(c.id, Array.isArray(v) ? v[0]! : (v as number))
          }
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Fade in</span>
          <span className="font-mono">
            {c.fadeInSec.toFixed(2)} s
          </span>
        </div>
        <Slider
          min={0}
          max={Math.max(0.01, c.duration / 2)}
          step={0.01}
          value={[c.fadeInSec]}
          onValueChange={(v) =>
            setClipFade(
              c.id,
              Array.isArray(v) ? v[0]! : (v as number),
              undefined
            )
          }
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Fade out</span>
          <span className="font-mono">
            {c.fadeOutSec.toFixed(2)} s
          </span>
        </div>
        <Slider
          min={0}
          max={Math.max(0.01, c.duration / 2)}
          step={0.01}
          value={[c.fadeOutSec]}
          onValueChange={(v) =>
            setClipFade(
              c.id,
              undefined,
              Array.isArray(v) ? v[0]! : (v as number)
            )
          }
        />
      </div>
    </div>
  )
}
