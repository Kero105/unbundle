import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { LegalPage, LegalSection, legalLinkClass } from "@/components/legal-page";
import { Skeleton } from "@/components/ui/skeleton";

const CONTACT_EMAIL = "rohankelkar2020@gmail.com";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Terms");
  return { title: t("metaTitle") };
}

async function Terms() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Terms")]);

  return (
    <LegalPage
      locale={locale}
      home={t("home")}
      title={t("title")}
      updatedLabel={t("updatedLabel")}
      updated={t("updated")}
      summaryTitle={t("summary.title")}
      summary={(["educational", "mistakes", "uploads"] as const).map((k) => t(`summary.${k}`))}
    >
      <p>{t("intro")}</p>

      <LegalSection title={t("educational.title")}>
        <p>{t("educational.body")}</p>
      </LegalSection>

      <LegalSection title={t("guarantees.title")}>
        <p>{t("guarantees.body")}</p>
      </LegalSection>

      <LegalSection title={t("uploads.title")}>
        <p>{t("uploads.body")}</p>
      </LegalSection>

      <LegalSection title={t("privacy.title")}>
        <p>
          {t.rich("privacy.body", {
            link: (chunks) => (
              <Link href="/privacy" className={legalLinkClass}>
                {chunks}
              </Link>
            ),
          })}
        </p>
      </LegalSection>

      <LegalSection title={t("contact.title")}>
        <p>{t("contact.body", { email: CONTACT_EMAIL })}</p>
      </LegalSection>
    </LegalPage>
  );
}

function TermsSkeleton() {
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="mt-6 h-40 w-full" />
    </main>
  );
}

export default function TermsPage() {
  return (
    <Suspense fallback={<TermsSkeleton />}>
      <Terms />
    </Suspense>
  );
}
