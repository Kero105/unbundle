import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { BackLink } from "@/components/back-link";
import { Skeleton } from "@/components/ui/skeleton";
import { GLOSSARY_TERM_KEYS } from "@/lib/content/glossary-terms";
import { routeMetadata } from "@/lib/metadata";

export const generateMetadata = () => routeMetadata("glossary");

async function Glossary() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Glossary")]);
  const terms = GLOSSARY_TERM_KEYS.map((key) => ({
    key,
    term: t(`terms.${key}.term`),
    definition: t(`terms.${key}.definition`),
  })).sort((a, b) => a.term.localeCompare(b.term, locale));

  return (
    <main
      lang={locale}
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14"
    >
      <BackLink />
      <header className="flex flex-col gap-3">
        <h1 className="text-4xl leading-[1.1] font-semibold text-balance sm:text-5xl">{t("title")}</h1>
        <p className="text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-9">{t("subtitle")}</p>
      </header>

      <dl aria-label={t("termsLabel")} className="flex flex-col gap-4">
        {terms.map(({ key, term, definition }) => (
          <div key={key} id={key} className="rounded-lg border bg-card p-4">
            <dt className="text-xl font-semibold">{term}</dt>
            <dd className="mt-1 text-lg leading-8">{definition}</dd>
          </div>
        ))}
      </dl>

      <p className="text-[0.9375rem] text-muted-foreground">{t("attribution")}</p>
    </main>
  );
}

function GlossarySkeleton() {
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <Skeleton className="h-12 w-1/2" />
      <Skeleton className="mt-6 h-24 w-full" />
      <Skeleton className="mt-4 h-24 w-full" />
    </main>
  );
}

export default function GlossaryPage() {
  return (
    <Suspense fallback={<GlossarySkeleton />}>
      <Glossary />
    </Suspense>
  );
}
