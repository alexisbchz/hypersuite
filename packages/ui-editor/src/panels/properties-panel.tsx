"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  Delete02Icon,
  Image01Icon,
  LinkSquare02Icon,
  LockIcon,
  LockKeyIcon,
  PaintBoardIcon,
  RulerIcon,
  Settings02Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@workspace/ui/components/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import { Input } from "@workspace/ui/components/input"
import { Slider } from "@workspace/ui/components/slider"

import { useEditor } from "../editor"
import { ColorPicker } from "../pickers/color-picker"

const PRESETS: Array<{ label: string; w: number; h: number }> = [
  { label: "iPhone", w: 390, h: 844 },
  { label: "iPad", w: 820, h: 1180 },
  { label: "Desktop", w: 1440, h: 900 },
  { label: "Card", w: 480, h: 320 },
  { label: "Square", w: 600, h: 600 },
  { label: "Wide", w: 1200, h: 630 },
]

export function PropertiesPanel() {
  const {
    selectedFrame,
    selectedIds,
    patch,
    patchImage,
    patchPlayground,
    rename,
    remove,
    duplicate,
    commit,
    frames,
  } = useEditor()

  if (!selectedFrame) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-border px-3 py-2">
          <p className="px-1 text-xs font-medium text-foreground">No selection</p>
          <p className="px-1 text-[11px] text-muted-foreground">
            {frames.length} frame{frames.length === 1 ? "" : "s"} on canvas
          </p>
        </div>
        <div className="flex flex-1 items-center justify-center p-6 text-center text-[11px] text-muted-foreground">
          Click a playground or image on the canvas to edit it. Tap{" "}
          <kbd className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono">P</kbd>
          to drop a new playground.
        </div>
      </div>
    )
  }

  const frame = selectedFrame
  const multi = selectedIds.length > 1

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        <HugeiconsIcon
          icon={frame.kind === "image" ? Image01Icon : LinkSquare02Icon}
          className="size-3.5 text-muted-foreground"
        />
        <Input
          value={frame.name}
          onChange={(e) => rename(frame.id, e.target.value)}
          onBlur={commit}
          className="h-7 flex-1 border-0 bg-transparent px-1.5 focus-visible:border-transparent focus-visible:ring-0"
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
            icon={frame.locked ? LockKeyIcon : LockIcon}
            className="size-3.5"
          />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Duplicate"
          onClick={() => duplicate(frame.id)}
        >
          <HugeiconsIcon icon={Settings02Icon} className="size-3.5" />
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

      <Section title="Layout" icon={RulerIcon}>
        <div className="grid grid-cols-2 gap-2">
          <NumField
            label="X"
            value={frame.x}
            onFocus={commit}
            onChange={(v) => patch(frame.id, { x: v })}
          />
          <NumField
            label="Y"
            value={frame.y}
            onFocus={commit}
            onChange={(v) => patch(frame.id, { y: v })}
          />
          <NumField
            label="W"
            value={frame.width}
            onFocus={commit}
            onChange={(v) => patch(frame.id, { width: Math.max(20, v) })}
          />
          <NumField
            label="H"
            value={frame.height}
            onFocus={commit}
            onChange={(v) => patch(frame.id, { height: Math.max(20, v) })}
          />
        </div>
      </Section>

      {frame.kind === "playground" && (
        <>
          <Section title="Playground" icon={LinkSquare02Icon}>
            <Row label="Background">
              <ColorPicker
                value={frame.background}
                onChange={(v) =>
                  patchPlayground(frame.id, { background: v })
                }
                onCommit={() => commit()}
              />
            </Row>
          </Section>
          <Section title="Frame size" icon={PaintBoardIcon}>
            <div className="grid grid-cols-3 gap-1">
              {PRESETS.map((p) => (
                <Button
                  key={p.label}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    patch(frame.id, { width: p.w, height: p.h })
                    commit()
                  }}
                  className="h-7 px-2 text-[11px]"
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              <span className="font-mono">{frame.width}×{frame.height}</span>{" "}
              · Use{" "}
              <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                ⇧ + drag handle
              </kbd>{" "}
              to keep aspect.
            </p>
          </Section>
        </>
      )}

      {frame.kind === "image" && (
        <Section title="Reference image" icon={Image01Icon}>
          <Row label="Opacity">
            <div className="flex items-center gap-2">
              <Slider
                value={[frame.opacity]}
                min={0}
                max={100}
                step={1}
                onValueChange={(v) => {
                  if (Array.isArray(v) && typeof v[0] === "number") {
                    patchImage(frame.id, { opacity: v[0] })
                  }
                }}
                onValueCommitted={commit}
                className="flex-1"
              />
              <span className="w-9 text-right font-mono text-[11px] text-muted-foreground">
                {Math.round(frame.opacity)}%
              </span>
            </div>
          </Row>
          <p className="text-[11px] text-muted-foreground">
            Lower the opacity to use this as a tracing reference behind the
            playground you&apos;re rebuilding.
          </p>
        </Section>
      )}

      {multi && (
        <Section title="Selection" icon={Settings02Icon}>
          <p className="text-[11px] text-muted-foreground">
            {selectedIds.length} frames selected. Drag to move them together,
            or hit{" "}
            <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
              ⌘D
            </kbd>{" "}
            to duplicate.
          </p>
        </Section>
      )}
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

function Row({
  label,
  children,
}: {
  label: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] text-muted-foreground">
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function NumField({
  label,
  value,
  onChange,
  onFocus,
}: {
  label: React.ReactNode
  value: number
  onChange: (v: number) => void
  onFocus?: () => void
}) {
  return (
    <InputGroup className="h-7">
      <InputGroupAddon
        align="inline-start"
        className="ps-2 text-[11px] text-muted-foreground"
      >
        {label}
      </InputGroupAddon>
      <InputGroupInput
        type="number"
        value={Number.isFinite(value) ? Math.round(value) : 0}
        onFocus={onFocus}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
        className="font-mono text-[11px]"
      />
    </InputGroup>
  )
}

