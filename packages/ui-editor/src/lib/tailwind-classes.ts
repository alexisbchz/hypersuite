/** Curated Tailwind v3/v4 utility class list used to power Monaco
 *  autocomplete. This is intentionally not exhaustive — the full
 *  generated class list runs to ~250k entries; we ship the common ~3k
 *  that cover virtually every screenshot reproduction we've seen.
 *
 *  The list is generated from a small set of templates and palettes so
 *  it stays a few KB minified. If you need a one-off class that isn't
 *  here, just type it — Tailwind's CDN doesn't care whether Monaco
 *  knew about it. */

const COLORS = [
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
] as const

const COLOR_STEPS = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const

const SPACING = [
  0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24,
  28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96,
] as const

const FRACTIONS = [
  "1/2",
  "1/3",
  "2/3",
  "1/4",
  "2/4",
  "3/4",
  "1/5",
  "2/5",
  "3/5",
  "4/5",
  "1/6",
  "5/6",
  "1/12",
  "11/12",
  "full",
  "screen",
  "min",
  "max",
  "fit",
  "auto",
] as const

const STATES = [
  "hover",
  "focus",
  "focus-visible",
  "active",
  "disabled",
  "group-hover",
  "group-focus",
  "peer-checked",
  "dark",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "first",
  "last",
  "odd",
  "even",
  "data-[state=open]",
  "data-[state=closed]",
  "aria-selected",
  "before",
  "after",
] as const

function colorClasses(prefix: string): string[] {
  const out: string[] = []
  out.push(`${prefix}-inherit`, `${prefix}-current`, `${prefix}-transparent`)
  out.push(`${prefix}-white`, `${prefix}-black`)
  for (const c of COLORS) {
    for (const s of COLOR_STEPS) {
      out.push(`${prefix}-${c}-${s}`)
    }
  }
  return out
}

function spacingClasses(prefix: string): string[] {
  const out: string[] = []
  for (const s of SPACING) {
    out.push(`${prefix}-${s}`)
  }
  out.push(`${prefix}-px`, `${prefix}-auto`)
  return out
}

function fractionClasses(prefix: string): string[] {
  return FRACTIONS.map((f) => `${prefix}-${f}`)
}

function arbitrary(prefix: string): string {
  return `${prefix}-[value]`
}

const LAYOUT = [
  "container",
  "block",
  "inline-block",
  "inline",
  "flex",
  "inline-flex",
  "grid",
  "inline-grid",
  "table",
  "hidden",
  "contents",
  "flow-root",
  "isolate",
  "isolation-auto",
  // box
  "box-border",
  "box-content",
  // overflow
  "overflow-auto",
  "overflow-hidden",
  "overflow-clip",
  "overflow-visible",
  "overflow-scroll",
  "overflow-x-auto",
  "overflow-y-auto",
  "overflow-x-hidden",
  "overflow-y-hidden",
  "overflow-x-scroll",
  "overflow-y-scroll",
  // position
  "static",
  "fixed",
  "absolute",
  "relative",
  "sticky",
  // z-index
  "z-0",
  "z-10",
  "z-20",
  "z-30",
  "z-40",
  "z-50",
  "z-auto",
  // visibility
  "visible",
  "invisible",
  "collapse",
]

const FLEX_GRID = [
  "flex-row",
  "flex-row-reverse",
  "flex-col",
  "flex-col-reverse",
  "flex-wrap",
  "flex-wrap-reverse",
  "flex-nowrap",
  "flex-1",
  "flex-auto",
  "flex-initial",
  "flex-none",
  "grow",
  "grow-0",
  "shrink",
  "shrink-0",
  "items-start",
  "items-end",
  "items-center",
  "items-baseline",
  "items-stretch",
  "justify-start",
  "justify-end",
  "justify-center",
  "justify-between",
  "justify-around",
  "justify-evenly",
  "self-auto",
  "self-start",
  "self-end",
  "self-center",
  "self-stretch",
  "content-center",
  "content-start",
  "content-end",
  "content-between",
  "content-around",
  "place-items-center",
  "place-items-start",
  "place-items-end",
  "place-content-center",
  "place-content-between",
  ...["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].flatMap(
    (n) => [
      `grid-cols-${n}`,
      `grid-rows-${n}`,
      `col-span-${n}`,
      `row-span-${n}`,
    ]
  ),
  "grid-cols-none",
  "grid-rows-none",
  "col-span-full",
  "row-span-full",
  "gap-x-2",
  "gap-x-4",
  "gap-x-6",
  "gap-y-2",
  "gap-y-4",
  "gap-y-6",
]

