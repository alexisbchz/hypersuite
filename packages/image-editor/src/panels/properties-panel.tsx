"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  AdjustPositionIcon,
  AlignBottomIcon,
  AlignHorizontalCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  AlignTopIcon,
  AlignVerticalCenterIcon,
  DistributeHorizontalCenterIcon,
  DistributeVerticalCenterIcon,
  CursorMagicSelectionIcon,
  Layers01Icon,
  LoadingIcon,
  MagicWand01Icon,
  PaintBucketIcon,
  PathfinderIntersectIcon,
  PathfinderMinusFrontIcon,
  PathfinderUniteIcon,
  Rotate01Icon,
  Settings02Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import { Label } from "@workspace/ui/components/label"
import { Slider } from "@workspace/ui/components/slider"
import { Switch } from "@workspace/ui/components/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"
import type { WandMaskMode, WandSampleSize } from "../canvas/utils"
import type { BgRemovalProgress } from "../lib/background-removal"
import { ColorPicker } from "../pickers/color-picker"
import { FontPicker } from "../pickers/font-picker"
import { useEditor } from "../editor"

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
  const {
    layers,
    selectedId,
    selectedIds,
    patch,
    setProp,
    commit,
    rename,
    alignSelection,
    distributeSelection,
    tool,
    shapeVariant,
    setShapeVariant,
    brushSize,
    setBrushSize,
    brushColor,
    setBrushColor,
    brushHardness,
    setBrushHardness,
    wandTolerance,
    setWandTolerance,
    wandSampleSize,
    setWandSampleSize,
    wandContiguous,
    setWandContiguous,
    wandAntiAlias,
    setWandAntiAlias,
    wandSampleAllLayers,
    setWandSampleAllLayers,
    wandMode,
    setWandMode,
    pixelMask,
    eraseUnderMask,
    invertMask,
    extractMaskToLayer,
    setPixelMask,
    bgRemovalProgress,
    removeBackgroundFromLayer,
    refineMode,
    setRefineMode,
    resetMask,
    setTool,
  } = useEditor()
  const layer = layers.find((l) => l.id === selectedId) ?? null

  // Show tool settings panel for tools that have settings even when nothing is selected
  if (
    !layer ||
    tool === "shape" ||
    tool === "pencil" ||
    tool === "brush" ||
    tool === "eraser" ||
    tool === "pen" ||
    tool === "wand" ||
    tool === "refine"
  ) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-border px-3 py-2">
          <p className="px-1 text-xs font-medium text-foreground capitalize">
            {tool} tool
          </p>
          <p className="px-1 text-[11px] text-muted-foreground">
            {layer ? `Editing ${layer.name}` : "No selection"}
          </p>
        </div>
        {tool === "shape" && (
          <Section title="Shape" icon={PaintBucketIcon}>
            <Row label="Variant">
              <div className="flex gap-1">
                <Button
                  variant={shapeVariant === "rect" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setShapeVariant("rect")}
                >
                  Rectangle
                </Button>
                <Button
                  variant={shapeVariant === "ellipse" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setShapeVariant("ellipse")}
                >
                  Ellipse
                </Button>
              </div>
            </Row>
            <Row label="Fill">
              <ColorField value={brushColor} onChange={setBrushColor} />
            </Row>
          </Section>
        )}
        {(tool === "pencil" || tool === "brush" || tool === "eraser") && (
          <Section
            title={tool === "eraser" ? "Eraser" : "Brush"}
            icon={PaintBucketIcon}
          >
            <Row label="Size">
              <Slider
                min={1}
                max={120}
                value={[brushSize]}
                onValueChange={(v) => {
                  if (Array.isArray(v) && typeof v[0] === "number")
                    setBrushSize(v[0])
                }}
              />
            </Row>
            <Row label="Hardness">
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={[brushHardness]}
                onValueChange={(v) => {
                  if (Array.isArray(v) && typeof v[0] === "number")
                    setBrushHardness(v[0])
                }}
              />
            </Row>
            {tool !== "eraser" && (
              <Row label="Color">
                <ColorField value={brushColor} onChange={setBrushColor} />
              </Row>
            )}
            <p className="px-1 text-[11px] text-muted-foreground">
              {tool === "eraser"
                ? "Erases from the selected raster layer."
                : "Strokes paint on a raster layer (created on first stroke)."}
            </p>
          </Section>
        )}
        {tool === "pen" && (
          <Section title="Pen" icon={PaintBucketIcon}>
            <Row label="Color">
              <ColorField value={brushColor} onChange={setBrushColor} />
            </Row>
            <p className="px-1 text-[11px] text-muted-foreground">
              Click to add a corner anchor. Drag while clicking to set a smooth
              bezier handle. Click the first anchor to close, Enter for open
              path, Esc to cancel. Select a path to drag its anchors / handles.
            </p>
          </Section>
        )}
        {tool === "wand" && (
          <>
            <Section title="Selection" icon={CursorMagicSelectionIcon}>
              <Row label="Mode">
                <WandModeRow value={wandMode} onChange={setWandMode} />
              </Row>
              <Row label="Tolerance">
                <ToleranceField
                  value={wandTolerance}
                  onChange={setWandTolerance}
                />
              </Row>
              <Row label="Sample">
                <SampleSizeSelect
                  value={wandSampleSize}
                  onChange={setWandSampleSize}
                />
              </Row>
              <ToggleRow
                label="Anti-alias"
                checked={wandAntiAlias}
                onChange={setWandAntiAlias}
              />
              <ToggleRow
                label="Contiguous"
                checked={wandContiguous}
                onChange={setWandContiguous}
              />
              <ToggleRow
                label="Sample all layers"
                checked={wandSampleAllLayers}
                onChange={setWandSampleAllLayers}
              />
              <p className="text-[11px] text-muted-foreground">
                {pixelMask
                  ? `${pixelMask.count.toLocaleString()} pixels selected`
                  : "Click the canvas to start a selection"}
              </p>
              <p className="text-[11px] text-muted-foreground/80">
                Hold{" "}
                <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">
                  Shift
                </kbd>{" "}
                to add ·{" "}
                <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">
                  Alt
                </kbd>{" "}
                to subtract
              </p>
            </Section>
            <Section title="Apply selection" icon={MagicWand01Icon}>
              <Button
                variant="default"
                size="sm"
                disabled={!pixelMask}
                onClick={() => void extractMaskToLayer()}
                className="w-full justify-center"
              >
                <HugeiconsIcon icon={Layers01Icon} />
                Extract to new layer
              </Button>
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pixelMask}
                  onClick={() => void invertMask()}
                >
                  Invert
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pixelMask}
                  onClick={() => setPixelMask(null)}
                >
                  Deselect
                </Button>
              </div>
              <Button
                variant="destructive"
                size="sm"
                disabled={!pixelMask}
                onClick={() => void eraseUnderMask()}
                className="w-full justify-center"
              >
                Erase masked pixels
              </Button>
            </Section>
          </>
        )}
        {tool === "refine" && (
          <RefineToolSection
            mode={refineMode}
            setMode={setRefineMode}
            brushSize={brushSize}
            setBrushSize={setBrushSize}
            brushHardness={brushHardness}
            setBrushHardness={setBrushHardness}
            hasMask={
              !!layers.find((l) => l.id === selectedIds[0])?.maskDataUrl
            }
            onReset={() => {
              const id = selectedIds[0]
              if (id) resetMask(id)
            }}
            onDone={() => setTool("move")}
          />
        )}
      </div>
    )
  }

  const multi = selectedIds.length > 1

  if (multi) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-border px-3 py-2">
          <p className="px-1 text-xs font-medium text-foreground">
            {selectedIds.length} layers selected
          </p>
          <p className="px-1 text-[11px] text-muted-foreground">
            Align or distribute the selection
          </p>
        </div>
        <Section title="Align" icon={AdjustPositionIcon}>
          <div className="grid grid-cols-6 gap-1">
            <AlignBtn
              tip="Align left"
              icon={AlignLeftIcon}
              onClick={() => alignSelection("left")}
            />
            <AlignBtn
              tip="Align center"
              icon={AlignHorizontalCenterIcon}
              onClick={() => alignSelection("centerX")}
            />
            <AlignBtn
              tip="Align right"
              icon={AlignRightIcon}
              onClick={() => alignSelection("right")}
            />
            <AlignBtn
              tip="Align top"
              icon={AlignTopIcon}
              onClick={() => alignSelection("top")}
            />
            <AlignBtn
              tip="Align middle"
              icon={AlignVerticalCenterIcon}
              onClick={() => alignSelection("centerY")}
            />
            <AlignBtn
              tip="Align bottom"
              icon={AlignBottomIcon}
              onClick={() => alignSelection("bottom")}
            />
          </div>
        </Section>
        <Section title="Distribute" icon={AdjustPositionIcon}>
          <div className="grid grid-cols-6 gap-1">
            <AlignBtn
              tip="Distribute horizontally"
              icon={DistributeHorizontalCenterIcon}
              onClick={() => distributeSelection("horizontal")}
              disabled={selectedIds.length < 3}
            />
            <AlignBtn
              tip="Distribute vertically"
              icon={DistributeVerticalCenterIcon}
              onClick={() => distributeSelection("vertical")}
              disabled={selectedIds.length < 3}
            />
          </div>
        </Section>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-2">
        <Input
          key={layer.id}
          defaultValue={layer.name}
          onBlur={(e) => {
            const v = e.currentTarget.value.trim()
            if (v && v !== layer.name) rename(layer.id, v)
            else e.currentTarget.value = layer.name
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur()
            else if (e.key === "Escape") {
              e.currentTarget.value = layer.name
              e.currentTarget.blur()
            }
          }}
          className="h-7 w-full border-transparent bg-transparent px-1 text-xs font-medium text-foreground hover:border-border focus-visible:ring-0"
        />
        <p className="px-1 text-[11px] text-muted-foreground capitalize">
          {layer.kind} layer
        </p>
      </div>

      <div className="flex flex-col">
        <Section title="Transform" icon={AdjustPositionIcon}>
          <div className="grid grid-cols-2 gap-2">
            <NumField
              label="X"
              value={layer.x}
              onFocus={commit}
              onChange={(v) => patch(layer.id, { x: v })}
            />
            <NumField
              label="Y"
              value={layer.y}
              onFocus={commit}
              onChange={(v) => patch(layer.id, { y: v })}
            />
            <NumField
              label="W"
              value={layer.width}
              onFocus={commit}
              onChange={(v) => patch(layer.id, { width: Math.max(1, v) })}
            />
            <NumField
              label="H"
              value={layer.height}
              onFocus={commit}
              onChange={(v) => patch(layer.id, { height: Math.max(1, v) })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumField
              label={<HugeiconsIcon icon={Rotate01Icon} className="size-3" />}
              value={layer.rotation}
              onFocus={commit}
              onChange={(v) => patch(layer.id, { rotation: v })}
              suffix="°"
            />
            <NumField
              label="Op"
              value={layer.opacity}
              onFocus={commit}
              onChange={(v) => patch(layer.id, { opacity: clamp(v, 0, 100) })}
              suffix="%"
            />
          </div>
        </Section>

        {layer.kind === "text" && (
          <Section title="Text" icon={PaintBucketIcon}>
            <Row label="Content">
              <Input
                key={`txt-${layer.id}`}
                defaultValue={
                  layer.text ??
                  (layer.id === "title" ? "Hypersuite" : layer.name)
                }
                onFocus={commit}
                onChange={(e) =>
                  patch(layer.id, { text: e.currentTarget.value })
                }
                className="h-7 w-full text-xs"
              />
            </Row>
            <Row label="Font">
              <FontPicker
                value={layer.fontFamily}
                onChange={(family) => {
                  commit()
                  patch(layer.id, { fontFamily: family })
                }}
              />
            </Row>
            <div className="grid grid-cols-2 gap-2">
              <NumField
                label="Sz"
                value={layer.fontSize ?? 56}
                onFocus={commit}
                onChange={(v) => patch(layer.id, { fontSize: Math.max(1, v) })}
                suffix="px"
              />
              <NumField
                label="Wt"
                value={layer.fontWeight ?? 600}
                onFocus={commit}
                onChange={(v) =>
                  patch(layer.id, {
                    fontWeight: Math.min(900, Math.max(100, v)),
                  })
                }
              />
            </div>
          </Section>
        )}

        <Section title="Appearance" icon={PaintBucketIcon}>
          <Row label="Blend mode">
            <select
              value={layer.blendMode}
              onChange={(e) => setProp(layer.id, { blendMode: e.target.value })}
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
              <ColorField
                value={layer.color}
                onFocus={commit}
                onChange={(c) => patch(layer.id, { color: c })}
              />
            </Row>
          )}
          <Row label="Visible">
            <Switch
              checked={layer.visible}
              onCheckedChange={(v) => setProp(layer.id, { visible: v })}
            />
          </Row>
          <Row label="Locked">
            <Switch
              checked={layer.locked}
              onCheckedChange={(v) => setProp(layer.id, { locked: v })}
            />
          </Row>
        </Section>

        <Section title="Effects" icon={MagicWand01Icon}>
          <Row label="Blur">
            <NumField
              label=""
              value={layer.effects?.blur ?? 0}
              onFocus={commit}
              onChange={(v) =>
                patch(layer.id, {
                  effects: {
                    ...(layer.effects ?? {}),
                    blur: Math.max(0, v) || null,
                  },
                })
              }
              suffix="px"
            />
          </Row>
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-[11px] text-muted-foreground">
              Shadow
            </span>
            <Switch
              checked={!!layer.effects?.shadow}
              onCheckedChange={(v) =>
                setProp(layer.id, {
                  effects: {
                    ...(layer.effects ?? {}),
                    shadow: v
                      ? (layer.effects?.shadow ?? {
                          x: 0,
                          y: 8,
                          blur: 16,
                          color: "#00000080",
                        })
                      : null,
                  },
                })
              }
            />
          </div>
          {layer.effects?.shadow && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <NumField
                  label="X"
                  value={layer.effects.shadow.x}
                  onFocus={commit}
                  onChange={(v) =>
                    patch(layer.id, {
                      effects: {
                        ...layer.effects,
                        shadow: { ...layer.effects!.shadow!, x: v },
                      },
                    })
                  }
                />
                <NumField
                  label="Y"
                  value={layer.effects.shadow.y}
                  onFocus={commit}
                  onChange={(v) =>
                    patch(layer.id, {
                      effects: {
                        ...layer.effects,
                        shadow: { ...layer.effects!.shadow!, y: v },
                      },
                    })
                  }
                />
                <NumField
                  label="B"
                  value={layer.effects.shadow.blur}
                  onFocus={commit}
                  onChange={(v) =>
                    patch(layer.id, {
                      effects: {
                        ...layer.effects,
                        shadow: {
                          ...layer.effects!.shadow!,
                          blur: Math.max(0, v),
                        },
                      },
                    })
                  }
                />
              </div>
              <Row label="Color">
                <ColorField
                  value={layer.effects.shadow.color}
                  onFocus={commit}
                  onChange={(c) =>
                    patch(layer.id, {
                      effects: {
                        ...layer.effects,
                        shadow: { ...layer.effects!.shadow!, color: c },
                      },
                    })
                  }
                />
              </Row>
            </>
          )}
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-[11px] text-muted-foreground">
              Stroke
            </span>
            <Switch
              checked={!!layer.effects?.stroke}
              onCheckedChange={(v) =>
                setProp(layer.id, {
                  effects: {
                    ...(layer.effects ?? {}),
                    stroke: v
                      ? (layer.effects?.stroke ?? {
                          width: 2,
                          color: "#000000",
                        })
                      : null,
                  },
                })
              }
            />
          </div>
          {layer.effects?.stroke && (
            <div className="grid grid-cols-2 gap-2">
              <NumField
                label="W"
                value={layer.effects.stroke.width}
                onFocus={commit}
                onChange={(v) =>
                  patch(layer.id, {
                    effects: {
                      ...layer.effects,
                      stroke: {
                        ...layer.effects!.stroke!,
                        width: Math.max(0, v),
                      },
                    },
                  })
                }
                suffix="px"
              />
              <ColorField
                value={layer.effects.stroke.color}
                onFocus={commit}
                onChange={(c) =>
                  patch(layer.id, {
                    effects: {
                      ...layer.effects,
                      stroke: { ...layer.effects!.stroke!, color: c },
                    },
                  })
                }
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-[11px] text-muted-foreground">
              Inner shadow
            </span>
            <Switch
              checked={!!layer.effects?.innerShadow}
              onCheckedChange={(v) =>
                setProp(layer.id, {
                  effects: {
                    ...(layer.effects ?? {}),
                    innerShadow: v
                      ? (layer.effects?.innerShadow ?? {
                          x: 0,
                          y: 4,
                          blur: 12,
                          color: "#00000080",
                        })
                      : null,
                  },
                })
              }
            />
          </div>
          {layer.effects?.innerShadow && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <NumField
                  label="X"
                  value={layer.effects.innerShadow.x}
                  onFocus={commit}
                  onChange={(v) =>
                    patch(layer.id, {
                      effects: {
                        ...layer.effects,
                        innerShadow: { ...layer.effects!.innerShadow!, x: v },
                      },
                    })
                  }
                />
                <NumField
                  label="Y"
                  value={layer.effects.innerShadow.y}
                  onFocus={commit}
                  onChange={(v) =>
                    patch(layer.id, {
                      effects: {
                        ...layer.effects,
                        innerShadow: { ...layer.effects!.innerShadow!, y: v },
                      },
                    })
                  }
                />
                <NumField
                  label="B"
                  value={layer.effects.innerShadow.blur}
                  onFocus={commit}
                  onChange={(v) =>
                    patch(layer.id, {
                      effects: {
                        ...layer.effects,
                        innerShadow: {
                          ...layer.effects!.innerShadow!,
                          blur: Math.max(0, v),
                        },
                      },
                    })
                  }
                />
              </div>
              <Row label="Color">
                <ColorField
                  value={layer.effects.innerShadow.color}
                  onFocus={commit}
                  onChange={(c) =>
                    patch(layer.id, {
                      effects: {
                        ...layer.effects,
                        innerShadow: {
                          ...layer.effects!.innerShadow!,
                          color: c,
                        },
                      },
                    })
                  }
                />
              </Row>
            </>
          )}
        </Section>

        {(layer.kind === "image" || layer.kind === "raster") && (
          <BgRemoveSection
            layerId={layer.id}
            progress={bgRemovalProgress[layer.id]}
            onRun={() => void removeBackgroundFromLayer(layer.id)}
          />
        )}

        {(layer.kind === "image" || layer.kind === "raster") && (
          <Section title="Adjustments" icon={MagicWand01Icon}>
            {(
              [
                ["brightness", "Brightness", -100, 100, "%"],
                ["contrast", "Contrast", -100, 100, "%"],
                ["saturation", "Saturation", -100, 100, "%"],
                ["hue", "Hue", -180, 180, "°"],
              ] as const
            ).map(([key, label, min, max, suffix]) => {
              const val = layer.adjustments?.[key] ?? 0
              return (
                <Row key={key} label={label}>
                  <SliderRow
                    min={min}
                    max={max}
                    suffix={suffix}
                    value={val}
                    onCommit={commit}
                    onChange={(v) =>
                      patch(layer.id, {
                        adjustments: {
                          ...(layer.adjustments ?? {}),
                          [key]: v,
                        },
                      })
                    }
                  />
                </Row>
              )
            })}
            <Button
              variant="outline"
              size="xs"
              className="self-start"
              onClick={() => setProp(layer.id, { adjustments: undefined })}
            >
              Reset adjustments
            </Button>
          </Section>
        )}

        <Section title="Filters" icon={MagicWand01Icon}>
          <Row label="Sharpen">
            <SliderRow
              min={0}
              max={100}
              suffix=""
              value={layer.filters?.sharpen?.strength ?? 0}
              onCommit={commit}
              onChange={(v) =>
                patch(layer.id, {
                  filters: {
                    ...(layer.filters ?? {}),
                    sharpen: v > 0 ? { strength: v } : undefined,
                  },
                })
              }
            />
          </Row>

          <Row label="Noise">
            <SliderRow
              min={0}
              max={100}
              suffix=""
              value={layer.filters?.noise?.amount ?? 0}
              onCommit={commit}
              onChange={(v) =>
                patch(layer.id, {
                  filters: {
                    ...(layer.filters ?? {}),
                    noise:
                      v > 0
                        ? {
                            amount: v,
                            mono: layer.filters?.noise?.mono ?? false,
                          }
                        : undefined,
                  },
                })
              }
            />
          </Row>
          {layer.filters?.noise && layer.filters.noise.amount > 0 && (
            <Row label="Mono">
              <Switch
                checked={layer.filters.noise.mono}
                onCheckedChange={(v) =>
                  setProp(layer.id, {
                    filters: {
                      ...(layer.filters ?? {}),
                      noise: { ...layer.filters!.noise!, mono: v },
                    },
                  })
                }
              />
            </Row>
          )}

          <Row label="Grain">
            <SliderRow
              min={0}
              max={100}
              suffix=""
              value={layer.filters?.grain?.amount ?? 0}
              onCommit={commit}
              onChange={(v) =>
                patch(layer.id, {
                  filters: {
                    ...(layer.filters ?? {}),
                    grain:
                      v > 0
                        ? {
                            amount: v,
                            scale: layer.filters?.grain?.scale ?? 1,
                          }
                        : undefined,
                  },
                })
              }
            />
          </Row>
          {layer.filters?.grain && layer.filters.grain.amount > 0 && (
            <Row label="Scale">
              <SliderRow
                min={0.5}
                max={4}
                step={0.1}
                suffix="×"
                value={layer.filters.grain.scale ?? 1}
                onCommit={commit}
                onChange={(v) =>
                  patch(layer.id, {
                    filters: {
                      ...(layer.filters ?? {}),
                      grain: { ...layer.filters!.grain!, scale: v },
                    },
                  })
                }
              />
            </Row>
          )}

          {(layer.filters?.sharpen ||
            layer.filters?.noise ||
            layer.filters?.grain) && (
            <Button
              variant="outline"
              size="xs"
              className="self-start"
              onClick={() => setProp(layer.id, { filters: undefined })}
            >
              Reset filters
            </Button>
          )}
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
  suffix,
}: {
  label: React.ReactNode
  value: number
  onChange: (v: number) => void
  onFocus?: () => void
  suffix?: string
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
        value={Math.round(value)}
        onFocus={onFocus}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
        className="text-right text-xs tabular-nums"
      />
      {suffix && (
        <InputGroupAddon
          align="inline-end"
          className="pe-2 text-[10px] text-muted-foreground"
        >
          {suffix}
        </InputGroupAddon>
      )}
    </InputGroup>
  )
}

