import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#0b0b0d",
          color: "#f5f5f6",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 90,
            height: 90,
            borderRadius: 20,
            background: "#FF5A1F",
            color: "white",
            fontSize: 40,
            fontWeight: 800,
            marginBottom: 40,
          }}
        >
          TR
        </div>
        <div style={{ display: "flex", fontSize: 60, fontWeight: 700, letterSpacing: -1 }}>
          TrollRunner Fitness
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#a1a1aa", marginTop: 16, maxWidth: 900 }}>
          Your AI running and strength coach — adaptive plans, recovery, nutrition, and an
          activity feed that actually pushes you.
        </div>
      </div>
    ),
    size
  );
}
