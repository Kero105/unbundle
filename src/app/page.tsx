import { Suspense } from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  Ban,
  CalendarX,
  CircleHelp,
  Copy,
  Layers,
  Calculator,
  Gauge,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { SignInButton } from "@/components/sign-in-button";
import { Skeleton } from "@/components/ui/skeleton";
import { PendingLink } from "@/components/pending-link";
import { buttonVariants } from "@/components/ui/button";

const CHECKS = [
  { key: "duplicates", Icon: Copy },
  { key: "math", Icon: Calculator },
  { key: "dates", Icon: CalendarX },
  { key: "unbundling", Icon: Layers },
  { key: "quantity", Icon: Gauge },
  { key: "outliers", Icon: TrendingUp },
  { key: "vague", Icon: CircleHelp },
  { key: "denied", Icon: Ban },
] as const satisfies readonly { key: string; Icon: LucideIcon }[];

const STEPS = ["upload", "review", "letter"] as const;

async function Landing() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Home")]);

  return (
    <main lang={locale} className="flex flex-col">
      <section className="border-b">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <h1 className="max-w-3xl text-4xl leading-[1.1] font-semibold text-balance sm:text-5xl lg:text-6xl">
            {t("title")}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-9">
            {t("subtitle")}
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <SignInButton>{t("signIn")}</SignInButton>
            <PendingLink
              href="/demo"
              className={buttonVariants({ variant: "outline", size: "lg" })}
              pendingLabel={t("trySamplePending")}
            >
              {t("trySample")}
            </PendingLink>
          </div>
        </div>
      </section>

      <section aria-labelledby="how-title" className="border-b">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <h2 id="how-title" className="text-3xl font-semibold">
            {t("how.title")}
          </h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li
                key={step}
                className="flex gap-4 rounded-lg border bg-card p-6"
              >
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary font-heading text-xl font-semibold text-secondary-foreground"
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-xl font-semibold">{t(`how.${step}.title`)}</h3>
                  <p className="mt-2 text-muted-foreground">{t(`how.${step}.body`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="checks-title" className="border-b">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <h2 id="checks-title" className="text-3xl font-semibold">
            {t("checks.title")}
          </h2>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            {t("checks.intro")}
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CHECKS.map(({ key, Icon }) => (
              <li key={key} className="rounded-lg border bg-card p-6">
                <Icon aria-hidden="true" className="size-6 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">{t(`checks.${key}.title`)}</h3>
                <p className="mt-2 text-[0.9375rem] text-muted-foreground">
                  {t(`checks.${key}.body`)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="trust-title" className="bg-primary text-primary-foreground">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[3fr_2fr]">
          <div>
            <h2 id="trust-title" className="text-3xl leading-tight font-semibold text-balance sm:text-4xl">
              {t("trust.title")}
            </h2>
            <p className="mt-4 text-xl font-medium">{t("trust.subtitle")}</p>
            <p className="mt-4 max-w-xl text-lg opacity-90">{t("trust.body")}</p>
            <p className="mt-6 text-lg">
              <Link href="/about" className="font-medium underline underline-offset-4 hover:no-underline">
                {t("trust.aboutLink")}
              </Link>
            </p>
          </div>
          <div className="rounded-lg border border-primary-foreground/30 p-6">
            <h3 className="text-xl font-semibold">{t("trust.privacyTitle")}</h3>
            <ul className="mt-4 flex flex-col gap-3 text-lg">
              <li>{t("trust.privacy.training")}</li>
              <li>{t("trust.privacy.delete")}</li>
              <li>{t("trust.privacy.sell")}</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}

function LandingSkeleton() {
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <Skeleton className="h-14 w-full max-w-3xl" />
      <Skeleton className="mt-6 h-8 w-full max-w-2xl" />
      <div className="mt-10 flex gap-3">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-12 w-48" />
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LandingSkeleton />}>
      <Landing />
    </Suspense>
  );
}
