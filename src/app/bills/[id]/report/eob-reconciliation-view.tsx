import { getLocale, getTranslations } from "next-intl/server";
import { TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/money";
import type { ExtractedBill } from "@/lib/types";
import {
  buildEobReconciliation,
  type ReconciliationRow,
  type ReconciliationStatus,
} from "./eob-reconciliation";

const BADGE: Record<ReconciliationStatus, "success" | "warning" | "outline" | "secondary"> = {
  match: "success",
  billHigher: "warning",
  billLower: "warning",
  denied: "secondary",
  unknown: "outline",
  notOnEob: "outline",
  notOnBill: "outline",
};

const MISMATCH = new Set<ReconciliationStatus>(["billHigher", "billLower"]);

/** Bill lines next to the EOB's lines. Display only: findings come from the rules. */
export async function EobReconciliation({ bill }: { bill: ExtractedBill }) {
  const rows = buildEobReconciliation(bill);
  if (rows.length === 0) return null;

  const [locale, t] = await Promise.all([getLocale(), getTranslations("Report.eob")]);
  const day = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });
  const money = (cents: number | null) => (cents === null ? t("unknown") : formatCents(cents));
  const when = (row: ReconciliationRow) =>
    row.dateOfService ? day.format(new Date(`${row.dateOfService}T00:00:00Z`)) : t("noDate");

  return (
    <section aria-labelledby="eob-title" className="flex flex-col gap-4 rounded-xl border bg-card p-6">
      <div className="flex flex-col gap-1">
        <h2 id="eob-title" className="text-xl font-semibold">
          {t("title")}
        </h2>
        <p className="text-muted-foreground">{t("intro")}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <caption className="sr-only">{t("tableLabel")}</caption>
          <thead>
            <tr className="border-b">
              <th scope="col" className="py-2 pr-3">{t("columns.service")}</th>
              <th scope="col" className="py-2 pr-3 text-right">{t("columns.billed")}</th>
              <th scope="col" className="py-2 pr-3 text-right">{t("columns.allowed")}</th>
              <th scope="col" className="py-2 pr-3 text-right">{t("columns.planPaid")}</th>
              <th scope="col" className="py-2 pr-3 text-right">{t("columns.eobOwed")}</th>
              <th scope="col" className="py-2 pr-3 text-right">{t("columns.billOwed")}</th>
              <th scope="col" className="py-2">{t("columns.status")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const mismatch = MISMATCH.has(row.status);
              return (
                <tr
                  key={row.key}
                  data-status={row.status}
                  className={cn(
                    "border-b align-top",
                    mismatch && "bg-warning-surface shadow-[inset_4px_0_0_var(--warning-border)]",
                  )}
                >
                  <th scope="row" className="py-2 pr-3 pl-2 font-normal">
                    <span className="block">{when(row)}</span>
                    <span className="font-mono">{row.code ?? t("noCode")}</span>
                  </th>
                  <td className="py-2 pr-3 text-right tabular-nums">{money(row.billChargeCents ?? row.eobBilledCents)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{money(row.allowedCents)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{money(row.planPaidCents)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{money(row.eobPatientResponsibilityCents)}</td>
                  <td className={cn("py-2 pr-3 text-right tabular-nums", mismatch && "font-semibold")}>
                    {money(row.billPatientOwesCents)}
                  </td>
                  <td className="py-2">
                    <Badge variant={BADGE[row.status]}>
                      {mismatch ? <TriangleAlert aria-hidden="true" /> : null}
                      {t(`status.${row.status}`)}
                    </Badge>
                    {row.differenceCents !== null && row.differenceCents !== 0 ? (
                      <span className="mt-1 block tabular-nums text-muted-foreground">
                        {t("difference", { amount: formatCents(Math.abs(row.differenceCents)) })}
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground">{t("note")}</p>
    </section>
  );
}
