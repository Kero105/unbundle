import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { BillSteps } from "@/components/bill-steps";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { loadFindings, stepHref, type BillSource } from "@/lib/bills/source";
import { resolveLocale } from "@/i18n/locale";
import en from "../../../../../messages/en.json";
import es from "../../../../../messages/es.json";
import { LetterEditor } from "./letter-editor";
import type { LetterKind } from "./letter-content";
import { buildLetterModel } from "./letter-model";

export async function LetterView({
  source,
  initialKind,
}: {
  source: BillSource;
  initialKind?: LetterKind;
}) {
  // Findings depend on live reference data, so never prerender them.
  await connection();
  const result = await loadFindings(source);
  if (!result) notFound();
  const { bill, findings } = result;
  const model = buildLetterModel(bill, findings);

  const [localeRaw, t] = await Promise.all([getLocale(), getTranslations("Letter.page")]);
  const locale = resolveLocale(localeRaw, null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <main
      lang={locale}
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10"
    >
      <header className="flex flex-col gap-4 print:hidden">
        <BillSteps current="letter" />
      </header>

      <LetterEditor
        model={model}
        uiLocale={locale}
        messages={{ en: en.Letter, es: es.Letter }}
        initialDate={today}
        initialProviderName={bill.providerName}
        initialKind={initialKind}
      />

      {/* Step 4 is optional, so point to it here instead of leaving it as a
          label in the step bar. */}
      <section
        aria-labelledby="letter-next"
        className="flex flex-col gap-4 rounded-surface border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 print:hidden"
      >
        <div className="flex flex-col gap-1">
          <h2 id="letter-next" className="text-lead font-semibold">
            {t("nextTitle")}
          </h2>
          <p className="text-muted-foreground">{t("nextBody")}</p>
        </div>
        <Link href={stepHref(source, "assistance")} className={buttonVariants({ className: "shrink-0" })}>
          {t("nextCta")}
          <ArrowRight aria-hidden="true" />
        </Link>
      </section>

      <div className="print:hidden">
        <Link
          href={stepHref(source, "report")}
          className={buttonVariants({ variant: "outline" })}
        >
          {t("backToReport")}
        </Link>
      </div>
    </main>
  );
}

export function LetterSkeleton() {
  return (
    <main
      aria-busy="true"
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10"
    >
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-full max-w-md" />
      <Skeleton className="h-96 w-full" />
    </main>
  );
}
