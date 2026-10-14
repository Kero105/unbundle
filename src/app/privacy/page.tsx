import { Suspense } from "react";
import { routeMetadata } from "@/lib/metadata";
import { getLocale, getTranslations } from "next-intl/server";
import { LegalPage, LegalSection, legalLinkClass } from "@/components/legal-page";
import { Skeleton } from "@/components/ui/skeleton";

const CONTACT_EMAIL = "rohankelkar2020@gmail.com";
const ANTHROPIC_RETENTION_URL =
  "https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data";

export const generateMetadata = () => routeMetadata("privacy");

async function Privacy() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Privacy")]);

  return (
    <LegalPage
      locale={locale}
      home={t("home")}
      title={t("title")}
      updatedLabel={t("updatedLabel")}
      updated={t("updated")}
      summaryTitle={t("summary.title")}
      summary={(["files", "browser", "anthropic", "delete", "sell", "storage"] as const).map((k) =>
        t(`summary.${k}`),
      )}
    >
      <p>{t("intro")}</p>

      <LegalSection title={t("collect.title")}>
        <ul className="list-disc space-y-1 pl-6">
          <li>{t("collect.email")}</li>
          <li>{t("collect.files")}</li>
          <li>{t("collect.items")}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("files.title")}>
        <ul className="list-disc space-y-1 pl-6">
          <li>{t("files.private")}</li>
          <li>{t("files.resized")}</li>
          <li>{t("files.checked")}</li>
          <li>{t("files.use")}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("anthropic.title")}>
        <p>
          {t.rich("anthropic.body", {
            link: (chunks) => (
              <a
                href={ANTHROPIC_RETENTION_URL}
                className={legalLinkClass}
                target="_blank"
                rel="noopener noreferrer"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
      </LegalSection>

      <LegalSection title={t("kept.title")}>
        <p>{t("kept.body")}</p>
      </LegalSection>

      <LegalSection title={t("cookies.title")}>
        <ul className="list-disc space-y-1 pl-6">
          <li>{t("cookies.language")}</li>
          <li>{t("cookies.signin")}</li>
          <li>{t("cookies.theme")}</li>
          <li>{t("cookies.none")}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("dont.title")}>
        <p>{t("dont.body")}</p>
      </LegalSection>

      <LegalSection title={t("delete.title")}>
        <p>{t("delete.body")}</p>
      </LegalSection>

      <LegalSection title={t("contact.title")}>
        <p>{t("contact.body", { email: CONTACT_EMAIL })}</p>
      </LegalSection>
    </LegalPage>
  );
}

function PrivacySkeleton() {
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="mt-6 h-40 w-full" />
    </main>
  );
}

export default function PrivacyPage() {
  return (
    <Suspense fallback={<PrivacySkeleton />}>
      <Privacy />
    </Suspense>
  );
}
