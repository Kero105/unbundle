import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

export const alt = "Unbundle";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Text only: the wordmark and the tagline in both languages. Crawlers send no
// locale cookie, so both are shown rather than guessing one.
export default async function Image() {
  const [en, es] = await Promise.all([
    getTranslations({ locale: "en", namespace: "Meta" }),
    getTranslations({ locale: "es", namespace: "Meta" }),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 96,
          background: "#faf7f2",
          color: "#0f5257",
        }}
      >
        <div style={{ fontSize: 168, fontWeight: 700, letterSpacing: -4 }}>Unbundle</div>
        <div style={{ marginTop: 24, fontSize: 48, color: "#1f2933" }}>{en("og")}</div>
        <div style={{ marginTop: 16, fontSize: 36, color: "#52606d" }}>{es("og")}</div>
      </div>
    ),
    { ...size },
  );
}
