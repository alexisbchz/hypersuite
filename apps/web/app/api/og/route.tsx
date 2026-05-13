import { ImageResponse } from "next/og"

export const runtime = "edge"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const title = url.searchParams.get("title") ?? "Hypercreate"
  const subtitle =
    url.searchParams.get("subtitle") ?? "An open source creativity suite."
  const palette = url.searchParams.get("palette") ?? "pink"

  const gradients: Record<string, string> = {
    pink: "linear-gradient(135deg, #f3a3c2 0%, #c41e5a 50%, #841a3a 100%)",
    blue: "linear-gradient(135deg, #a4c8ff 0%, #2a5cd9 50%, #1a3088 100%)",
    green: "linear-gradient(135deg, #b9f6c5 0%, #2eb462 50%, #145c33 100%)",
  }
  const grad = gradients[palette] ?? gradients.pink

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
          background: grad,
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
            background: grad,
          }}
        />
        <span style={{ fontSize: 64, fontWeight: 600, letterSpacing: -1 }}>
          {title}
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
        {subtitle}
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
    { width: 1200, height: 630 }
  )
}
