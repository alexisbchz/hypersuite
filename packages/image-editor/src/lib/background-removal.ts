/** Browser-side background removal via @imgly/background-removal.
 *  The dep is dynamically imported so the ~MB worker shim and the ONNX
 *  runtime are code-split out of the editor's initial bundle — only users
 *  who actually invoke "Remove background" pay for it. */

export type BgRemovalProgress =
  | { phase: "downloading"; pct: number }
  | { phase: "processing"; pct: number }

/** imgly's progress callback fires keys like
 *    fetch:/onnx-runtime/ort-wasm-simd-threaded.wasm
 *    fetch:isnet.onnx
 *    compute:inference
 *  We collapse the two phases for the UI: model assets vs. inference. */
function mapProgressKey(key: string): BgRemovalProgress["phase"] {
  return key.startsWith("fetch") ? "downloading" : "processing"
}

export class BgRemovalAbortError extends Error {
  constructor() {
    super("Background removal aborted")
    this.name = "BgRemovalAbortError"
  }
}

export async function removeBackground(
  source: Blob,
  onProgress?: (p: BgRemovalProgress) => void,
  signal?: AbortSignal
): Promise<Blob> {
  if (signal?.aborted) throw new BgRemovalAbortError()
  const mod = await import("@imgly/background-removal")
  if (signal?.aborted) throw new BgRemovalAbortError()
  const result = await mod.removeBackground(source, {
    // isnet is the highest-quality of the three free variants (vs. fp16 /
    // quint8 quantized fallbacks). Library auto-falls-back if WebGPU is
    // missing.
    model: "isnet",
    output: { format: "image/png", quality: 1 },
    progress: onProgress
      ? (key, current, total) => {
          const pct = total > 0 ? Math.round((current / total) * 100) : 0
          onProgress({ phase: mapProgressKey(key), pct })
        }
      : undefined,
  })
  // Library doesn't accept AbortSignal, so we honor abort by dropping the
  // result before the caller commits it to state.
  if (signal?.aborted) throw new BgRemovalAbortError()
  return result
}
