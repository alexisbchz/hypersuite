import { ImageResponse } from "next/og"

export const alt = "Hypersuite Audio — Generate and edit audio with AI"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function AudioOpengraph() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0a0a0a",
          color: "white",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -200,
            width: 720,
            height: 720,
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, #a4c8ff 0%, #2a5cd9 50%, #1a3088 100%)",
            filter: "blur(8px)",
            opacity: 0.95,
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, #a4c8ff 0%, #2a5cd9 50%, #1a3088 100%)",
            }}
          />
          <span
            style={{
              fontSize: 32,
              fontWeight: 500,
              color: "#a3a3a3",
              letterSpacing: -0.5,
            }}
          >
            Hypersuite
          </span>
        </div>
        <span
          style={{
            marginTop: 24,
            fontSize: 96,
            fontWeight: 600,
            letterSpacing: -2,
            zIndex: 1,
          }}
        >
          Audio
        </span>
        <p
          style={{
            marginTop: 24,
            fontSize: 32,
            color: "#a3a3a3",
            maxWidth: 820,
            lineHeight: 1.3,
            zIndex: 1,
          }}
        >
          Generate and edit audio with AI.
        </p>
      </div>
    ),
    size
  )
}
