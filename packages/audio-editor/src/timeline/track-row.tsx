"use client"

import { useEditor } from "../editor"
import type { Track } from "../lib/types"
import { Clip } from "./clip"
import { useClipPointer } from "./hooks/use-clip-pointer"

const HEADER_WIDTH = 168

export function TrackRow({ track }: { track: Track }) {
  const {
    clips,
    setTrackMuted,
    setTrackSoloed,
    renameTrack,
    pxPerSec,
    scrollX,
    setPlayhead,
    setSelection,
    setHovered,
  } = useEditor()
  const trackClips = clips.filter((c) => c.trackId === track.id)
  const { onClipPointerDown } = useClipPointer(track)

  const onLanePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    setPlayhead((x + scrollX) / pxPerSec)
    setSelection(null)
  }

  const onLaneMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    setHovered({ time: (x + scrollX) / pxPerSec, trackId: track.id })
  }

  return (
    <div
      className="relative flex border-b border-border"
      style={{ height: track.height }}
    >
      <div
        className="flex shrink-0 flex-col gap-1 border-r border-border bg-muted/40 px-2 py-1.5"
        style={{ width: HEADER_WIDTH }}
      >
        <div className="flex items-center gap-1">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ background: track.color }}
          />
          <input
            value={track.name}
            onChange={(e) => renameTrack(track.id, e.target.value)}
            className="h-6 flex-1 truncate bg-transparent text-xs font-medium outline-none focus:bg-background"
          />
        </div>
        <div className="flex items-center gap-1 text-[10px]">
          <button
            onClick={() => setTrackMuted(track.id, !track.muted)}
            className={
              "h-5 w-5 rounded-sm font-mono " +
              (track.muted
                ? "text-destructive-foreground bg-destructive"
                : "bg-background text-muted-foreground hover:bg-muted")
            }
            aria-label="Mute"
            title="Mute (M)"
          >
            M
          </button>
          <button
            onClick={() => setTrackSoloed(track.id, !track.soloed)}
            className={
              "h-5 w-5 rounded-sm font-mono " +
              (track.soloed
                ? "bg-amber-500 text-white"
                : "bg-background text-muted-foreground hover:bg-muted")
            }
            aria-label="Solo"
            title="Solo (S)"
          >
            S
          </button>
          <span className="ms-auto font-mono text-muted-foreground">
            {track.gainDb >= 0 ? "+" : ""}
            {track.gainDb.toFixed(1)} dB
          </span>
        </div>
      </div>

      <div
        className="relative flex-1 overflow-hidden"
        style={{
          background:
            "color-mix(in oklch, var(--color-muted), var(--color-background) 60%)",
        }}
        data-track-id={track.id}
        onPointerDown={onLanePointerDown}
        onMouseMove={onLaneMouseMove}
      >
        {trackClips.map((clip) => (
          <Clip
            key={clip.id}
            clip={clip}
            track={track}
            onPointerDown={(e, side) => onClipPointerDown(e, clip, side)}
          />
        ))}
      </div>
    </div>
  )
}

export const TRACK_HEADER_WIDTH = HEADER_WIDTH
