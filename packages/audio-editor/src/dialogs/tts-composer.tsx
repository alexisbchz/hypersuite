"use client"

import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  MagicWand01Icon,
  Settings02Icon,
} from "@hugeicons/core-free-icons"
import { defaultDevice, init, numpy as np, tree } from "@jax-js/jax"
import { cachedFetch, safetensors, tokenizers } from "@jax-js/loaders"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { Slider } from "@workspace/ui/components/slider"

import { useEditor } from "../editor"
import { createStreamingPlayer } from "../tts/audio"
import { playTTS } from "../tts/inference"
import { fromSafetensors, type PocketTTS } from "../tts/pocket-tts"
import { PREDEFINED_VOICES, TOKENIZER_URL, WEIGHTS_URL } from "../tts/voices"

type DownloadProgress = {
  name: string
  loaded?: number
  total?: number
} | null

const weightsRef = { current: null as safetensors.File | null }
const modelRef = { current: null as PocketTTS | null }
const tokenizerRef = { current: null as tokenizers.Unigram | null }

function prepareTextPrompt(input: string): [string, number] {
  let text = input.trim()
  if (text === "") throw new Error("Prompt cannot be empty")
  text = text.replace(/\s+/g, " ")
  const numberOfWords = text.split(" ").length
  let framesAfterEosGuess = 3
  if (numberOfWords <= 4) framesAfterEosGuess = 5
  text = text.replace(/^(\p{Ll})/u, (c) => c.toLocaleUpperCase())
  if (/[\p{L}\p{N}]$/u.test(text)) text = text + "."
  if (text.split(" ").length < 5) text = " ".repeat(8) + text
  return [text, framesAfterEosGuess]
}

export function TtsComposer() {
  const { ttsDialogOpen, setTtsDialogOpen, insertTtsClip, prefs } = useEditor()
  const [prompt, setPrompt] = useState(
    "The sun is shining, and the birds are singing."
  )
  const [voice, setVoice] = useState(prefs.defaultVoice)
  const [seed, setSeed] = useState<number | "">("")
  const [temperature, setTemperature] = useState(0.7)
  const [lsdDecodeSteps, setLsdDecodeSteps] = useState(1)
  const [generating, setGenerating] = useState(false)
  const [download, setDownload] = useState<DownloadProgress>(null)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const disabled = generating || prompt.trim() === ""

  const onGenerate = async () => {
    if (disabled) return
    setError(null)
    setGenerating(true)
    try {
      const devices = await init()
      if (!devices.includes("webgpu")) {
        throw new Error("WebGPU is not supported on this device")
      }
      defaultDevice("webgpu")

      if (!weightsRef.current) {
        setDownload({ name: "model weights" })
        const data = await cachedFetch(WEIGHTS_URL, {}, (progress) => {
          setDownload({
            name: "model weights",
            loaded: progress.loadedBytes,
            total: progress.totalBytes,
          })
        })
        weightsRef.current = safetensors.parse(data)
        setDownload(null)
      }
      if (!modelRef.current) {
        modelRef.current = fromSafetensors(weightsRef.current)
      }
      if (!tokenizerRef.current) {
        tokenizerRef.current = await tokenizers.loadSentencePiece(TOKENIZER_URL)
      }

      const model = modelRef.current
      const tokenizer = tokenizerRef.current
      const [text, framesAfterEos] = prepareTextPrompt(prompt)
      const tokens = tokenizer.encode(text)

      const audioPrompt = safetensors.parse(
        await cachedFetch(PREDEFINED_VOICES[voice]!)
      ).tensors.audio_prompt!
      const voiceEmbed = np
        .array(audioPrompt.data as Float32Array<ArrayBuffer>, {
          shape: audioPrompt.shape,
          dtype: np.float32,
        })
        .slice(0)
        .astype(np.float16)

      const tokensAr = np.array(tokens, { dtype: np.uint32 })
      let embeds = model.flowLM.conditionerEmbed.ref.slice(tokensAr)
      embeds = np.concatenate([voiceEmbed, embeds])

      const player = createStreamingPlayer()
      let blob: Blob
      try {
        await playTTS(player, tree.ref(model), embeds, {
          framesAfterEos,
          seed: seed === "" ? null : (seed as number),
          temperature,
          lsdDecodeSteps,
        })
        blob = player.toWav()
      } finally {
        await player.close()
      }

      await insertTtsClip(blob, prompt)
      setTtsDialogOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setGenerating(false)
      setDownload(null)
    }
  }

  return (
    <Dialog open={ttsDialogOpen} onOpenChange={setTtsDialogOpen}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Generate speech</DialogTitle>
          <DialogDescription>
            Pocket TTS runs on-device via WebGPU. The clip drops onto the
            timeline at the playhead.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                void onGenerate()
              }
            }}
            rows={4}
            placeholder="What should I say? (⌘↵ to generate)"
            className="min-h-24 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:border-foreground/30"
          />

          {download && (
            <div className="rounded-md border border-border bg-muted/50 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span>Downloading {download.name}…</span>
                {download.total && (
                  <span className="font-mono text-muted-foreground">
                    {((download.loaded ?? 0) / 1024 / 1024).toFixed(1)} /{" "}
                    {(download.total / 1024 / 1024).toFixed(1)} MB
                  </span>
                )}
              </div>
              {download.total && (
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-[width]"
                    style={{
                      width: `${Math.min(100, ((download.loaded ?? 0) / download.total) * 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {mounted && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button type="button" variant="outline" size="sm">
                      {voice.charAt(0).toLocaleUpperCase() + voice.slice(1)}
                      <HugeiconsIcon
                        icon={ArrowDown01Icon}
                        className="ms-0.5 -me-0.5 size-3 text-muted-foreground"
                        data-icon="inline-end"
                      />
                    </Button>
                  }
                />
                <DropdownMenuContent align="start" className="min-w-36">
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
            )}

            <Popover>
              <PopoverTrigger
                render={
                  <Button type="button" variant="ghost" size="sm">
                    <HugeiconsIcon icon={Settings02Icon} />
                    Advanced
                  </Button>
                }
              />
              <PopoverContent className="w-72 p-3">
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
                          e.target.value === "" ? "" : Number(e.target.value)
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
                      <span className="font-mono text-xs">
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
                      <span className="font-mono text-xs">
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
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setTtsDialogOpen(false)}
            disabled={generating}
          >
            Cancel
          </Button>
          <Button onClick={onGenerate} disabled={disabled}>
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
                <HugeiconsIcon icon={MagicWand01Icon} />
                Generate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
