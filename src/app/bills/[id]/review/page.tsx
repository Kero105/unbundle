import { Suspense } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { getBillForReview } from "@/lib/bills/review-data";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ReviewTable } from "./review-table";

const STEPS = ["review", "findings", "letter"] as const;

// params and the request locale are both request-time data, so the content
// renders inside Suspense and the page shell stays static.
async function Review({ params }: Pick<PageProps<"/bills/[id]/review">, "params">) {
  const { id } = await params;
  const bill = await getBillForReview(id);
  if (!bill) notFound();

  const [locale, t] = await Promise.all([getLocale(), getTranslations("Review")]);

  return (
    <NextIntlClientProvider>
      <main
        lang={locale}
        className="mx-auto flex w-full max-w-[96rem] flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10"
      >
        <header className="flex flex-col gap-4">
          <nav aria-label={t("steps.label")}>
            <ol className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {STEPS.map((step, index) => {
                const current = index === 0;
                return (
                  <li
                    key={step}
                    aria-current={current ? "step" : undefined}
                    className="flex items-center gap-2"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full border text-sm font-semibold",
                        current
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-card text-muted-foreground",
                      )}
                    >
                      {index + 1}
                    </span>
                    <span
                      className={cn(
                        "font-medium",
                        current ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {t(`steps.${step}`)}
                      {current ? <span className="sr-only"> ({t("steps.current")})</span> : null}
                    </span>
                    {index < STEPS.length - 1 ? (
                      <span aria-hidden="true" className="ml-2 h-px w-8 bg-border sm:w-12" />
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </nav>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold sm:text-4xl">{t("title")}</h1>
            <p className="max-w-2xl text-lg text-muted-foreground">{t("subtitle")}</p>
          </div>
        </header>
        <ReviewTable bill={bill} />
      </main>
    </NextIntlClientProvider>
  );
}

function ReviewSkeleton() {
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

export default function ReviewPage(props: PageProps<"/bills/[id]/review">) {
  return (
    <Suspense fallback={<ReviewSkeleton />}>
      <Review params={props.params} />
    </Suspense>
  );
}
