import { ImageResponse } from "next/og"

export const alt = "Hypersuite — an open source creativity suite"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpengraphImage() {
  return new ImageResponse(
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
            "linear-gradient(135deg, #f3a3c2 0%, #c41e5a 50%, #841a3a 100%)",
          filter: "blur(8px)",
          opacity: 0.95,
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, #f3a3c2 0%, #c41e5a 50%, #841a3a 100%)",
          }}
        />
        <span style={{ fontSize: 64, fontWeight: 600, letterSpacing: -1 }}>
          Hypersuite
        </span>
      </div>
      <p
        style={{
          marginTop: 48,
          fontSize: 36,
          color: "#a3a3a3",
          maxWidth: 820,
          lineHeight: 1.3,
          zIndex: 1,
        }}
      >
        An open source creativity suite.
      </p>
      <p
        style={{
          marginTop: "auto",
          fontSize: 22,
          color: "#737373",
          zIndex: 1,
        }}
      >
        suite.alexisbouchez.com
      </p>
    </div>,
    size
  )
}
