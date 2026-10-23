import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import type { VariantProps } from "class-variance-authority";
import { ChevronDown, CircleCheck, CircleHelp, Info, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import { BillSteps } from "@/components/bill-steps";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { PendingLink } from "@/components/pending-link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { loadFindings, stepHref, type BillSource } from "@/lib/bills/source";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Confidence, Severity } from "@/lib/types";
import { PrintButton } from "@/components/print-button";
import { EobReconciliation } from "./eob-reconciliation-view";
import { ManualEntryNote } from "./manual-note";
import { CallScript } from "@/components/call-script";
import { Reminders } from "@/components/reminders";
import { buildLetterModel } from "../letter/letter-model";
import { Timeline } from "./timeline";
import { buildReport, whyKey, type ReportFinding } from "./report-model";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const SEVERITY_BADGE: Record<Severity, { variant: BadgeVariant; Icon: LucideIcon; edge: string }> = {
  error: { variant: "destructive", Icon: OctagonAlert, edge: "border-l-destructive" },
  warning: { variant: "warning", Icon: TriangleAlert, edge: "border-l-warning" },
  info: { variant: "secondary", Icon: Info, edge: "border-l-primary" },
};

const CONFIDENCE_BADGE: Record<Confidence, { variant: BadgeVariant; Icon: LucideIcon }> = {
  high: { variant: "success", Icon: CircleCheck },
  medium: { variant: "warning", Icon: CircleHelp },
  low: { variant: "outline", Icon: CircleHelp },
};

async function FindingCard({ item, first = false }: { item: ReportFinding; first?: boolean }) {
  const t = await getTranslations("Report");
  const { finding, lineItems } = item;
  const severity = SEVERITY_BADGE[finding.severity];
  const confidence = CONFIDENCE_BADGE[finding.confidence];

  return (
    // The demo walk-through points at the first card.
    <li data-walkthrough={first ? "finding" : undefined} tabIndex={first ? -1 : undefined}>
      <Card className={`break-inside-avoid border-l-4 ${severity.edge}`}>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CardTitle className="text-lead">
              <h3>{t(`rules.${finding.ruleId}`)}</h3>
            </CardTitle>
            <div className="sm:text-right">
              <p className="text-sm text-muted-foreground">{t("finding.atStake")}</p>
              <p className="font-heading text-3xl font-normal tracking-tight tabular-nums">
                {formatCents(finding.amountAtStakeCents)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <Badge variant={severity.variant} className="max-sm:gap-1 max-sm:px-2 max-sm:text-xs">
              <severity.Icon aria-hidden="true" />
              {t("finding.severity", { level: finding.severity })}
            </Badge>
            <Badge variant={confidence.variant} className="max-sm:gap-1 max-sm:px-2 max-sm:text-xs">
              <confidence.Icon aria-hidden="true" />
              {t("finding.confidence", { level: finding.confidence })}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">
              {t("finding.affectedItems")}
            </h4>
            <ul aria-label={t("finding.itemsLabel")} className="divide-y border-y">
              {lineItems.map((li) => (
                <li
                  key={li.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2"
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

          <details className="group">
            <summary className="inline-flex min-h-11 cursor-pointer items-center font-medium text-primary underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring">
              {t("finding.whySummary")}
              <ChevronDown
                aria-hidden="true"
                className="ml-1 size-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <p className="mt-1 text-muted-foreground">{t(`why.${whyKey(finding.citation)}`)}</p>
          </details>
        </CardContent>
      </Card>
    </li>
  );
}

export async function ReportView({ source }: { source: BillSource }) {
  // Findings depend on live reference data, so never prerender them.
  await connection();
  const result = await loadFindings(source);
  if (!result) notFound();
  const { bill, findings } = result;
  const report = buildReport(bill, findings);

  const [locale, t] = await Promise.all([getLocale(), getTranslations("Report")]);

  return (
    <main
      lang={locale}
      className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10"
    >
      <header className="flex flex-col gap-4">
        <div className="print:hidden">
          <BillSteps current="findings" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-title font-semibold">{t("title")}</h1>
          <p className="max-w-2xl text-muted-foreground">{t("subtitle")}</p>
        </div>
        <ManualEntryNote source={source} />
      </header>

      {report.findings.length === 0 ? (
        <section className="flex flex-col gap-3 rounded-surface border border-success-border/50 bg-success-surface p-6 text-success-foreground">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <CircleCheck aria-hidden="true" className="size-6 shrink-0" />
            {t("empty.title")}
          </h2>
          <p>{t("empty.body")}</p>
        </section>
      ) : (
        <>
          <section className="flex flex-col gap-5 rounded-surface bg-brand p-6 text-brand-foreground shadow-lg shadow-brand/20 sm:flex-row sm:items-end sm:justify-between sm:p-8 print:border print:bg-card print:text-foreground print:shadow-none">
            <div className="flex flex-col gap-1">
              <p className="text-meta font-medium opacity-90">{t("totalLabel")}</p>
              <p className="font-heading text-6xl font-light tracking-tight tabular-nums sm:text-7xl">
                {formatCents(report.totalAtStakeCents)}
              </p>
              <p className="opacity-90">{t("totalCount", { count: report.findings.length })}</p>
              <p className="mt-3 max-w-md font-medium">{t("honest")}</p>
            </div>
            <PendingLink
              href={stepHref(source, "letter")}
              className={cn(
                buttonVariants({ size: "lg" }),
                "shrink-0 bg-brand-foreground text-brand hover:bg-brand-foreground/90 active:bg-brand-foreground/80 print:hidden",
              )}
              pendingLabel={t("makeLetterPending")}
            >
              {t("makeLetter")}
            </PendingLink>
          </section>

          <section aria-labelledby="findings-title">
            <h2 id="findings-title" className="sr-only">
              {t("listLabel")}
            </h2>
            <ol className="flex flex-col gap-4">
              {report.findings.map((item, index) => (
                <FindingCard key={item.finding.id} item={item} first={index === 0} />
              ))}
            </ol>
          </section>
        </>
      )}

      <EobReconciliation bill={bill} />

      {/* Next steps, the phone script and the reminder are useful but long, so
          they sit behind one disclosure and the findings stay the focus. */}
      <details className="group rounded-surface border bg-card print:hidden">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <span className="flex flex-col">
            <span className="text-lead font-semibold">{t("moreTitle")}</span>
            <span className="text-meta text-muted-foreground">{t("moreHint")}</span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-5 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
          />
        </summary>
        <div className="flex flex-col gap-8 px-5 pb-6">
          <Timeline
            hasFindings={report.findings.length > 0}
            hrefs={{
              itemized: stepHref(source, "letter", { type: "itemized" }),
              summary: stepHref(source, "summary"),
              letter: stepHref(source, "letter"),
            }}
          />

          <CallScript items={buildLetterModel(bill, findings).items} collapsible />
          <Reminders mode="followUp" />
        </div>
      </details>

      <p className="text-sm text-muted-foreground">{t("disclaimer")}</p>

      {/* One primary action, one secondary, then quiet links. The summary and
          the itemized-bill letter are linked from "What happens next" above. */}
      <div className="flex flex-col gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          {report.findings.length > 0 ? (
            <PendingLink
              href={stepHref(source, "letter")}
              data-walkthrough="letter"
              className={buttonVariants()}
              pendingLabel={t("makeLetterPending")}
            >
              {t("makeLetter")}
            </PendingLink>
          ) : null}
          <PrintButton label={t("print")} variant="secondary" />
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <Link
            href={stepHref(source, "review")}
            className={buttonVariants({ variant: "quiet", className: "pl-0" })}
          >
            {t("backToReview")}
          </Link>
          <PendingLink
            href={stepHref(source, "assistance")}
            className={buttonVariants({ variant: "quiet", className: "pl-0" })}
            pendingLabel={t("assistancePending")}
          >
            {t("assistance")}
          </PendingLink>
        </div>
      </div>
    </main>
  );
}

export function ReportSkeleton() {
  return (
    <main
      aria-busy="true"
      className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10"
    >
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-full max-w-md" />
      <Skeleton className="h-36 w-full" />
      <Skeleton className="h-64 w-full" />
    </main>
  );
}
