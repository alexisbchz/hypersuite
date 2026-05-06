"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  AdjustPositionIcon,
  PaintBucketIcon,
  Rotate01Icon,
  Settings02Icon,
} from "@hugeicons/core-free-icons"

import { Input } from "@workspace/ui/components/input"
import { Switch } from "@workspace/ui/components/switch"
import { useEditor } from "./editor-context"
import type { Layer } from "./types"

const BLEND_MODES = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "soft-light",
  "hard-light",
  "difference",
  "exclusion",
  "hue",
  "saturation",
  "color",
  "luminosity",
] as const

export function PropertiesPanel() {
  const { layers, selectedId, patch } = useEditor()
  const layer = layers.find((l) => l.id === selectedId) ?? null

  if (!layer) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-10 text-center">
        <div className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <HugeiconsIcon icon={Settings02Icon} className="size-4" />
        </div>
        <p className="text-xs font-medium text-foreground">No selection</p>
        <p className="text-xs text-muted-foreground">
          Select a layer in the canvas or in the layers panel to edit its
          properties.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-2">
        <p className="truncate text-xs font-medium text-foreground">{layer.name}</p>
        <p className="text-[11px] text-muted-foreground capitalize">
          {layer.kind} layer
        </p>
      </div>

      <div className="flex flex-col">
        <Section title="Transform" icon={AdjustPositionIcon}>
          <div className="grid grid-cols-2 gap-2">
            <NumField label="X" value={layer.x} onChange={(v) => patch(layer.id, { x: v })} />
            <NumField label="Y" value={layer.y} onChange={(v) => patch(layer.id, { y: v })} />
            <NumField label="W" value={layer.width} onChange={(v) => patch(layer.id, { width: v })} />
            <NumField label="H" value={layer.height} onChange={(v) => patch(layer.id, { height: v })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumField
              label={<HugeiconsIcon icon={Rotate01Icon} className="size-3" />}
              value={layer.rotation}
              onChange={(v) => patch(layer.id, { rotation: v })}
              suffix="°"
            />
            <NumField
              label="Op"
              value={layer.opacity}
              onChange={(v) => patch(layer.id, { opacity: clamp(v, 0, 100) })}
              suffix="%"
            />
          </div>
        </Section>

        <Section title="Appearance" icon={PaintBucketIcon}>
          <Row label="Blend mode">
            <select
              value={layer.blendMode}
              onChange={(e) => patch(layer.id, { blendMode: e.target.value })}
              className="h-7 w-full rounded-md border border-border bg-background px-2 text-xs capitalize outline-none focus:border-ring"
            >
              {BLEND_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Row>
          {layer.color && (
            <Row label="Fill">
              <ColorField value={layer.color} onChange={(c) => patch(layer.id, { color: c })} />
            </Row>
          )}
          <Row label="Visible">
            <Switch
              checked={layer.visible}
              onCheckedChange={(v) => patch(layer.id, { visible: v })}
            />
          </Row>
          <Row label="Locked">
            <Switch
              checked={layer.locked}
              onCheckedChange={(v) => patch(layer.id, { locked: v })}
            />
          </Row>
        </Section>
      </div>
    </div>
  )
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon: typeof Settings02Icon
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-border">
      <div className="flex items-center gap-1.5 px-3 pt-3 pb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        <HugeiconsIcon icon={icon} className="size-3" />
        {title}
      </div>
      <div className="flex flex-col gap-2 px-3 pb-3">{children}</div>
    </div>
  )
}

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function NumField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: React.ReactNode
  value: number
  onChange: (v: number) => void
  suffix?: string
}) {
  return (
    <label className="group/field relative flex items-center rounded-md border border-border bg-background focus-within:border-ring">
      <span className="inline-flex w-6 shrink-0 items-center justify-center text-[11px] text-muted-foreground">
        {label}
      </span>
      <input
        type="number"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-7 w-full bg-transparent pe-1 text-right text-xs tabular-nums outline-none"
      />
      {suffix && (
        <span className="pe-1.5 text-[10px] text-muted-foreground">{suffix}</span>
      )}
    </label>
  )
}

function ColorField({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const isHex = /^#[0-9a-fA-F]{6}$/.test(value)
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-background pe-1.5 ps-1.5 focus-within:border-ring">
      <span
        aria-hidden
        className="inline-block size-4 rounded ring-1 ring-border"
        style={{ background: value }}
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 border-0 bg-transparent px-0 font-mono text-xs focus-visible:ring-0"
      />
      {isHex && (
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-5 cursor-pointer rounded border-0 bg-transparent p-0"
        />
      )}
    </div>
  )
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}
