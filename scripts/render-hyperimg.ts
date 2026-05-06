#!/usr/bin/env bun
// Renders a .hyperimg archive to PNG using ImageMagick, mirroring the
// editor's export pipeline (object-cover crops, Lanczos downscale, layer
// composition). Useful for verifying export parity outside the browser.
//
// Usage:
//   bun scripts/render-hyperimg.ts <input.hyperimg> [output.png]
//
// Requires: ImageMagick 7+ (`magick` binary on PATH) and `unzip`.

import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawnSync } from "node:child_process"

type Layer = {
  id: string
  name: string
  kind: "image" | "text" | "shape" | "raster" | "path" | "group"
  visible: boolean
  opacity: number
  blendMode: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  src?: string
  color?: string
}

type Manifest = {
  version: number
  doc: { width: number; height: number; background?: string }
  layers: Layer[]
}

function run(cmd: string, args: string[]): void {
  const r = spawnSync(cmd, args, { stdio: ["ignore", "inherit", "inherit"] })
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} → exit ${r.status}`)
  }
}

function getNaturalSize(path: string): { w: number; h: number } {
  const r = spawnSync("magick", ["identify", "-format", "%w %h", path])
  if (r.status !== 0) throw new Error(`identify failed: ${path}`)
  const [w, h] = r.stdout.toString().trim().split(" ").map(Number)
  return { w, h }
}

function objectCoverCrop(
  src: { w: number; h: number },
  dst: { w: number; h: number },
): { x: number; y: number; w: number; h: number } {
  const sr = src.w / src.h
  const dr = dst.w / dst.h
  let cw: number
  let ch: number
  if (sr > dr) {
    ch = src.h
    cw = src.h * dr
  } else {
    cw = src.w
    ch = src.w / dr
  }
  return {
    x: Math.round((src.w - cw) / 2),
    y: Math.round((src.h - ch) / 2),
    w: Math.round(cw),
    h: Math.round(ch),
  }
}

async function main() {
  const [, , input, outputArg] = process.argv
  if (!input) {
    console.error("usage: bun scripts/render-hyperimg.ts <input.hyperimg> [out.png]")
    process.exit(1)
  }
  const output = outputArg ?? input.replace(/\.hyperimg$/, "") + ".png"

  const work = mkdtempSync(join(tmpdir(), "hyperimg-"))
  const debug = process.env.DEBUG_HYPERIMG === "1"
  if (debug) console.error("workdir:", work)
  try {
    run("unzip", ["-q", input, "-d", work])
    const manifest: Manifest = JSON.parse(
      readFileSync(join(work, "manifest.json"), "utf8"),
    )
    const { width: docW, height: docH } = manifest.doc

    // Step 1: pre-resize each visible image layer (Lanczos + object-cover).
    const prepared: Array<{ path: string; x: number; y: number; blend: string }> =
      []
    for (const l of [...manifest.layers].reverse()) {
      if (!l.visible) continue
      if (l.kind !== "image" || !l.src) continue // text/shape/raster TBD

      const srcPath = join(work, l.src)
      const src = getNaturalSize(srcPath)
      const dst = { w: Math.round(l.width), h: Math.round(l.height) }
      const crop = objectCoverCrop(src, dst)
      const layerOut = join(work, `_${l.id}.png`)
      run("magick", [
        srcPath,
        "-crop",
        `${crop.w}x${crop.h}+${crop.x}+${crop.y}`,
        "+repage",
        "-filter",
        "Lanczos",
        "-resize",
        `${dst.w}x${dst.h}!`,
        "-colorspace",
        "sRGB",
        "-type",
        "TrueColorAlpha",
        layerOut,
      ])
      prepared.push({
        path: layerOut,
        x: Math.round(l.x),
        y: Math.round(l.y),
        blend: l.blendMode,
      })
    }

    // Step 2: composite everything in a single magick invocation. Doing it
    // in one pass avoids intermediate PNG writes — and PNG's encoder will
    // otherwise auto-downgrade an all-transparent or mostly-grayscale frame
    // to Bilevel/Gray, killing color in subsequent composites.
    const args: string[] = ["-size", `${docW}x${docH}`, "xc:none"]
    for (const p of prepared) {
      args.push(
        "(",
        p.path,
        "-background",
        "none",
        "-compose",
        "Copy",
        "-extent",
        `${docW}x${docH}-${p.x}-${p.y}`,
        ")",
        "-compose",
        compositeOp(p.blend),
        "-composite",
      )
    }
    args.push(
      "-background",
      "white",
      "-flatten",
      "-colorspace",
      "sRGB",
      "-type",
      "TrueColor",
      "-define",
      "png:color-type=2",
      output,
    )
    run("magick", args)
    console.log(output)
  } finally {
    if (!debug) rmSync(work, { recursive: true, force: true })
  }
}

function compositeOp(blend: string): string {
  switch (blend) {
    case "multiply":
      return "multiply"
    case "screen":
      return "screen"
    case "overlay":
      return "overlay"
    case "darken":
      return "darken"
    case "lighten":
      return "lighten"
    case "color-dodge":
      return "color-dodge"
    case "color-burn":
      return "color-burn"
    case "hard-light":
      return "hard-light"
    case "soft-light":
      return "soft-light"
    case "difference":
      return "difference"
    case "exclusion":
      return "exclusion"
    default:
      return "over"
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
