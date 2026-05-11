"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  Delete02Icon,
  Lock01Icon,
  LockKeyholeIcon,
} from "@hugeicons/core-free-icons"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Slider } from "@workspace/ui/components/slider"

import { useEditor } from "../editor"

export function PropertiesPanel() {
  const {
    selectedFrame,
    patch,
    patchImage,
    patchPlayground,
    rename,
    remove,
    commit,
  } = useEditor()

  if (!selectedFrame) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
        Select a frame to edit its properties.
      </div>
    )
  }

  const frame = selectedFrame

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center gap-2">
        <Input
          value={frame.name}
          onChange={(e) => rename(frame.id, e.target.value)}
          onBlur={commit}
          className="h-7 flex-1"
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={frame.locked ? "Unlock" : "Lock"}
          onClick={() => {
            patch(frame.id, { locked: !frame.locked })
            commit()
          }}
        >
          <HugeiconsIcon
            icon={frame.locked ? LockKeyholeIcon : Lock01Icon}
            className="size-3.5"
          />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete"
          onClick={() => remove(frame.id)}
        >
          <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
        </Button>
      </div>

      <Section title="Layout">
        <Row label="X">
          <NumberInput
            value={frame.x}
            onChange={(v) => patch(frame.id, { x: v })}
            onCommit={commit}
          />
        </Row>
        <Row label="Y">
          <NumberInput
            value={frame.y}
            onChange={(v) => patch(frame.id, { y: v })}
            onCommit={commit}
          />
        </Row>
        <Row label="W">
          <NumberInput
            value={frame.width}
            min={20}
            onChange={(v) => patch(frame.id, { width: v })}
            onCommit={commit}
          />
        </Row>
        <Row label="H">
          <NumberInput
            value={frame.height}
            min={20}
            onChange={(v) => patch(frame.id, { height: v })}
            onCommit={commit}
          />
        </Row>
      </Section>

      {frame.kind === "playground" && (
        <Section title="Playground">
          <Row label="Background">
            <input
              type="color"
              value={frame.background}
              onChange={(e) =>
                patchPlayground(frame.id, { background: e.target.value })
              }
              onBlur={commit}
              className="h-7 w-full cursor-pointer rounded-md border border-border bg-background p-0.5"
            />
          </Row>
          <Row label="Preset size">
            <div className="grid grid-cols-3 gap-1">
              <PresetButton
                label="iPhone"
                onClick={() => {
                  patch(frame.id, { width: 390, height: 844 })
                  commit()
                }}
              />
              <PresetButton
                label="iPad"
                onClick={() => {
                  patch(frame.id, { width: 820, height: 1180 })
                  commit()
                }}
              />
              <PresetButton
                label="Desktop"
                onClick={() => {
                  patch(frame.id, { width: 1440, height: 900 })
                  commit()
                }}
              />
              <PresetButton
                label="Card"
                onClick={() => {
                  patch(frame.id, { width: 480, height: 320 })
                  commit()
                }}
              />
              <PresetButton
                label="Square"
                onClick={() => {
                  patch(frame.id, { width: 600, height: 600 })
                  commit()
                }}
              />
              <PresetButton
                label="Wide"
                onClick={() => {
                  patch(frame.id, { width: 1200, height: 630 })
                  commit()
                }}
              />
            </div>
          </Row>
        </Section>
      )}

      {frame.kind === "image" && (
        <Section title="Image">
          <Row label="Opacity">
            <div className="flex items-center gap-2">
              <Slider
                value={[frame.opacity]}
                min={0}
                max={100}
                step={1}
                onValueChange={([v]) =>
                  patchImage(frame.id, { opacity: v ?? frame.opacity })
                }
                onValueCommit={commit}
                className="flex-1"
              />
              <span className="w-9 text-right font-mono text-[11px] text-muted-foreground">
                {Math.round(frame.opacity)}%
              </span>
            </div>
          </Row>
          <p className="text-[11px] text-muted-foreground">
            Tip: drop the opacity so the reference acts as tracing paper behind
            your playground.
          </p>
        </Section>
      )}
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      <div className="flex flex-col gap-1.5">{children}</div>
    </section>
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[64px_1fr] items-center gap-2">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function NumberInput({
  value,
  onChange,
  onCommit,
  min,
}: {
  value: number
  onChange: (v: number) => void
  onCommit: () => void
  min?: number
}) {
  return (
    <Input
      type="number"
      value={Number.isFinite(value) ? Math.round(value) : 0}
      min={min}
      onChange={(e) => {
        const n = Number(e.target.value)
        if (Number.isFinite(n)) onChange(n)
      }}
      onBlur={onCommit}
      className="h-7 font-mono"
    />
  )
}

function PresetButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="h-7 px-2 text-[11px]"
    >
      {label}
    </Button>
  )
}
