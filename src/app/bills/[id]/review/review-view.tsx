import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { loadBill, stepHref, type BillSource } from "@/lib/bills/source";
import { Skeleton } from "@/components/ui/skeleton";
import { BillSteps } from "@/components/bill-steps";
import { ReviewTable } from "./review-table";

// The request locale is request-time data, so callers render this inside
// Suspense and the page shell stays static.
export async function ReviewView({ source }: { source: BillSource }) {
  const bill = await loadBill(source);
  if (!bill) notFound();

  const [locale, t] = await Promise.all([getLocale(), getTranslations("Review")]);

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
          </div>
        </header>
        <ReviewTable
          bill={bill}
          reportHref={stepHref(source, "report")}
          demo={source.kind === "demo"}
        />
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
