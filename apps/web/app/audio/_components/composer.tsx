"use client"

import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  MagicWand01Icon,
  Settings02Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Slider } from "@workspace/ui/components/slider"
import { cn } from "@workspace/ui/lib/utils"

import { PREDEFINED_VOICES, useEditor } from "./editor-context"

export function Composer() {
  const { generate, generating, error, clearError } = useEditor()
  const [prompt, setPrompt] = useState(
    "The sun is shining, and the birds are singing."
  )
  const [voice, setVoice] = useState("azelma")
  const [seed, setSeed] = useState<number | "">("")
  const [temperature, setTemperature] = useState(0.7)
  const [lsdDecodeSteps, setLsdDecodeSteps] = useState(1)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const disabled = generating || prompt.trim() === ""

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (disabled) return
    void generate({
      prompt,
      voice,
      seed: seed === "" ? null : seed,
      temperature,
      lsdDecodeSteps,
    })
  }

  return (
    <footer className="shrink-0 border-t border-border bg-background">
      {error && (
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 pt-3 text-sm text-destructive">
          <span className="truncate">{error}</span>
          <button
            type="button"
            onClick={clearError}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            dismiss
          </button>
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-3"
      >
        <div
          className={cn(
            "flex items-end gap-2 rounded-xl border border-border bg-background p-2 transition-colors focus-within:border-foreground/30"
          )}
        >
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                onSubmit(e)
              }
            }}
            rows={2}
            placeholder="What should I say? (⌘↵ to generate)"
            className="min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-relaxed outline-none"
          />

          <div className="flex items-center gap-1">
            {mounted ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label="Voice"
                      >
                        {voice.charAt(0).toLocaleUpperCase() + voice.slice(1)}
                        <HugeiconsIcon
                          icon={ArrowDown01Icon}
                          className="ms-0.5 -me-0.5 size-3 text-muted-foreground"
                          data-icon="inline-end"
                        />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end" className="min-w-36">
                    <DropdownMenuLabel>Voice</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {Object.keys(PREDEFINED_VOICES).map((v) => (
                      <DropdownMenuItem
                        key={v}
                        onClick={() => setVoice(v)}
                        data-active={v === voice}
                        className="data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
                      >
                        {v.charAt(0).toLocaleUpperCase() + v.slice(1)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Advanced options"
                      >
                        <HugeiconsIcon icon={Settings02Icon} />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-72 p-3">
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="seed"
                          className="text-xs font-normal text-muted-foreground"
                        >
                          Seed
                        </Label>
                        <Input
                          id="seed"
                          type="number"
                          placeholder="(random)"
                          value={seed}
                          onChange={(e) =>
                            setSeed(
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value)
                            )
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label
                            htmlFor="temperature"
                            className="text-xs font-normal text-muted-foreground"
                          >
                            Temperature
                          </Label>
                          <span className="font-mono text-xs text-foreground">
                            {temperature.toFixed(2)}
                          </span>
                        </div>
                        <Slider
                          id="temperature"
                          min={0}
                          max={1}
                          step={0.01}
                          value={[temperature]}
                          onValueChange={(v) =>
                            setTemperature(Array.isArray(v) ? v[0]! : v)
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label
                            htmlFor="lsd"
                            className="text-xs font-normal text-muted-foreground"
                          >
                            LSD decode steps
                          </Label>
                          <span className="font-mono text-xs text-foreground">
                            {lsdDecodeSteps}
                          </span>
                        </div>
                        <Slider
                          id="lsd"
                          min={1}
                          max={4}
                          step={1}
                          value={[lsdDecodeSteps]}
                          onValueChange={(v) =>
                            setLsdDecodeSteps(Array.isArray(v) ? v[0]! : v)
                          }
                        />
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                  aria-hidden
                >
                  {voice.charAt(0).toLocaleUpperCase() + voice.slice(1)}
                  <HugeiconsIcon
                    icon={ArrowDown01Icon}
                    className="ms-0.5 -me-0.5 size-3 text-muted-foreground"
                    data-icon="inline-end"
                  />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled
                  aria-hidden
                >
                  <HugeiconsIcon icon={Settings02Icon} />
                </Button>
              </>
            )}

            <Button type="submit" size="sm" disabled={disabled}>
              {generating ? (
                <>
                  <HugeiconsIcon
                    icon={MagicWand01Icon}
                    className="animate-pulse"
                  />
                  Generating
                </>
              ) : (
                <>
                  Generate
                  <HugeiconsIcon icon={ArrowUp01Icon} />
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </footer>
  )
}
