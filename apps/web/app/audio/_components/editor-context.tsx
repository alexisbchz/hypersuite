"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react"
import { defaultDevice, init, numpy as np, tree } from "@jax-js/jax"
import { cachedFetch, safetensors, tokenizers } from "@jax-js/loaders"

import { createStreamingPlayer } from "../_lib/audio"
import { playTTS } from "../_lib/inference"
import { fromSafetensors, type PocketTTS } from "../_lib/pocket-tts"

const HF_URL_PREFIX =
  "https://huggingface.co/kyutai/pocket-tts-without-voice-cloning/resolve/fbf8280"

export const PREDEFINED_VOICES: Record<string, string> = {
  alba: HF_URL_PREFIX + "/embeddings/alba.safetensors",
  azelma: HF_URL_PREFIX + "/embeddings/azelma.safetensors",
  cosette: HF_URL_PREFIX + "/embeddings/cosette.safetensors",
  eponine: HF_URL_PREFIX + "/embeddings/eponine.safetensors",
  fantine: HF_URL_PREFIX + "/embeddings/fantine.safetensors",
  javert: HF_URL_PREFIX + "/embeddings/javert.safetensors",
  jean: HF_URL_PREFIX + "/embeddings/jean.safetensors",
  marius: HF_URL_PREFIX + "/embeddings/marius.safetensors",
}

const WEIGHTS_URL =
  "https://huggingface.co/ekzhang/jax-js-models/resolve/main/kyutai-pocket-tts_b6369a24-fp16.safetensors"
const TOKENIZER_URL = HF_URL_PREFIX + "/tokenizer.model"

export type Generation = {
  id: string
  prompt: string
  voice: string
  blob: Blob
  url: string
  durationSec: number
  createdAt: number
  seed: number | null
  temperature: number
  lsdDecodeSteps: number
}

export type GenerateParams = {
  prompt: string
  voice: string
  seed: number | null
  temperature: number
  lsdDecodeSteps: number
}

export type DownloadProgress = {
  name: string
  loaded?: number
  total?: number
} | null

type EditorContextValue = {
  generations: Generation[]
  selectedId: string | null
  select: (id: string | null) => void
  remove: (id: string) => void
  clear: () => void
  generate: (params: GenerateParams) => Promise<void>
  generating: boolean
  download: DownloadProgress
  error: string | null
  clearError: () => void
}

const EditorContext = createContext<EditorContextValue | null>(null)

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

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const weightsRef = useRef<safetensors.File | null>(null)
  const modelRef = useRef<PocketTTS | null>(null)
  const tokenizerRef = useRef<tokenizers.Unigram | null>(null)

  const [generations, setGenerations] = useState<Generation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [download, setDownload] = useState<DownloadProgress>(null)
  const [error, setError] = useState<string | null>(null)

  const select = useCallback((id: string | null) => setSelectedId(id), [])
  const clearError = useCallback(() => setError(null), [])

  const remove = useCallback((id: string) => {
    setGenerations((prev) => {
      const target = prev.find((g) => g.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((g) => g.id !== id)
    })
    setSelectedId((curr) => (curr === id ? null : curr))
  }, [])

  const clear = useCallback(() => {
    setGenerations((prev) => {
      for (const g of prev) URL.revokeObjectURL(g.url)
      return []
    })
    setSelectedId(null)
  }, [])

  const generate = useCallback(async (params: GenerateParams) => {
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
      const [text, framesAfterEos] = prepareTextPrompt(params.prompt)
      const tokens = tokenizer.encode(text)

      const audioPrompt = safetensors.parse(
        await cachedFetch(PREDEFINED_VOICES[params.voice]!)
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
          seed: params.seed,
          temperature: params.temperature,
          lsdDecodeSteps: params.lsdDecodeSteps,
        })
        blob = player.toWav()
      } finally {
        await player.close()
      }

      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      const durationSec = await new Promise<number>((resolve) => {
        audio.addEventListener(
          "loadedmetadata",
          () => {
            resolve(isFinite(audio.duration) ? audio.duration : 0)
          },
          { once: true }
        )
        audio.addEventListener("error", () => resolve(0), { once: true })
      })

      const id = crypto.randomUUID()
      setGenerations((prev) => [
        {
          id,
          prompt: params.prompt,
          voice: params.voice,
          blob,
          url,
          durationSec,
          createdAt: Date.now(),
          seed: params.seed,
          temperature: params.temperature,
          lsdDecodeSteps: params.lsdDecodeSteps,
        },
        ...prev,
      ])
      setSelectedId(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setGenerating(false)
      setDownload(null)
    }
  }, [])

  const value = useMemo(
    () => ({
      generations,
      selectedId,
      select,
      remove,
      clear,
      generate,
      generating,
      download,
      error,
      clearError,
    }),
    [
      generations,
      selectedId,
      select,
      remove,
      clear,
      generate,
      generating,
      download,
      error,
      clearError,
    ]
  )

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  )
}

export function useEditor() {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error("useEditor must be used within EditorProvider")
  return ctx
}
