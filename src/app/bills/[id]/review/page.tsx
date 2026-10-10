import { Suspense } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { getBillForReview } from "@/lib/bills/review-data";
import { Skeleton } from "@/components/ui/skeleton";
import { BillSteps } from "@/components/bill-steps";
import { ReviewTable } from "./review-table";

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
          <BillSteps current="review" />
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold sm:text-4xl">{t("title")}</h1>
            <p className="max-w-2xl text-lg text-muted-foreground">{t("subtitle")}</p>
          </div>
        </header>
        <ReviewTable bill={bill} billId={id} />
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
