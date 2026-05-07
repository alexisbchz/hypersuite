export const HF_URL_PREFIX =
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

export const WEIGHTS_URL =
  "https://huggingface.co/ekzhang/jax-js-models/resolve/main/kyutai-pocket-tts_b6369a24-fp16.safetensors"

export const TOKENIZER_URL = HF_URL_PREFIX + "/tokenizer.model"
