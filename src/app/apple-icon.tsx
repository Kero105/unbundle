import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen version of the wordmark "U"; iOS rounds the corners itself.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f5257",
          color: "#faf7f2",
          fontSize: 128,
          fontWeight: 700,
          borderRadius: 0,
        }}
      >
        U
      </div>
    ),
    { ...size },
  );
}