function SliderRow({
  min,
  max,
  step = 1,
  suffix,
  value,
  onChange,
  onCommit,
}: {
  min: number
  max: number
  step?: number
  suffix?: string
  value: number
  onChange: (v: number) => void
  onCommit?: () => void
}) {
  const display = step < 1 ? value.toFixed(1) : Math.round(value)
  return (
    <div className="flex items-center gap-2">
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onPointerDown={onCommit}
        onValueChange={(v) => {
          if (Array.isArray(v) && typeof v[0] === "number") onChange(v[0])
        }}
        className="min-w-0 flex-1"
      />
      <span className="w-10 text-right font-mono text-[10px] text-muted-foreground tabular-nums">
        {display}
        {suffix}
      </span>
    </div>
  )
}

function ColorField({
  value,
  onChange,
  onFocus,
}: {
  value: string
  onChange: (v: string) => void
  onFocus?: () => void
}) {
  return <ColorPicker value={value} onChange={onChange} onFocus={onFocus} />
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}

function WandModeRow({
  value,
  onChange,
}: {
  value: WandMaskMode
  onChange: (m: WandMaskMode) => void
}) {
  const items: { id: WandMaskMode; label: string; icon: typeof Settings02Icon }[] = [
    { id: "new", label: "New selection", icon: CursorMagicSelectionIcon },
    { id: "add", label: "Add to selection (Shift)", icon: PathfinderUniteIcon },
    {
      id: "subtract",
      label: "Subtract from selection (Alt)",
      icon: PathfinderMinusFrontIcon,
    },
    {
      id: "intersect",
      label: "Intersect (Shift+Alt)",
      icon: PathfinderIntersectIcon,
    },
  ]
  return (
    <div
      data-slot="button-group"
      className="flex w-full overflow-hidden rounded-md border border-border"
    >
      {items.map((item, i) => {
        const active = value === item.id
        return (
          <Tooltip key={item.id}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={() => onChange(item.id)}
                  aria-label={item.label}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex h-7 flex-1 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    i > 0 && "border-l border-border",
                    active &&
                      "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                  )}
                >
                  <HugeiconsIcon icon={item.icon} className="size-3.5" />
                </button>
              }
            />
            <TooltipContent>{item.label}</TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

function ToleranceField({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Slider
        value={[value]}
        min={0}
        max={255}
        step={1}
        onValueChange={(v) => {
          if (Array.isArray(v) && typeof v[0] === "number") onChange(v[0])
        }}
        className="min-w-0 flex-1"
      />
      <Input
        type="number"
        min={0}
        max={255}
        value={value}
        onChange={(e) => {
          const n = Number(e.currentTarget.value)
          if (Number.isFinite(n))
            onChange(Math.max(0, Math.min(255, Math.round(n))))
        }}
        className="h-7 w-12 px-1.5 text-center font-mono text-[11px] tabular-nums"
      />
    </div>
  )
}

function SampleSizeSelect({
  value,
  onChange,
}: {
  value: WandSampleSize
  onChange: (v: WandSampleSize) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value) as WandSampleSize)}
      className="h-7 w-full rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-ring"
    >
      <option value={1}>Point sample</option>
      <option value={3}>3 × 3 average</option>
      <option value={5}>5 × 5 average</option>
    </select>
  )
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  const id = `wand-toggle-${label.toLowerCase().replace(/\s+/g, "-")}`
  return (
    <div className="flex items-center justify-between gap-2">
      <Label
        htmlFor={id}
        className="text-[11px] font-normal text-muted-foreground"
      >
        {label}
      </Label>
      <Switch
        id={id}
        size="sm"
        checked={checked}
        onCheckedChange={onChange}
      />
    </div>
  )
}

function RefineToolSection({
  mode,
  setMode,
  brushSize,
  setBrushSize,
  brushHardness,
  setBrushHardness,
  hasMask,
  onReset,
  onDone,
}: {
  mode: "restore" | "erase"
  setMode: (m: "restore" | "erase") => void
  brushSize: number
  setBrushSize: (v: number) => void
  brushHardness: number
  setBrushHardness: (v: number) => void
  hasMask: boolean
  onReset: () => void
  onDone: () => void
}) {
  return (
    <Section title="Refine mask" icon={SparklesIcon}>
      {!hasMask ? (
        <p className="text-[11px] text-muted-foreground">
          Run AI Remove background on an image or raster layer first — the
          Refine brush touches up that mask.
        </p>
      ) : (
        <>
          <Row label="Brush">
            <div
              data-slot="button-group"
              className="flex w-full overflow-hidden rounded-md border border-border"
            >
              <button
                type="button"
                aria-pressed={mode === "restore"}
                onClick={() => setMode("restore")}
                className={cn(
                  "inline-flex h-7 flex-1 items-center justify-center text-xs transition-colors hover:bg-muted",
                  mode === "restore"
                    ? "bg-primary text-primary-foreground hover:bg-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Restore
              </button>
              <button
                type="button"
                aria-pressed={mode === "erase"}
                onClick={() => setMode("erase")}
                className={cn(
                  "inline-flex h-7 flex-1 items-center justify-center border-l border-border text-xs transition-colors hover:bg-muted",
                  mode === "erase"
                    ? "bg-primary text-primary-foreground hover:bg-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Erase
              </button>
            </div>
          </Row>
          <Row label="Size">
            <Slider
              min={1}
              max={120}
              value={[brushSize]}
              onValueChange={(v) => {
                if (Array.isArray(v) && typeof v[0] === "number")
                  setBrushSize(v[0])
              }}
            />
          </Row>
          <Row label="Hardness">
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={[brushHardness]}
              onValueChange={(v) => {
                if (Array.isArray(v) && typeof v[0] === "number")
                  setBrushHardness(v[0])
              }}
            />
          </Row>
          <p className="text-[11px] text-muted-foreground">
            Hold{" "}
            <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">
              Alt
            </kbd>{" "}
            while painting to flip the brush.
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            <Button variant="outline" size="sm" onClick={onReset}>
              Reset mask
            </Button>
            <Button variant="default" size="sm" onClick={onDone}>
              Done
            </Button>
          </div>
        </>
      )}
    </Section>
  )
}

function BgRemoveSection({
  layerId,
  progress,
  onRun,
}: {
  layerId: string
  progress: BgRemovalProgress | undefined
  onRun: () => void
}) {
  const busy = progress !== undefined
  const label = busy
    ? progress.phase === "downloading"
      ? `Downloading model… ${progress.pct}%`
      : progress.pct > 0
        ? `Removing background… ${progress.pct}%`
        : "Removing background…"
    : "Remove background"
  return (
    <Section title="AI" icon={SparklesIcon}>
      <Button
        key={layerId}
        variant="default"
        size="sm"
        disabled={busy}
        onClick={onRun}
        className="w-full justify-center"
      >
        <HugeiconsIcon
          icon={busy ? LoadingIcon : SparklesIcon}
          className={cn(busy && "animate-spin")}
        />
        {label}
      </Button>
      <p className="text-[11px] text-muted-foreground">
        Runs locally in your browser. The model (~40 MB) downloads once on
        first use, then is cached.
      </p>
    </Section>
  )
}

function AlignBtn({
  tip,
  icon,
  onClick,
  disabled,
}: {
  tip: string
  icon: typeof Settings02Icon
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={tip}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              disabled && "pointer-events-none opacity-40"
            )}
          >
            <HugeiconsIcon icon={icon} className="size-3.5" />
          </button>
        }
      />
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  )
}
