import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { PendingLink } from "@/components/pending-link";
import { Skeleton } from "@/components/ui/skeleton";
import { routeMetadata } from "@/lib/metadata";

const STORY = ["bill", "check", "letter"] as const;

async function DemoIntro() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Demo.intro")]);

  return (
    <main
      lang={locale}
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-16"
    >
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold text-balance sm:text-4xl">{t("title")}</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">{t("subtitle")}</p>
      </header>

      <ol className="flex flex-col gap-4">
        {STORY.map((step, index) => (
          <li key={step} className="flex gap-4 rounded-lg border bg-card p-6">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary font-heading text-xl font-semibold text-secondary-foreground"
            >
              {index + 1}
            </span>
            <p className="text-lg">{t(`story.${step}`)}</p>
          </li>
        ))}
      </ol>

      <div>
        <PendingLink
          href="/demo/review"
          className={buttonVariants({ size: "lg" })}
          pendingLabel={t("startPending")}
        >
          {t("start")}
        </PendingLink>
      </div>
    </main>
  );
}

function DemoIntroSkeleton() {
  return (
    <main
      aria-busy="true"
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 sm:py-16"
    >
      <Skeleton className="h-10 w-full max-w-md" />
      <Skeleton className="h-8 w-full max-w-xl" />
      <Skeleton className="h-48 w-full" />
    </main>
  );
}

export const generateMetadata = () => routeMetadata("demo");

export default function DemoPage() {
  return (
    <Suspense fallback={<DemoIntroSkeleton />}>
      <DemoIntro />
    </Suspense>
  );
}
