"use client"

import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AudioWave02Icon,
  Delete02Icon,
  Download04Icon,
  PauseCircleIcon,
  PlayCircleIcon,
} from "@hugeicons/core-free-icons"

import { cn } from "@workspace/ui/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

import { useEditor, type Generation } from "./editor-context"

export function Canvas() {
  const { generations, selectedId, select, generating, download } = useEditor()

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-[color-mix(in_oklch,var(--color-muted),var(--color-background)_30%)]">
      {generations.length === 0 && !generating ? (
        <EmptyState />
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto flex max-w-3xl flex-col gap-3">
            {generating && <PendingCard download={download} />}
            {generations.map((g) => (
              <GenerationCard
                key={g.id}
                generation={g}
                selected={selectedId === g.id}
                onSelect={() => select(selectedId === g.id ? null : g.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <HugeiconsIcon icon={AudioWave02Icon} className="size-6" />
        </div>
        <div>
          <p className="text-sm font-medium">No generations yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Type a prompt below and pick a voice to generate speech with Pocket
            TTS.
          </p>
        </div>
      </div>
    </div>
  )
}

function PendingCard({
  download,
}: {
  download: { name: string; loaded?: number; total?: number } | null
}) {
  const pct =
    download && download.total
      ? Math.min(100, ((download.loaded ?? 0) / download.total) * 100)
      : null
  const label = download ? `Downloading ${download.name}…` : "Generating audio…"
  return (
    <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <HugeiconsIcon
            icon={AudioWave02Icon}
            className="size-5 animate-pulse"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{label}</p>
          {download && (
            <p className="text-xs text-muted-foreground">
              {formatBytes(download.loaded)} / {formatBytes(download.total)}
            </p>
          )}
        </div>
      </div>
      {pct !== null && (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}

function GenerationCard({
  generation,
  selected,
  onSelect,
}: {
  generation: Generation
  selected: boolean
  onSelect: () => void
}) {
  const { remove } = useEditor()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => {
      setPlaying(false)
      setProgress(0)
    }
    const onTime = () => {
      if (el.duration > 0) setProgress(el.currentTime / el.duration)
    }
    el.addEventListener("play", onPlay)
    el.addEventListener("pause", onPause)
    el.addEventListener("ended", onEnded)
    el.addEventListener("timeupdate", onTime)
    return () => {
      el.removeEventListener("play", onPlay)
      el.removeEventListener("pause", onPause)
      el.removeEventListener("ended", onEnded)
      el.removeEventListener("timeupdate", onTime)
    }
  }, [])

  const togglePlay = () => {
    const el = audioRef.current
    if (!el) return
    if (el.paused) el.play().catch(() => {})
    else el.pause()
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current
    if (!el || !el.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    el.currentTime = Math.max(0, Math.min(el.duration, ratio * el.duration))
  }

  const filename =
    generation.prompt
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "tts_output"

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group/card relative cursor-pointer rounded-lg border bg-background p-4 shadow-sm transition-colors",
        selected
          ? "border-primary ring-1 ring-primary"
          : "border-border hover:border-foreground/20"
      )}
    >
      <audio ref={audioRef} src={generation.url} preload="metadata" />

      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            togglePlay()
          }}
          aria-label={playing ? "Pause" : "Play"}
          className="flex size-10 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-muted"
        >
          <HugeiconsIcon
            icon={playing ? PauseCircleIcon : PlayCircleIcon}
            className="size-7"
          />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{generation.prompt}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {capitalize(generation.voice)} ·{" "}
            {generation.durationSec > 0
              ? formatDuration(generation.durationSec)
              : "—"}{" "}
            · {formatRelativeTime(generation.createdAt)}
          </p>

          <div
            onClick={(e) => {
              e.stopPropagation()
              handleSeek(e)
            }}
            className="mt-3 h-1.5 w-full cursor-pointer overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full bg-primary transition-[width]"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/card:opacity-100 data-selected:opacity-100">
          <Tooltip>
            <TooltipTrigger
              render={
                <a
                  href={generation.url}
                  download={`${filename}.wav`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Download"
                >
                  <HugeiconsIcon icon={Download04Icon} className="size-4" />
                </a>
              }
            />
            <TooltipContent>Download .wav</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    remove(generation.id)
                  }}
                  className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Delete"
                >
                  <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                </button>
              }
            />
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}

function formatBytes(bytes?: number) {
  if (bytes === undefined) return "?"
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

function capitalize(s: string) {
  return s.charAt(0).toLocaleUpperCase() + s.slice(1)
}

function formatRelativeTime(ts: number) {
  const diff = Date.now() - ts
  const sec = Math.floor(diff / 1000)
  if (sec < 5) return "just now"
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  return `${day}d ago`
}
