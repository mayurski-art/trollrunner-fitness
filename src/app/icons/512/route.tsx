import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FF5A1F",
          color: "white",
          fontSize: 256,
          fontWeight: 800,
          fontFamily: "sans-serif",
        }}
      >
        TR
      </div>
    ),
    { width: 512, height: 512 }
  );
}