const TEXT = [
  // size
  "text-xs",
  "text-sm",
  "text-base",
  "text-lg",
  "text-xl",
  "text-2xl",
  "text-3xl",
  "text-4xl",
  "text-5xl",
  "text-6xl",
  "text-7xl",
  "text-8xl",
  "text-9xl",
  // weight
  "font-thin",
  "font-extralight",
  "font-light",
  "font-normal",
  "font-medium",
  "font-semibold",
  "font-bold",
  "font-extrabold",
  "font-black",
  // family
  "font-sans",
  "font-serif",
  "font-mono",
  // align
  "text-left",
  "text-center",
  "text-right",
  "text-justify",
  // decoration
  "underline",
  "overline",
  "line-through",
  "no-underline",
  // transform
  "uppercase",
  "lowercase",
  "capitalize",
  "normal-case",
  // style
  "italic",
  "not-italic",
  // leading
  "leading-none",
  "leading-tight",
  "leading-snug",
  "leading-normal",
  "leading-relaxed",
  "leading-loose",
  "leading-3",
  "leading-4",
  "leading-5",
  "leading-6",
  "leading-7",
  "leading-8",
  "leading-9",
  "leading-10",
  // tracking
  "tracking-tighter",
  "tracking-tight",
  "tracking-normal",
  "tracking-wide",
  "tracking-wider",
  "tracking-widest",
  // truncate / line clamp
  "truncate",
  "text-ellipsis",
  "text-clip",
  "whitespace-normal",
  "whitespace-nowrap",
  "whitespace-pre",
  "whitespace-pre-line",
  "whitespace-pre-wrap",
  "break-normal",
  "break-words",
  "break-all",
  "line-clamp-1",
  "line-clamp-2",
  "line-clamp-3",
  "line-clamp-4",
  "line-clamp-5",
  "line-clamp-6",
]

const BORDER_RADIUS = [
  "rounded-none",
  "rounded-sm",
  "rounded",
  "rounded-md",
  "rounded-lg",
  "rounded-xl",
  "rounded-2xl",
  "rounded-3xl",
  "rounded-full",
  "rounded-t-none",
  "rounded-t-sm",
  "rounded-t",
  "rounded-t-md",
  "rounded-t-lg",
  "rounded-t-xl",
  "rounded-t-2xl",
  "rounded-t-3xl",
  "rounded-t-full",
  "rounded-b-none",
  "rounded-b-sm",
  "rounded-b",
  "rounded-b-md",
  "rounded-b-lg",
  "rounded-b-xl",
  "rounded-b-2xl",
  "rounded-b-3xl",
  "rounded-b-full",
  "rounded-l-md",
  "rounded-r-md",
  "rounded-tl-md",
  "rounded-tr-md",
  "rounded-bl-md",
  "rounded-br-md",
]

const BORDER_WIDTH = [
  "border",
  "border-0",
  "border-2",
  "border-4",
  "border-8",
  "border-t",
  "border-b",
  "border-l",
  "border-r",
  "border-t-0",
  "border-b-0",
  "border-l-0",
  "border-r-0",
  "border-t-2",
  "border-b-2",
  "border-l-2",
  "border-r-2",
  "border-solid",
  "border-dashed",
  "border-dotted",
  "border-double",
  "border-none",
  // ring
  "ring",
  "ring-0",
  "ring-1",
  "ring-2",
  "ring-4",
  "ring-8",
  "ring-inset",
  // divide
  "divide-x",
  "divide-y",
  "divide-x-2",
  "divide-y-2",
  "divide-none",
]

