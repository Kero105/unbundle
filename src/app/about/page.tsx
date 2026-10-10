import { Suspense } from "react";
import Link from "next/link";
import { routeMetadata } from "@/lib/metadata";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowDown, ArrowRight } from "lucide-react";
import accuracy from "@/lib/accuracy/accuracy.json";
import { Skeleton } from "@/components/ui/skeleton";
import { AccuracyTable, type AccuracyLabels } from "./accuracy-table";

const linkClass = "font-medium text-primary underline underline-offset-4 hover:no-underline";

const STORY = ["line1", "line2", "line3"] as const;
const STEPS = ["upload", "read", "check", "letter"] as const;
const RULES = ["ncci", "mue", "mpfs"] as const;
// Same keys as the landing page's "What we check" cards.
const CHECKS = [
  "duplicates",
  "math",
  "dates",
  "unbundling",
  "quantity",
  "outliers",
  "vague",
  "denied",
] as const;
const SCOPE = ["ncci", "prices", "la", "findings", "advice"] as const;
const SOURCES = [
  {
    key: "ncciPtp",
    href: "https://www.cms.gov/medicare/coding-billing/national-correct-coding-initiative-ncci-edits/medicare-ncci-procedure-procedure-ptp-edits",
  },
  {
    key: "ncciMue",
    href: "https://www.cms.gov/medicare/coding-billing/national-correct-coding-initiative-ncci-edits/medicare-ncci-medically-unlikely-edits",
  },
  { key: "mpfs", href: "https://www.cms.gov/medicare/payment/fee-schedules/physician" },
  {
    key: "poverty",
    href: "https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines",
  },
  {
    key: "hcai",
    href: "https://hcai.ca.gov/affordability/hospital-fair-billing-program/",
  },
] as const;
const PRIVACY_SUMMARY = ["files", "browser", "anthropic", "delete", "sell"] as const;

export const generateMetadata = () => routeMetadata("about");

function SectionTitle({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="text-2xl font-semibold text-balance sm:text-3xl">
      {children}
    </h2>
  );
}

