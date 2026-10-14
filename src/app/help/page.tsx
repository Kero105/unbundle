import { Suspense } from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import accuracy from "@/lib/accuracy/accuracy.json";
import { BackLink } from "@/components/back-link";
import { CallScript } from "@/components/call-script";
import { Reminders } from "@/components/reminders";
import { Skeleton } from "@/components/ui/skeleton";
import { routeMetadata } from "@/lib/metadata";

export const generateMetadata = () => routeMetadata("help");

const FAQS = [
  "legal",
  "bills",
  "accuracy",
  "privacy",
  "cost",
  "eob",
  "unbundling",
  "uninsured",
] as const;

const LINKS: Partial<Record<(typeof FAQS)[number], { href: string; key: "about" | "privacy" }>> = {
  accuracy: { href: "/about", key: "about" },
  privacy: { href: "/privacy", key: "privacy" },
};

async function Help() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Help")]);

  return (
    <main
      lang={locale}
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6 sm:py-16"
    >
      <BackLink />
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold text-balance sm:text-4xl">{t("title")}</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">{t("subtitle")}</p>
      </header>

      <ul aria-label={t("listLabel")} className="flex flex-col gap-3">
        {FAQS.map((id) => {
          const link = LINKS[id];
          return (
            <li key={id}>
              <details className="group rounded-lg border bg-card px-4 py-1">
                <summary className="flex min-h-12 cursor-pointer items-center py-2 text-lg font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring">
                  {t(`faqs.${id}.q`)}
                </summary>
                <div className="flex flex-col gap-3 pb-4 text-lg leading-8">
                  <p>
                    {t(`faqs.${id}.a`, {
                      fixtures: accuracy.fixtureCount,
                      traps: accuracy.trapFixtureCount,
                    })}
                  </p>
                  {link ? (
                    <p>
                      <Link
                        href={link.href}
                        className="font-medium text-primary underline underline-offset-4 hover:no-underline"
                      >
                        {t(`links.${link.key}`)}
                      </Link>
                    </p>
                  ) : null}
                </div>
              </details>
            </li>
          );
        })}
      </ul>

      <p className="text-lg">
        <Link
          href="/faq"
          className="font-medium text-primary underline underline-offset-4 hover:no-underline"
        >
          {t("faqLink")}
        </Link>
      </p>

      <CallScript items={[]} generic />
      <Reminders mode="followUp" />
    </main>
  );
}

function HelpSkeleton() {
  return (
    <main aria-busy="true" className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-7 w-full max-w-xl" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
    </main>
  );
}

export default function HelpPage() {
  return (
    <Suspense fallback={<HelpSkeleton />}>
      <Help />
    </Suspense>
  );
}
