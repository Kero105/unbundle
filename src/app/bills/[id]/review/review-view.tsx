import { notFound } from "next/navigation";
import { Info } from "lucide-react";
import { z } from "zod";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { loadBill, stepHref, type BillSource } from "@/lib/bills/source";
import { Skeleton } from "@/components/ui/skeleton";
import { BillSteps } from "@/components/bill-steps";
import { DeleteBillButton } from "@/components/delete-bill-button";
import { summarizeConfidence } from "@/lib/bills/extraction-confidence";
import { getSourceFileForBill } from "@/lib/bills/source-file-server";
import { ReviewTable } from "./review-table";

// The request locale is request-time data, so callers render this inside
// Suspense and the page shell stays static.
export async function ReviewView({ source }: { source: BillSource }) {
  const bill = await loadBill(source);
  if (!bill) notFound();

  // The bundled fixture served at /bills/demo has no rows to save to.
  const persisted = source.kind === "bill" && z.uuid().safeParse(source.id).success;

  const [locale, t] = await Promise.all([getLocale(), getTranslations("Review")]);

  const confidence = summarizeConfidence(bill.lineItems);

  // Signed per request with the user-scoped client; never cached or stored.
  const panelSource =
    source.kind === "demo"
      ? ({ kind: "demo" } as const)
      : persisted
        ? await getSourceFileForBill(source.id)
        : ({ kind: "unavailable" } as const);

  return (
    <NextIntlClientProvider>
      <main
        lang={locale}
        className="mx-auto flex w-full max-w-[96rem] flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10"
      >
        <header className="flex flex-col gap-4">
          <BillSteps current="review" />
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold sm:text-4xl">{t("title")}</h1>
            <p className="max-w-2xl text-lg text-muted-foreground">{t("subtitle")}</p>
            <p className="text-base font-medium">{t("rowsRead", { count: confidence.rowCount })}</p>
          </div>
          {confidence.low ? (
            <p
              role="note"
              className="flex max-w-2xl items-start gap-3 rounded-lg border bg-muted p-4 text-base"
            >
              <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              {t("lowConfidenceNote")}
            </p>
          ) : null}
        </header>
        <ReviewTable
          bill={bill}
          reportHref={stepHref(source, "report")}
          demo={source.kind === "demo"}
          billId={persisted ? source.id : undefined}
          source={panelSource}
        />
        {persisted ? (
          <div className="flex">
            <DeleteBillButton billId={source.id} size="sm" />
          </div>
        ) : null}
      </main>
    </NextIntlClientProvider>
  );
}

export function ReviewSkeleton() {
  return (
    <main
      aria-busy="true"
      className="mx-auto flex w-full max-w-[96rem] flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10"
    >
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-full max-w-md" />
      <Skeleton className="h-44 w-full" />
      <Skeleton className="h-96 w-full" />
    </main>
  );
}