async function About() {
  const [locale, t, home, privacy] = await Promise.all([
    getLocale(),
    getTranslations("About"),
    getTranslations("Home"),
    getTranslations("Privacy"),
  ]);

  const labels: AccuracyLabels = {
    caption: t("accuracy.tableLabel"),
    rule: t("accuracy.columns.rule"),
    overall: t("accuracy.overall"),
    na: t("accuracy.na"),
    columns: {
      tp: { short: t("accuracy.columns.tp"), full: t("accuracy.columns.tpFull") },
      fp: { short: t("accuracy.columns.fp"), full: t("accuracy.columns.fpFull") },
      fn: { short: t("accuracy.columns.fn"), full: t("accuracy.columns.fnFull") },
      precision: {
        short: t("accuracy.columns.precision"),
        full: t("accuracy.columns.precision"),
      },
      recall: { short: t("accuracy.columns.recall"), full: t("accuracy.columns.recall") },
    },
    ruleNames: Object.fromEntries(
      accuracy.rules.map((r) => [r.ruleId, t(`accuracy.rules.${r.ruleId}` as "accuracy.rules.math_error")]),
    ),
  };

  return (
    <main
      lang={locale}
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-14 px-4 py-12 sm:px-6 sm:py-16"
    >
      <header>
        <h1 className="text-4xl leading-[1.1] font-semibold text-balance sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-9">
          {t("subtitle")}
        </p>
      </header>

      <section aria-labelledby="what-title" className="flex flex-col gap-4">
        <SectionTitle id="what-title">{t("what.title")}</SectionTitle>
        <ol className="flex flex-col gap-3">
          {STORY.map((line, index) => (
            <li key={line} className="flex gap-4 rounded-lg border bg-card p-4 sm:p-5">
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary font-heading text-xl font-semibold text-secondary-foreground"
              >
                {index + 1}
              </span>
              <p className="self-center text-lg">{t(`what.${line}`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="how-title" className="flex flex-col gap-5">
        <SectionTitle id="how-title">{t("how.title")}</SectionTitle>
        <p className="text-lg leading-8">{t("how.intro")}</p>
        <ul className="list-disc space-y-2 pl-6 text-lg leading-8">
          {RULES.map((r) => (
            <li key={r}>{t(`how.${r}`)}</li>
          ))}
        </ul>
        <p className="text-lg leading-8">{t("how.explain")}</p>

        <ol
          aria-label={t("how.diagramLabel")}
          className="mt-2 flex flex-col items-stretch gap-2 md:flex-row"
        >
          {STEPS.flatMap((step, index) => {
            const item = (
              <li
                key={step}
                className="flex flex-1 flex-col gap-2 rounded-lg border bg-card p-4"
              >
                <span
                  aria-hidden="true"
                  className="flex size-8 items-center justify-center rounded-full bg-secondary font-heading text-lg font-semibold text-secondary-foreground"
                >
                  {index + 1}
                </span>
                <h3 className="text-lg font-semibold">{t(`how.steps.${step}.title`)}</h3>
                <p className="text-[0.9375rem] text-muted-foreground">
                  {t(`how.steps.${step}.body`)}
                </p>
              </li>
            );
            if (index === STEPS.length - 1) return [item];
            return [
              item,
              <li
                key={`${step}-arrow`}
                aria-hidden="true"
                className="flex items-center justify-center text-muted-foreground"
              >
                <ArrowDown className="size-5 md:hidden" />
                <ArrowRight className="hidden size-5 md:block" />
              </li>,
            ];
          })}
        </ol>
      </section>

      <section aria-labelledby="checks-title" className="flex flex-col gap-4">
        <SectionTitle id="checks-title">{t("checks.title")}</SectionTitle>
        <p className="text-lg leading-8">{t("checks.intro")}</p>
        <ol className="grid gap-3 sm:grid-cols-2">
          {CHECKS.map((key) => (
            <li key={key} className="rounded-lg border bg-card p-4">
              <h3 className="text-lg font-semibold">{home(`checks.${key}.title`)}</h3>
              <p className="mt-1 text-[0.9375rem] text-muted-foreground">
                {home(`checks.${key}.body`)}
              </p>
            </li>
          ))}
          <li className="rounded-lg border bg-card p-4">
            <h3 className="text-lg font-semibold">{t("checks.gfe.title")}</h3>
            <p className="mt-1 text-[0.9375rem] text-muted-foreground">{t("checks.gfe.body")}</p>
          </li>
        </ol>
      </section>

      <section aria-labelledby="accuracy-title" className="flex flex-col gap-4">
        <SectionTitle id="accuracy-title">{t("accuracy.title")}</SectionTitle>
        <p className="text-lg leading-8">{t("accuracy.intro")}</p>
        <AccuracyTable data={accuracy} labels={labels} locale={locale} />
        <p className="rounded-lg border-l-4 border-primary bg-card p-4 text-lg leading-8 font-medium">
          {t("accuracy.caveat", {
            fixtures: accuracy.fixtureCount,
            traps: accuracy.trapFixtureCount,
          })}
        </p>
        <p className="text-[0.9375rem] text-muted-foreground">{t("accuracy.gfeNote")}</p>
        <details className="rounded-lg border bg-card p-4">
          <summary className="cursor-pointer font-medium">{t("accuracy.legend.title")}</summary>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-[0.9375rem]">
            {(["tp", "fp", "fn", "precision", "recall"] as const).map((k) => (
              <li key={k}>{t(`accuracy.legend.${k}`)}</li>
            ))}
          </ul>
        </details>
      </section>

      <section aria-labelledby="scope-title" className="flex flex-col gap-4">
        <SectionTitle id="scope-title">{t("scope.title")}</SectionTitle>
        <ul className="list-disc space-y-2 pl-6 text-lg leading-8">
          {SCOPE.map((k) => (
            <li key={k}>{t(`scope.${k}`)}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="sources-title" className="flex flex-col gap-4">
        <SectionTitle id="sources-title">{t("sources.title")}</SectionTitle>
        <p className="text-lg leading-8">{t("sources.intro")}</p>
        <ul className="list-disc space-y-2 pl-6 text-lg leading-8">
          {SOURCES.map(({ key, href }) => (
            <li key={key}>
              <a href={href} className={linkClass} target="_blank" rel="noopener noreferrer">
                {t(`sources.${key}`)}
              </a>
            </li>
          ))}
        </ul>
        <p className="text-lg leading-8">{t("sources.releases")}</p>
      </section>

      <section aria-labelledby="privacy-title" className="flex flex-col gap-4">
        <SectionTitle id="privacy-title">{t("privacy.title")}</SectionTitle>
        <ul className="list-disc space-y-2 pl-6 text-lg leading-8">
          {PRIVACY_SUMMARY.map((k) => (
            <li key={k}>{privacy(`summary.${k}`)}</li>
          ))}
        </ul>
        <p className="text-lg">
          <Link href="/privacy" className={linkClass}>
            {t("privacy.link")}
          </Link>
        </p>
      </section>

      <section aria-labelledby="built-title" className="flex flex-col gap-4">
        <SectionTitle id="built-title">{t("built.title")}</SectionTitle>
        <p className="text-lg leading-8">{t("built.body")}</p>
      </section>
    </main>
  );
}

function AboutSkeleton() {
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="mt-4 h-8 w-full" />
      <Skeleton className="mt-10 h-48 w-full" />
    </main>
  );
}

export default function AboutPage() {
  return (
    <Suspense fallback={<AboutSkeleton />}>
      <About />
    </Suspense>
  );
}
