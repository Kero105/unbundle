import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// The "U" of the wordmark in the brand teal on the warm background.
export default function Icon() {
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
          fontSize: 24,
          fontWeight: 700,
          borderRadius: 7,
        }}
      >
        U
      </div>
    ),
    { ...size },
  );
}
