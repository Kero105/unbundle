import { getLocale, getTranslations } from "next-intl/server";
import { FlaskConical, TriangleAlert } from "lucide-react";
import { buildReport } from "@/app/bills/[id]/report/report-model";
import { Card, CardContent } from "@/components/ui/card";
import { getDemoBill, getDemoFindings } from "@/lib/demo/data";
import { formatCents } from "@/lib/money";

/**
 * A static, non-interactive preview of one finding, built from the same bundled
 * sample data and rule output that /demo/report shows. Nothing is invented: the
 * Medicare benchmark is the billed amount minus the finding's amount at stake.
 * It is a figure with a visible caption, so the label is the text alternative
 * and its contents are ordinary text.
 */
export async function SampleFinding() {
  const bill = getDemoBill();
  const { findings } = buildReport(bill, getDemoFindings());
  const item = findings.find((f) => f.finding.ruleId === "price_outlier");
  const line = item?.lineItems[0];
  if (!item || !line) return null;

  const billed = line.chargeCents;
  const medicare = billed - item.finding.amountAtStakeCents;
  if (billed <= 0 || medicare <= 0 || medicare >= billed) return null;
  const medicareShare = Math.max(3, Math.round((medicare / billed) * 100));

  const [locale, t, tReport] = await Promise.all([
    getLocale(),
    getTranslations("Home.sample"),
    getTranslations("Report"),
  ]);
  const date = bill.serviceStart
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(
        new Date(`${bill.serviceStart}T00:00:00Z`),
      )
    : null;

  return (
    <figure className="m-0">
      <figcaption className="mb-3 flex items-center gap-2 text-meta font-medium text-muted-foreground">
        <FlaskConical aria-hidden="true" className="size-4 shrink-0" />
        {t("label")}
      </figcaption>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="font-semibold">{bill.providerName}</p>
            {date ? <p className="text-meta text-muted-foreground">{date}</p> : null}
          </div>

          <div className="flex flex-col gap-3 border-t pt-4">
            <p className="font-heading text-lead font-semibold">
              {tReport(`rules.${item.finding.ruleId}`)}
            </p>
            <div>
              {/* Same tokens as the warning badge, but allowed to wrap: the Spanish text is long. */}
              <span className="inline-flex items-start gap-1.5 rounded-control border border-warning-border/50 bg-warning-surface px-3 py-1 text-meta font-medium text-warning-foreground">
                <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {tReport("finding.checkWithOffice")}
              </span>
            </div>
            <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="min-w-0">
                <span className="font-mono text-meta">{line.code}</span>{" "}
                <span>{line.descriptionRaw}</span>
              </span>
            </p>
          </div>

          <ul className="flex flex-col gap-3">
            <li>
              <p className="flex items-baseline justify-between gap-4">
                <span className="text-meta text-muted-foreground">{t("billed")}</span>
                <span className="font-semibold tabular-nums">{formatCents(billed)}</span>
              </p>
              <div aria-hidden="true" className="mt-1 h-2 rounded-full bg-warning-border" />
            </li>
            <li>
              <p className="flex items-baseline justify-between gap-4">
                <span className="text-meta text-muted-foreground">{t("medicare")}</span>
                <span className="font-semibold tabular-nums">{formatCents(medicare)}</span>
              </p>
              <div aria-hidden="true" className="mt-1 h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${medicareShare}%` }}
                />
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>
    </figure>
  );
}
