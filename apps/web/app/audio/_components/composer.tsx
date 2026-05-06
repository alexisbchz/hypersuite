"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowUp01Icon,
  MagicWand01Icon,
  Settings02Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
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
            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="h-8 cursor-pointer rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground outline-none hover:bg-muted focus:border-ring"
              aria-label="Voice"
            >
              {Object.keys(PREDEFINED_VOICES).map((v) => (
                <option key={v} value={v}>
                  {v.charAt(0).toLocaleUpperCase() + v.slice(1)}
                </option>
              ))}
            </select>

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
                  <label className="block text-xs">
                    <span className="text-muted-foreground">Seed</span>
                    <input
                      type="number"
                      placeholder="(random)"
                      value={seed}
                      onChange={(e) =>
                        setSeed(
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                      className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-ring"
                    />
                  </label>

                  <label className="block text-xs">
                    <span className="flex items-center justify-between text-muted-foreground">
                      <span>Temperature</span>
                      <span className="font-mono text-foreground">
                        {temperature.toFixed(2)}
                      </span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={temperature}
                      onChange={(e) => setTemperature(Number(e.target.value))}
                      className="mt-1 w-full"
                    />
                  </label>

                  <label className="block text-xs">
                    <span className="flex items-center justify-between text-muted-foreground">
                      <span>LSD decode steps</span>
                      <span className="font-mono text-foreground">
                        {lsdDecodeSteps}
                      </span>
                    </span>
                    <input
                      type="range"
                      min={1}
                      max={4}
                      step={1}
                      value={lsdDecodeSteps}
                      onChange={(e) =>
                        setLsdDecodeSteps(Number(e.target.value))
                      }
                      className="mt-1 w-full"
                    />
                  </label>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

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
