import { getTranslations } from "next-intl/server";
import { FAQ_PRIVACY_KEYS } from "@/lib/content/faq";

/**
 * The answer to "what happens to my bill?", rendered from the Privacy page's
 * own summary strings. The Help page and the FAQ both use this component, so
 * neither carries a copy of the wording that could drift from /privacy.
 */
export async function PrivacyAnswer() {
  const t = await getTranslations("Privacy.summary");
  return (
    <>
      {FAQ_PRIVACY_KEYS.map((key) => (
        <p key={key}>{t(key)}</p>
      ))}
    </>
  );
}
