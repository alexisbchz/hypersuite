/** The click-to-drop component library. Each entry has the same HTML
 *  used at full size on the canvas, plus a `thumbnail` field that is a
 *  smaller, denser variant rendered inside the side-panel tile via
 *  `dangerouslySetInnerHTML` on a scaled wrapper.
 *
 *  Keeping the thumbnail identical to `html` is fine in most cases; the
 *  field exists for the few designs where the full version doesn't read
 *  well at thumbnail scale and we want a cleaner stand-in. */

export type LibraryTemplate = {
  id: string
  name: string
  width: number
  height: number
  background: string
  html: string
  thumbnail: string
}

function entry(
  t: Omit<LibraryTemplate, "id" | "thumbnail"> & { thumbnail?: string }
): LibraryTemplate {
  return {
    id: t.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    thumbnail: t.thumbnail ?? t.html,
    ...t,
  }
}

export const LIBRARY_TEMPLATES: LibraryTemplate[] = [
  entry({
    name: "Primary button",
    width: 360,
    height: 200,
    background: "#0f172a",
    html: `<div class="flex h-full w-full items-center justify-center p-6">
  <button class="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-slate-900 shadow-lg shadow-black/20 ring-1 ring-white/10 transition-all hover:-translate-y-0.5 hover:bg-slate-100">
    Get started →
  </button>
</div>`,
  }),
  entry({
    name: "Ghost button",
    width: 360,
    height: 200,
    background: "#ffffff",
    html: `<div class="flex h-full w-full items-center justify-center p-6">
  <button class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900">
    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    Send feedback
  </button>
</div>`,
  }),
  entry({
    name: "Pricing card",
    width: 360,
    height: 460,
    background: "#f8fafc",
    html: `<div class="flex h-full w-full items-center justify-center p-6">
  <div class="flex w-full max-w-xs flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div>
      <p class="text-xs font-semibold uppercase tracking-wider text-indigo-600">Pro</p>
      <p class="mt-3 flex items-baseline gap-1">
        <span class="text-4xl font-bold tracking-tight text-slate-900">$24</span>
        <span class="text-sm text-slate-500">/ month</span>
      </p>
      <p class="mt-2 text-sm text-slate-600">For teams scaling past a few users.</p>
    </div>
    <ul class="flex flex-col gap-2 text-sm text-slate-700">
      <li class="flex items-center gap-2"><span class="text-indigo-600">✓</span> Unlimited projects</li>
      <li class="flex items-center gap-2"><span class="text-indigo-600">✓</span> Priority support</li>
      <li class="flex items-center gap-2"><span class="text-indigo-600">✓</span> Custom integrations</li>
    </ul>
    <button class="mt-auto inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700">
      Upgrade to Pro
    </button>
  </div>
</div>`,
  }),
  entry({
    name: "Stat tile",
    width: 280,
    height: 200,
    background: "#ffffff",
    html: `<div class="flex h-full w-full items-center justify-center p-5">
  <div class="flex w-full flex-col gap-1 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
    <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Monthly revenue</p>
    <p class="text-3xl font-semibold tracking-tight text-slate-900">$48,290</p>
    <p class="flex items-center gap-1 text-xs font-medium text-emerald-600">↑ 12.4% <span class="text-slate-400">vs last month</span></p>
  </div>
</div>`,
  }),
  entry({
    name: "Avatar stack",
    width: 280,
    height: 160,
    background: "#fafafa",
    html: `<div class="flex h-full w-full flex-col items-center justify-center gap-3 p-5">
  <div class="flex -space-x-2">
    <span class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-rose-200 text-xs font-semibold text-rose-900 ring-2 ring-white">AB</span>
    <span class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-200 text-xs font-semibold text-indigo-900 ring-2 ring-white">CD</span>
    <span class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-200 text-xs font-semibold text-emerald-900 ring-2 ring-white">EF</span>
    <span class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-200 text-xs font-semibold text-amber-900 ring-2 ring-white">GH</span>
    <span class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600 ring-2 ring-white">+8</span>
  </div>
  <p class="text-xs text-slate-500">12 collaborators online</p>
</div>`,
  }),
  entry({
    name: "Toggle group",
    width: 340,
    height: 160,
    background: "#ffffff",
    html: `<div class="flex h-full w-full items-center justify-center p-6">
  <div class="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-sm">
    <button class="rounded-md bg-white px-3 py-1.5 font-medium text-slate-900 shadow-xs ring-1 ring-slate-200">Monthly</button>
    <button class="rounded-md px-3 py-1.5 text-slate-500 hover:text-slate-900">Yearly</button>
    <button class="rounded-md px-3 py-1.5 text-slate-500 hover:text-slate-900">Lifetime</button>
  </div>
</div>`,
  }),
  entry({
    name: "Hero",
    width: 760,
    height: 440,
    background: "#0b1120",
    html: `<div class="relative isolate flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-10 text-white">
  <div class="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl"></div>
  <div class="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl"></div>
  <div class="flex max-w-xl flex-col items-start gap-6">
    <span class="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur"><span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> Now in beta</span>
    <h1 class="text-4xl font-bold leading-tight tracking-tight">Reproduce screenshots, <span class="bg-gradient-to-r from-indigo-300 to-fuchsia-300 bg-clip-text text-transparent">pixel by pixel</span></h1>
    <p class="max-w-md text-base text-white/70">Drop a reference, write Tailwind in the editor, watch your component land on the canvas the instant you stop typing.</p>
    <div class="flex flex-wrap items-center gap-2">
      <button class="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100">Start building →</button>
      <button class="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/10">Watch demo</button>
    </div>
  </div>
</div>`,
  }),
  entry({
    name: "Input field",
    width: 360,
    height: 200,
    background: "#ffffff",
    html: `<div class="flex h-full w-full items-center justify-center p-6">
  <label class="flex w-full max-w-xs flex-col gap-1.5">
    <span class="text-sm font-medium text-slate-700">Email</span>
    <div class="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 transition-colors focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
      <span class="text-slate-400">@</span>
      <input type="email" placeholder="you@company.com" class="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"/>
    </div>
    <span class="text-xs text-slate-500">We'll only use this to send updates.</span>
  </label>
</div>`,
  }),
  entry({
    name: "Toast",
    width: 380,
    height: 160,
    background: "#f1f5f9",
    html: `<div class="flex h-full w-full items-center justify-center p-5">
  <div class="flex w-full max-w-sm items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/5">
    <span class="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">✓</span>
    <div class="min-w-0 flex-1">
      <p class="text-sm font-medium text-slate-900">Changes saved</p>
      <p class="text-xs text-slate-500">Your draft was synced to the cloud just now.</p>
    </div>
  </div>
</div>`,
  }),
  entry({
    name: "Navbar",
    width: 760,
    height: 96,
    background: "#ffffff",
    html: `<div class="flex h-full w-full items-center justify-center">
  <nav class="flex w-full items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
    <div class="flex items-center gap-6">
      <span class="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <span class="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white">◆</span>
        Acme
      </span>
      <ul class="flex items-center gap-1 text-sm text-slate-600">
        <li><a class="rounded-md px-2 py-1 hover:bg-slate-100 hover:text-slate-900">Product</a></li>
        <li><a class="rounded-md px-2 py-1 hover:bg-slate-100 hover:text-slate-900">Pricing</a></li>
        <li><a class="rounded-md px-2 py-1 hover:bg-slate-100 hover:text-slate-900">Docs</a></li>
      </ul>
    </div>
    <div class="flex items-center gap-2">
      <button class="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">Sign in</button>
      <button class="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800">Sign up</button>
    </div>
  </nav>
</div>`,
  }),
  entry({
    name: "Notification",
    width: 360,
    height: 200,
    background: "#fef3f2",
    html: `<div class="flex h-full w-full items-center justify-center p-5">
  <div class="flex w-full items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
    <span class="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-200 text-rose-900">!</span>
    <div class="min-w-0 flex-1">
      <p class="text-sm font-semibold">Payment failed</p>
      <p class="mt-0.5 text-xs text-rose-800/80">Your card was declined. Update your billing details to keep your subscription active.</p>
      <button class="mt-3 inline-flex rounded-md bg-rose-600 px-3 py-1 text-xs font-medium text-white hover:bg-rose-700">Update card</button>
    </div>
  </div>
</div>`,
  }),
  entry({
    name: "Modal",
    width: 480,
    height: 360,
    background: "#0f172a99",
    html: `<div class="flex h-full w-full items-center justify-center bg-slate-900/40 p-6 backdrop-blur-sm">
  <div class="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
    <div>
      <h2 class="text-lg font-semibold text-slate-900">Delete this project?</h2>
      <p class="mt-1 text-sm text-slate-600">This action can't be undone. All files and history will be lost.</p>
    </div>
    <div class="mt-2 flex items-center justify-end gap-2">
      <button class="rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100">Cancel</button>
      <button class="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700">Delete project</button>
    </div>
  </div>
</div>`,
  }),
  entry({
    name: "Code badge",
    width: 280,
    height: 160,
    background: "#020617",
    html: `<div class="flex h-full w-full items-center justify-center p-5">
  <code class="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100 ring-1 ring-slate-700/50">
    <span class="text-emerald-400">$</span>
    <span>bun create hypercreate</span>
  </code>
</div>`,
  }),
  entry({
    name: "Tag chip",
    width: 280,
    height: 160,
    background: "#ffffff",
    html: `<div class="flex h-full w-full items-center justify-center gap-1.5 p-5">
  <span class="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">design</span>
  <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">shipped</span>
  <span class="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">urgent</span>
</div>`,
  }),
  entry({
    name: "Progress bar",
    width: 360,
    height: 160,
    background: "#ffffff",
    html: `<div class="flex h-full w-full items-center justify-center p-6">
  <div class="flex w-full max-w-xs flex-col gap-2">
    <div class="flex items-center justify-between text-xs text-slate-600">
      <span>Uploading…</span>
      <span class="font-mono">68%</span>
    </div>
    <div class="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div class="h-full w-[68%] rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"></div>
    </div>
  </div>
</div>`,
  }),
  entry({
    name: "Search bar",
    width: 480,
    height: 160,
    background: "#ffffff",
    html: `<div class="flex h-full w-full items-center justify-center p-5">
  <div class="flex w-full max-w-md items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-xs focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
    <svg class="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
    <input placeholder="Search components, classes, anything…" class="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"/>
    <kbd class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">⌘K</kbd>
  </div>
</div>`,
  }),
]
