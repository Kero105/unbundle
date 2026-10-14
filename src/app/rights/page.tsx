import { Suspense } from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { BackLink } from "@/components/back-link";
import { Reminders } from "@/components/reminders";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RIGHTS_SOURCES, RIGHTS_STEPS } from "@/lib/content/rights-sources";
import { routeMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";

export const generateMetadata = () => routeMetadata("rights");

const linkClass = "font-medium text-primary underline underline-offset-4 hover:no-underline";

async function Rights() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Rights")]);
  const guides = ["assistance", "gfe", "itemized"] as const;

  return (
    <main
      lang={locale}
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14"
    >
      <BackLink />
      <header className="flex flex-col gap-3">
        <h1 className="text-4xl leading-[1.1] font-semibold text-balance sm:text-5xl">{t("title")}</h1>
        <p className="text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-9">{t("subtitle")}</p>
        <p className="rounded-lg border-l-4 border-primary bg-card p-4 text-lg leading-8 font-medium">
          {t("notAdvice")}
        </p>
        <p>
          <Link
            href="/rights/check"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-auto min-h-11 py-2 text-left whitespace-normal",
            )}
          >
            {t("checkLink")}
          </Link>
        </p>
      </header>

      {guides.map((guide) => (
        <section
          key={guide}
          aria-labelledby={`${guide}-title`}
          className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:p-6"
        >
          <h2 id={`${guide}-title`} className="text-2xl font-semibold text-balance sm:text-3xl">
            {t(`guides.${guide}.title`)}
          </h2>
          <p className="text-lg leading-8">{t(`guides.${guide}.what`)}</p>
          {guide === "itemized" ? (
            <>
              <p className="text-lg leading-8">{t("guides.itemized.medicare")}</p>
              <p className="text-lg leading-8">{t("guides.itemized.other")}</p>
            </>
          ) : (
            <>
              <p className="text-lg leading-8">{t(`guides.${guide}.who`)}</p>
              <p className="text-lg leading-8 text-muted-foreground">{t(`guides.${guide}.gap`)}</p>
            </>
          )}

          <div>
            <h3 className="text-lg font-semibold">{t("stepsTitle")}</h3>
            <ol className="mt-2 list-decimal space-y-2 pl-6 text-lg leading-8">
              {RIGHTS_STEPS[guide].map((step) => (
                <li key={step}>
                  {guide === "itemized" && step === "letter" ? (
                    <Link href="/demo/letter?type=itemized" className={linkClass}>
                      {t("guides.itemized.steps.letter")}
                    </Link>
                  ) : (
                    t(`guides.${guide}.steps.${step}` as "guides.gfe.steps.compare")
                  )}
                  {guide === "assistance" && step === "estimate" ? (
                    <>
                      {" "}
                      <Link href="/rights/check" className={linkClass}>
                        {t("checkLink")}
                      </Link>
                    </>
                  ) : null}
                  {guide === "gfe" && step === "tool" ? (
                    <>
                      {" "}
                      <Link href="/rights/check" className={linkClass}>
                        {t("checkLink")}
                      </Link>
                    </>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>

          {guide === "gfe" ? <Reminders mode="gfe" /> : null}

          <div>
            <h3 className="text-lg font-semibold">{t("sourcesTitle")}</h3>
            <ul className="mt-2 list-disc space-y-2 pl-6 text-lg leading-8">
              {RIGHTS_SOURCES[guide].map(({ key, href }) => (
                <li key={key}>
                  <a href={href} className={linkClass} target="_blank" rel="noopener noreferrer">
                    {t(`guides.${guide}.sources.${key}` as "guides.gfe.sources.cmsDispute")}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[0.9375rem] text-muted-foreground">
              {t("checkedLabel")}: {t(`guides.${guide}.checked`)}
            </p>
          </div>
        </section>
      ))}
    </main>
  );
}

function RightsSkeleton() {
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="mt-4 h-8 w-full" />
      <Skeleton className="mt-10 h-64 w-full" />
    </main>
  );
}

export default function RightsPage() {
  return (
    <Suspense fallback={<RightsSkeleton />}>
      <Rights />
    </Suspense>
  );
}
