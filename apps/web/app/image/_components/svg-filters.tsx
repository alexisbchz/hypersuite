import type { LayerFilters } from "./types"

export function svgFilterId(layerId: string) {
  return `hyperimg-fx-${layerId}`
}

export function hasSvgFilter(f: LayerFilters | undefined): boolean {
  if (!f) return false
  return (
    !!(f.sharpen && f.sharpen.strength > 0) ||
    !!(f.noise && f.noise.amount > 0) ||
    !!(f.grain && f.grain.amount > 0)
  )
}

export function LayerSvgFilter({
  id,
  filters,
}: {
  id: string
  filters: LayerFilters
}) {
  const stages: React.ReactNode[] = []
  let result = "SourceGraphic"

  if (filters.sharpen && filters.sharpen.strength > 0) {
    const s = (filters.sharpen.strength / 100) * 1.5
    const km = `0 ${-s} 0 ${-s} ${1 + 4 * s} ${-s} 0 ${-s} 0`
    stages.push(
      <feConvolveMatrix
        key="sh"
        in={result}
        order="3"
        preserveAlpha="true"
        kernelMatrix={km}
        result="fx-sharpen"
      />
    )
    result = "fx-sharpen"
  }

  if (filters.noise && filters.noise.amount > 0) {
    const a = filters.noise.amount / 100
    stages.push(
      <feTurbulence
        key="nt"
        type="fractalNoise"
        baseFrequency="0.9"
        numOctaves={2}
        seed={1}
        stitchTiles="stitch"
        result="fx-noise-src"
      />,
      <feColorMatrix
        key="nc"
        in="fx-noise-src"
        type="matrix"
        values={
          filters.noise.mono
            ? `0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 ${a} 0`
            : `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${a} 0`
        }
        result="fx-noise-tinted"
      />,
      <feComposite
        key="ncomp"
        in="fx-noise-tinted"
        in2={result}
        operator="in"
        result="fx-noise-masked"
      />,
      <feBlend
        key="nb"
        in="fx-noise-masked"
        in2={result}
        mode="normal"
        result="fx-noised"
      />
    )
    result = "fx-noised"
  }

  if (filters.grain && filters.grain.amount > 0) {
    const a = filters.grain.amount / 100
    const scale = Math.max(0.25, filters.grain.scale ?? 1)
    const freq = (1 / scale).toFixed(3)
    stages.push(
      <feTurbulence
        key="gt"
        type="fractalNoise"
        baseFrequency={freq}
        numOctaves={3}
        seed={2}
        stitchTiles="stitch"
        result="fx-grain-src"
      />,
      <feColorMatrix
        key="gc"
        in="fx-grain-src"
        type="matrix"
        values={`0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 ${a} 0`}
        result="fx-grain-mono"
      />,
      <feComposite
        key="gcomp"
        in="fx-grain-mono"
        in2={result}
        operator="in"
        result="fx-grain-masked"
      />,
      <feBlend
        key="gb"
        in="fx-grain-masked"
        in2={result}
        mode="overlay"
        result="fx-grained"
      />
    )
    result = "fx-grained"
  }

  return (
    <filter id={id} x="-2%" y="-2%" width="104%" height="104%">
      {stages}
    </filter>
  )
}
