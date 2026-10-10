import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import type { VariantProps } from "class-variance-authority";
import { CircleCheck, CircleHelp, Info, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import { BillSteps } from "@/components/bill-steps";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { PendingLink } from "@/components/pending-link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getBillFindings } from "@/lib/bills/findings";
import { formatCents } from "@/lib/money";
import type { Confidence, Severity } from "@/lib/types";
import { buildReport, whyKey, type ReportFinding } from "./report-model";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const SEVERITY_BADGE: Record<Severity, { variant: BadgeVariant; Icon: LucideIcon }> = {
  error: { variant: "destructive", Icon: OctagonAlert },
  warning: { variant: "warning", Icon: TriangleAlert },
  info: { variant: "secondary", Icon: Info },
};

const CONFIDENCE_BADGE: Record<Confidence, { variant: BadgeVariant; Icon: LucideIcon }> = {
  high: { variant: "success", Icon: CircleCheck },
  medium: { variant: "warning", Icon: CircleHelp },
  low: { variant: "outline", Icon: CircleHelp },
};

async function FindingCard({ item }: { item: ReportFinding }) {
  const t = await getTranslations("Report");
  const { finding, lineItems } = item;
  const severity = SEVERITY_BADGE[finding.severity];
  const confidence = CONFIDENCE_BADGE[finding.confidence];

  return (
    <li>
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CardTitle className="text-xl">
              <h3>{t(`rules.${finding.ruleId}`)}</h3>
            </CardTitle>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{t("finding.atStake")}</p>
              <p className="text-2xl font-semibold tabular-nums">
                {formatCents(finding.amountAtStakeCents)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={severity.variant}>
              <severity.Icon aria-hidden="true" />
              {t("finding.severity", { level: finding.severity })}
            </Badge>
            <Badge variant={confidence.variant}>
              <confidence.Icon aria-hidden="true" />
              {t("finding.confidence", { level: finding.confidence })}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {finding.confidence !== "high" ? (
            <p className="flex items-center gap-2 font-medium text-warning-foreground">
              <TriangleAlert aria-hidden="true" className="size-5 shrink-0" />
              {t("finding.checkWithOffice")}
            </p>
          ) : null}

          <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">
              {t("finding.affectedItems")}
            </h4>
            <ul aria-label={t("finding.itemsLabel")} className="divide-y rounded-lg border">
              {lineItems.map((li) => (
                <li
                  key={li.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 py-2"
                >
                  <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3">
                    <span className="sr-only">{t("finding.columns.code")}: </span>
                    <span className="font-mono text-sm">{li.code ?? t("finding.noCode")}</span>
                    <span className="sr-only">{t("finding.columns.description")}: </span>
                    <span>{li.descriptionRaw}</span>
                  </span>
                  <span className="tabular-nums">
                    <span className="sr-only">{t("finding.columns.charge")}: </span>
                    {formatCents(li.chargeCents)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <details className="group rounded-lg border px-3 py-2">
            <summary className="cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring">
              {t("finding.whySummary")}
            </summary>
            <p className="mt-2 text-muted-foreground">{t(`why.${whyKey(finding.citation)}`)}</p>
          </details>
        </CardContent>
      </Card>
    </li>
  );
}

async function Report({ params }: Pick<PageProps<"/bills/[id]/report">, "params">) {
  // Findings depend on live reference data, so never prerender them.
  await connection();
  const { id } = await params;
  const result = await getBillFindings(id);
  if (!result) notFound();
  const { bill, findings } = result;
  const report = buildReport(bill, findings);

  const [locale, t] = await Promise.all([getLocale(), getTranslations("Report")]);

  return (
    <main
      lang={locale}
      className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10"
    >
      <header className="flex flex-col gap-4">
        <BillSteps current="findings" />
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold sm:text-4xl">{t("title")}</h1>
          <p className="max-w-2xl text-lg text-muted-foreground">{t("subtitle")}</p>
        </div>
      </header>

      {report.findings.length === 0 ? (
        <section className="flex flex-col gap-3 rounded-xl border border-success-border/50 bg-success-surface p-6 text-success-foreground">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <CircleCheck aria-hidden="true" className="size-6 shrink-0" />
            {t("empty.title")}
          </h2>
          <p>{t("empty.body")}</p>
        </section>
      ) : (
        <>
          <section className="flex flex-col gap-2 rounded-xl border bg-card p-6">
            <p className="text-sm font-medium text-muted-foreground">{t("totalLabel")}</p>
            <p className="text-4xl font-semibold tabular-nums">
              {formatCents(report.totalAtStakeCents)}
            </p>
            <p className="text-muted-foreground">
              {t("totalCount", { count: report.findings.length })}
            </p>
            <p className="mt-2 font-medium">{t("honest")}</p>
          </section>

          <section aria-label={t("listLabel")}>
            <ol className="flex flex-col gap-4">
              {report.findings.map((item) => (
                <FindingCard key={item.finding.id} item={item} />
              ))}
            </ol>
          </section>
        </>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/bills/${encodeURIComponent(id)}/review`}
          className={buttonVariants({ variant: "outline" })}
        >
          {t("backToReview")}
        </Link>
        {report.findings.length > 0 ? (
          <PendingLink
            href={`/bills/${encodeURIComponent(id)}/letter`}
            className={buttonVariants()}
            pendingLabel={t("makeLetterPending")}
          >
            {t("makeLetter")}
          </PendingLink>
        ) : null}
        <PendingLink
          href={`/bills/${encodeURIComponent(id)}/assistance`}
          className={buttonVariants({ variant: "outline" })}
          pendingLabel={t("assistancePending")}
        >
          {t("assistance")}
        </PendingLink>
      </div>
    </main>
  );
}

function ReportSkeleton() {
  return (
    <main
      aria-busy="true"
      className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10"
    >
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-full max-w-md" />
      <Skeleton className="h-36 w-full" />
      <Skeleton className="h-64 w-full" />
    </main>
  );
}

export default function ReportPage(props: PageProps<"/bills/[id]/report">) {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <Report params={props.params} />
    </Suspense>
  );
}
