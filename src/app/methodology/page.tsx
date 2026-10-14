import { Suspense } from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { BackLink } from "@/components/back-link";
import { Skeleton } from "@/components/ui/skeleton";
import { routeMetadata } from "@/lib/metadata";
import { RULE_IDS } from "@/lib/content/rule-ids";

export const generateMetadata = () => routeMetadata("methodology");

const linkClass = "font-medium text-primary underline underline-offset-4 hover:no-underline";

const DATA = ["ncciPtp", "ncciMue", "mpfs", "locality", "conversion", "setting"] as const;
const LIMITS = ["scope", "test", "advice"] as const;

async function Methodology() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Methodology")]);

  return (
    <main
      lang={locale}
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14"
    >
      <BackLink />
      <header className="flex flex-col gap-3">
        <h1 className="text-4xl leading-[1.1] font-semibold text-balance sm:text-5xl">{t("title")}</h1>
        <p className="text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-9">{t("subtitle")}</p>
        <p className="text-lg leading-8">{t("intro")}</p>
      </header>

      <section aria-labelledby="rules-title" className="flex flex-col gap-4">
        <h2 id="rules-title" className="text-2xl font-semibold sm:text-3xl">
          {t("rulesTitle")}
        </h2>
        <ol className="flex flex-col gap-4">
          {RULE_IDS.map((id, index) => (
            <li key={id} className="rounded-xl border bg-card p-5">
              <h3 className="text-xl font-semibold">
                {index + 1}. {t(`rules.${id}.name`)}
              </h3>
              <dl className="mt-3 flex flex-col gap-3">
                {(
                  [
                    ["whatLabel", "what"],
                    ["skipsLabel", "skips"],
                    ["confidenceLabel", "confidence"],
                    ["exampleLabel", "example"],
                  ] as const
                ).map(([label, field]) => (
                  <div key={field}>
                    <dt className="text-sm font-semibold text-muted-foreground">{t(label)}</dt>
                    <dd className="text-lg leading-8">{t(`rules.${id}.${field}`)}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="data-title" className="flex flex-col gap-3">
        <h2 id="data-title" className="text-2xl font-semibold sm:text-3xl">
          {t("dataTitle")}
        </h2>
        <p className="text-lg leading-8">{t("dataIntro")}</p>
        <ul className="list-disc space-y-2 pl-6 text-lg leading-8">
          {DATA.map((k) => (
            <li key={k}>{t(`data.${k}`)}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="limits-title" className="flex flex-col gap-3">
        <h2 id="limits-title" className="text-2xl font-semibold sm:text-3xl">
          {t("limitsTitle")}
        </h2>
        <ul className="list-disc space-y-2 pl-6 text-lg leading-8">
          {LIMITS.map((k) => (
            <li key={k}>{t(`limits.${k}`)}</li>
          ))}
        </ul>
      </section>

      <nav aria-label={t("title")}>
        <ul className="flex flex-col gap-2 text-lg">
          <li>
            <Link href="/about" className={linkClass}>
              {t("links.about")}
            </Link>
          </li>
          <li>
            <Link href="/glossary" className={linkClass}>
              {t("links.glossary")}
            </Link>
          </li>
          <li>
            <Link href="/rights" className={linkClass}>
              {t("links.rights")}
            </Link>
          </li>
        </ul>
      </nav>
    </main>
  );
}

function MethodologySkeleton() {
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="mt-4 h-8 w-full" />
      <Skeleton className="mt-10 h-64 w-full" />
    </main>
  );
}

export default function MethodologyPage() {
  return (
    <Suspense fallback={<MethodologySkeleton />}>
      <Methodology />
    </Suspense>
  );
}