const EFFECTS = [
  // shadow
  "shadow-sm",
  "shadow",
  "shadow-md",
  "shadow-lg",
  "shadow-xl",
  "shadow-2xl",
  "shadow-inner",
  "shadow-none",
  // opacity
  ...[
    "0",
    "5",
    "10",
    "20",
    "25",
    "30",
    "40",
    "50",
    "60",
    "70",
    "75",
    "80",
    "90",
    "95",
    "100",
  ].map((o) => `opacity-${o}`),
  // backdrop
  "backdrop-blur",
  "backdrop-blur-sm",
  "backdrop-blur-md",
  "backdrop-blur-lg",
  "backdrop-blur-xl",
  "backdrop-blur-2xl",
  "backdrop-blur-3xl",
  "backdrop-blur-none",
  "backdrop-brightness-50",
  "backdrop-brightness-100",
  "backdrop-brightness-150",
  "backdrop-saturate-150",
  "backdrop-contrast-100",
  // filter
  "blur",
  "blur-none",
  "blur-sm",
  "blur-md",
  "blur-lg",
  "blur-xl",
  "blur-2xl",
  "blur-3xl",
  "brightness-50",
  "brightness-100",
  "brightness-150",
  "contrast-100",
  "saturate-150",
  "grayscale",
  "grayscale-0",
  "invert",
  "invert-0",
  // mix-blend
  "mix-blend-normal",
  "mix-blend-multiply",
  "mix-blend-screen",
  "mix-blend-overlay",
  "mix-blend-darken",
  "mix-blend-lighten",
]

const TRANSFORMS = [
  // scale
  "scale-0",
  "scale-50",
  "scale-75",
  "scale-90",
  "scale-95",
  "scale-100",
  "scale-105",
  "scale-110",
  "scale-125",
  "scale-150",
  "scale-x-100",
  "scale-y-100",
  // rotate
  "rotate-0",
  "rotate-1",
  "rotate-2",
  "rotate-3",
  "rotate-6",
  "rotate-12",
  "rotate-45",
  "rotate-90",
  "rotate-180",
  "-rotate-180",
  "-rotate-90",
  "-rotate-45",
  // translate
  "translate-x-0",
  "translate-x-px",
  "translate-x-1",
  "translate-x-2",
  "translate-x-4",
  "translate-x-full",
  "-translate-x-full",
  "translate-y-0",
  "translate-y-px",
  "translate-y-1",
  "translate-y-2",
  "translate-y-4",
  "translate-y-full",
  "-translate-y-full",
  // skew
  "skew-x-0",
  "skew-x-3",
  "skew-x-6",
  "skew-y-3",
  // origin
  "origin-center",
  "origin-top",
  "origin-top-right",
  "origin-right",
  "origin-bottom-right",
  "origin-bottom",
  "origin-bottom-left",
  "origin-left",
  "origin-top-left",
]

const INTERACTIVITY = [
  "cursor-auto",
  "cursor-default",
  "cursor-pointer",
  "cursor-wait",
  "cursor-text",
  "cursor-move",
  "cursor-help",
  "cursor-not-allowed",
  "cursor-grab",
  "cursor-grabbing",
  "select-none",
  "select-text",
  "select-all",
  "select-auto",
  "pointer-events-none",
  "pointer-events-auto",
  "resize",
  "resize-none",
  "resize-y",
  "resize-x",
  "appearance-none",
  "scroll-smooth",
  "scroll-auto",
  "touch-auto",
  "touch-none",
  "touch-pan-x",
  "touch-pan-y",
  "outline-none",
  "outline",
  "outline-1",
  "outline-2",
  "outline-4",
  "outline-offset-2",
]

