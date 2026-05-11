import { ImageResponse } from "next/og"

export const alt = "Hypersuite — an open source creativity suite"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// og-25 framed-logo design from shadcnui-blocks.com/r/base/og-25, adapted
// for Hypersuite. Geist Medium fetched at the edge so we don't ship a font
// asset.
async function loadFont() {
  const res = await fetch(
    "https://fonts.gstatic.com/s/geist/v4/gyBhhwUxId8gMGYQMKR3pzfaWI_RruM4nQ.ttf"
  )
  return res.arrayBuffer()
}

export default async function OpengraphImage() {
  const fontData = await loadFont()
  const mode: "dark" | "light" = "dark"

  return new ImageResponse(
    <div
      tw={
        "relative flex h-full w-full " +
        (mode === "dark"
          ? "bg-neutral-900 text-white"
          : "bg-neutral-50 text-black")
      }
    >
      <div tw="flex flex-col items-center p-20 justify-center text-center w-full">
        <div
          tw={
            "relative flex items-center border px-14 py-8 shadow-md " +
            (mode === "dark"
              ? "border-neutral-700 bg-neutral-800 shadow-black/60"
              : "border-neutral-200 bg-white shadow-neutral-100")
          }
        >
          <div
            tw={
              "absolute -inset-y-24 -left-px w-px " +
              (mode === "dark" ? "bg-neutral-700" : "bg-neutral-200")
            }
          />
          <div
            tw={
              "absolute -inset-y-24 -right-px w-px " +
              (mode === "dark" ? "bg-neutral-700" : "bg-neutral-200")
            }
          />
          <div
            tw={
              "absolute -inset-x-24 -top-px h-px " +
              (mode === "dark" ? "bg-neutral-700" : "bg-neutral-200")
            }
          />
          <div
            tw={
              "absolute -inset-x-24 -bottom-px h-px " +
              (mode === "dark" ? "bg-neutral-700" : "bg-neutral-200")
            }
          />

          <div
            tw="rounded-full"
            style={{
              width: 86,
              height: 86,
              background:
                "linear-gradient(135deg, #f3a3c2 0%, #c41e5a 50%, #841a3a 100%)",
            }}
          />
          <span tw="ml-12 text-7xl font-medium tracking-tighter">
            Hypersuite
          </span>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "Geist",
          data: fontData,
          style: "normal",
          weight: 500,
        },
      ],
    }
  )
}
