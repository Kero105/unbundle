import { Suspense } from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { BackLink } from "@/components/back-link";
import { PrivacyAnswer } from "@/components/privacy-answer";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FAQ_CHECKED,
  FAQ_GROUPS,
  FAQ_RELATED,
  FAQ_SOURCES,
} from "@/lib/content/faq";
import { routeMetadata } from "@/lib/metadata";

export const generateMetadata = () => routeMetadata("faq");

const linkClass = "font-medium text-primary underline underline-offset-4 hover:no-underline";

async function Faq() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("FAQ")]);
  // A fixed ISO date formatted in UTC: nothing here reads the clock.
  const checked = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${FAQ_CHECKED}T00:00:00Z`),
  );

  return (
    <main
      lang={locale}
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14"
    >
      <BackLink />
      <header className="flex flex-col gap-3">
        <h1 className="text-4xl leading-[1.1] font-semibold text-balance sm:text-5xl">{t("title")}</h1>
        <p className="text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-9">{t("subtitle")}</p>
      </header>

      {FAQ_GROUPS.map((group) => (
        <section key={group.id} aria-labelledby={`${group.id}-title`} className="flex flex-col gap-3">
          <h2 id={`${group.id}-title`} className="text-2xl font-semibold text-balance sm:text-3xl">
            {t(`groups.${group.id}`)}
          </h2>
          <ul className="flex flex-col gap-3">
            {group.items.map((item) => (
              <li key={item.id}>
                <details id={item.id} className="group rounded-lg border bg-card px-4 py-1">
                  <summary className="flex min-h-12 cursor-pointer items-center py-2 text-lg font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring">
                    {t(`items.${item.id}.q` as "items.itemized.q")}
                  </summary>
                  <div className="flex flex-col gap-3 pb-4 text-lg leading-8">
                    {item.fromPrivacyPage
                      ? <PrivacyAnswer />
                      : Array.from({ length: item.paragraphs }, (_, i) => (
                          <p key={i}>
                            {t(`items.${item.id}.p${i + 1}` as "items.itemized.p1")}
                          </p>
                        ))}

                    <div className="flex flex-col gap-1 border-t pt-3 text-base">
                      <p className="font-medium">{t("sourcesLabel")}</p>
                      <ul className="list-disc space-y-1 pl-6">
                        {item.sources.map((key) => {
                          const source = FAQ_SOURCES[key];
                          const label = t(`sources.${key}`);
                          return (
                            <li key={key}>
                              {"internal" in source ? (
                                <Link href={source.href} className={linkClass}>
                                  {label}
                                </Link>
                              ) : (
                                <a
                                  href={source.href}
                                  className={linkClass}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {label}
                                </a>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                      {item.related?.length ? (
                        <p className="mt-1">
                          {t("relatedLabel")}:{" "}
                          {item.related.map((key) => (
                            <Link key={key} href={FAQ_RELATED[key].href} className={linkClass}>
                              {t(`related.${key}`)}
                            </Link>
                          ))}
                        </p>
                      ) : null}
                      <p className="text-sm text-muted-foreground">
                        {t("checkedLabel")}: {checked} · {t("notAdvice")}
                      </p>
                    </div>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}

function FaqSkeleton() {
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="mt-6 h-14 w-full" />
      <Skeleton className="mt-3 h-14 w-full" />
    </main>
  );
}

export default function FaqPage() {
  return (
    <Suspense fallback={<FaqSkeleton />}>
      <Faq />
    </Suspense>
  );
}
