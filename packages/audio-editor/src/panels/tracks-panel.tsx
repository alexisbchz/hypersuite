"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons"

import { Button } from "@workspace/ui/components/button"
import { Slider } from "@workspace/ui/components/slider"
import { Switch } from "@workspace/ui/components/switch"

import { useEditor } from "../editor"

export function TracksPanel() {
  const {
    tracks,
    addTrack,
    removeTrack,
    setTrackMuted,
    setTrackSoloed,
    setTrackGain,
    setTrackPan,
    renameTrack,
  } = useEditor()

  return (
    <div className="flex flex-col gap-3 p-3">
      <Button
        variant="outline"
        size="sm"
        onClick={() => addTrack()}
        className="self-start"
      >
        <HugeiconsIcon icon={Add01Icon} />
        Add track
      </Button>

      <div className="flex flex-col gap-3">
        {tracks.map((t) => (
          <div
            key={t.id}
            className="rounded-md border border-border bg-muted/20 p-3"
          >
            <div className="flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: t.color }}
              />
              <input
                value={t.name}
                onChange={(e) => renameTrack(t.id, e.target.value)}
                className="h-7 flex-1 rounded-sm bg-transparent px-1.5 text-sm font-medium outline-none focus:bg-background"
              />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => removeTrack(t.id)}
                aria-label="Remove track"
              >
                <HugeiconsIcon icon={Delete02Icon} />
              </Button>
            </div>

            <div className="mt-3 flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5">
                <Switch
                  checked={t.muted}
                  onCheckedChange={(v) => setTrackMuted(t.id, v)}
                />
                Mute
              </label>
              <label className="flex items-center gap-1.5">
                <Switch
                  checked={t.soloed}
                  onCheckedChange={(v) => setTrackSoloed(t.id, v)}
                />
                Solo
              </label>
            </div>

            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Gain</span>
                <span className="font-mono">
                  {t.gainDb >= 0 ? "+" : ""}
                  {t.gainDb.toFixed(1)} dB
                </span>
              </div>
              <Slider
                min={-60}
                max={6}
                step={0.5}
                value={[t.gainDb]}
                onValueChange={(v) =>
                  setTrackGain(t.id, Array.isArray(v) ? v[0]! : (v as number))
                }
              />
            </div>

            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Pan</span>
                <span className="font-mono">
                  {t.pan === 0
                    ? "C"
                    : t.pan < 0
                      ? `L${Math.round(-t.pan * 100)}`
                      : `R${Math.round(t.pan * 100)}`}
                </span>
              </div>
              <Slider
                min={-1}
                max={1}
                step={0.05}
                value={[t.pan]}
                onValueChange={(v) =>
                  setTrackPan(t.id, Array.isArray(v) ? v[0]! : (v as number))
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
