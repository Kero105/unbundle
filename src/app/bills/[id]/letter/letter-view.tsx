import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { CircleCheck } from "lucide-react";
import { BillSteps } from "@/components/bill-steps";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { loadFindings, stepHref, type BillSource } from "@/lib/bills/source";
import { resolveLocale } from "@/i18n/locale";
import en from "../../../../../messages/en.json";
import es from "../../../../../messages/es.json";
import { LetterEditor } from "./letter-editor";
import { buildLetterModel } from "./letter-model";

export async function LetterView({ source }: { source: BillSource }) {
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
      <header className="flex flex-col gap-4">
        <BillSteps current="letter" />
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold sm:text-4xl">{t("title")}</h1>
          <p className="max-w-2xl text-lg text-muted-foreground">{t("subtitle")}</p>
        </div>
      </header>

      {model.items.length === 0 ? (
        <section className="flex flex-col gap-3 rounded-xl border border-success-border/50 bg-success-surface p-6 text-success-foreground">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <CircleCheck aria-hidden="true" className="size-6 shrink-0" />
            {t("empty.title")}
          </h2>
          <p>{t("empty.body")}</p>
        </section>
      ) : (
        <LetterEditor
          model={model}
          uiLocale={locale}
          messages={{ en: en.Letter, es: es.Letter }}
          initialDate={today}
          initialProviderName={bill.providerName}
        />
      )}

      <div>
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