const TRANSITIONS = [
  "transition",
  "transition-all",
  "transition-none",
  "transition-colors",
  "transition-opacity",
  "transition-transform",
  "transition-shadow",
  "duration-75",
  "duration-100",
  "duration-150",
  "duration-200",
  "duration-300",
  "duration-500",
  "duration-700",
  "duration-1000",
  "ease-linear",
  "ease-in",
  "ease-out",
  "ease-in-out",
  "delay-75",
  "delay-100",
  "delay-150",
  "delay-200",
  "delay-300",
  "delay-500",
  "delay-700",
  "animate-none",
  "animate-spin",
  "animate-ping",
  "animate-pulse",
  "animate-bounce",
]

function buildBase(): string[] {
  const out: string[] = []
  // Spacing-derived
  for (const prefix of [
    "p",
    "px",
    "py",
    "pt",
    "pb",
    "pl",
    "pr",
    "m",
    "mx",
    "my",
    "mt",
    "mb",
    "ml",
    "mr",
    "gap",
    "space-x",
    "space-y",
    "inset",
    "top",
    "right",
    "bottom",
    "left",
    "translate-x",
    "translate-y",
  ]) {
    out.push(...spacingClasses(prefix))
  }
  // negative margins
  for (const prefix of ["m", "mx", "my", "mt", "mb", "ml", "mr"]) {
    for (const s of SPACING) {
      if (s === 0) continue
      out.push(`-${prefix}-${s}`)
    }
  }
  // size
  for (const prefix of ["w", "h", "min-w", "min-h", "max-w", "max-h", "size"]) {
    out.push(...spacingClasses(prefix))
    out.push(...fractionClasses(prefix))
  }
  // colors
  for (const prefix of [
    "bg",
    "text",
    "border",
    "ring",
    "outline",
    "divide",
    "fill",
    "stroke",
    "from",
    "via",
    "to",
    "shadow",
    "decoration",
    "placeholder",
    "caret",
    "accent",
  ]) {
    out.push(...colorClasses(prefix))
  }
  // gradients
  out.push(
    "bg-gradient-to-r",
    "bg-gradient-to-l",
    "bg-gradient-to-t",
    "bg-gradient-to-b",
    "bg-gradient-to-tr",
    "bg-gradient-to-tl",
    "bg-gradient-to-br",
    "bg-gradient-to-bl",
    "bg-none"
  )
  // arbitrary value placeholders so users see the shape exists
  for (const prefix of [
    "w",
    "h",
    "p",
    "m",
    "bg",
    "text",
    "border",
    "top",
    "left",
    "right",
    "bottom",
    "grid-cols",
    "gap",
  ]) {
    out.push(arbitrary(prefix))
  }
  out.push(
    ...LAYOUT,
    ...FLEX_GRID,
    ...TEXT,
    ...BORDER_RADIUS,
    ...BORDER_WIDTH,
    ...EFFECTS,
    ...TRANSFORMS,
    ...INTERACTIVITY,
    ...TRANSITIONS
  )
  return out
}

const BASE_CLASSES = buildBase()

/** Variant-prefixed expansion of a key subset of base classes. Including
 *  every variant × every base would balloon to ~50k entries — instead we
 *  prefix the smaller "interactive" subset that's most likely to be used
 *  with a state variant (colors, opacity, scale, etc.). */
function buildVariants(): string[] {
  const out: string[] = []
  const variantTargets = BASE_CLASSES.filter(
    (c) =>
      c.startsWith("bg-") ||
      c.startsWith("text-") ||
      c.startsWith("border-") ||
      c.startsWith("ring-") ||
      c.startsWith("shadow") ||
      c.startsWith("opacity-") ||
      c.startsWith("scale-") ||
      c.startsWith("rotate-") ||
      c.startsWith("translate-") ||
      c.startsWith("rounded")
  ).slice(0, 600)
  for (const variant of STATES) {
    for (const cls of variantTargets) {
      out.push(`${variant}:${cls}`)
    }
  }
  return out
}

export const TAILWIND_CLASSES: readonly string[] = Array.from(
  new Set([...BASE_CLASSES, ...buildVariants()])
)
