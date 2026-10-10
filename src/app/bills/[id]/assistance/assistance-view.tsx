import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { BillSteps } from "@/components/bill-steps";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { loadBill, loadPovertyGuidelines, stepHref, type BillSource } from "@/lib/bills/source";
import { resolveLocale } from "@/i18n/locale";
import en from "../../../../../messages/en.json";
import es from "../../../../../messages/es.json";
import { AssistanceForm } from "./assistance-form";

export async function AssistanceView({ source }: { source: BillSource }) {
  // Poverty guidelines are read with the signed-in user's session; never prerender.
  await connection();
  const bill = await loadBill(source);
  if (!bill) notFound();
  const guidelines = await loadPovertyGuidelines(source);

  const [localeRaw, t] = await Promise.all([getLocale(), getTranslations("Assistance")]);
  const locale = resolveLocale(localeRaw, null);

  return (
    <main
      lang={locale}
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10"
    >
      <header className="flex flex-col gap-4">
        <BillSteps current="assistance" />
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold sm:text-4xl">{t("page.title")}</h1>
          <p className="max-w-2xl text-lg text-muted-foreground">{t("page.subtitle")}</p>
        </div>
      </header>

      {guidelines ? (
        <AssistanceForm
          uiLocale={locale}
          messages={{ en: en.Assistance, es: es.Assistance }}
          guidelines={guidelines}
          initialBilledTotalCents={bill.totalBilledCents}
        />
      ) : (
        <p role="alert" className="rounded-xl border bg-card p-6">
          {t("page.unavailable")}
        </p>
      )}

      <div>
        <Link
          href={stepHref(source, "report")}
          className={buttonVariants({ variant: "outline" })}
        >
          {t("page.backToReport")}
        </Link>
      </div>
    </main>
  );
}

export function AssistanceSkeleton() {
  return (
    <main
      aria-busy="true"
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10"
    >
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-full max-w-md" />
      <Skeleton className="h-96 w-full" />
    </main>
  );
}
