import { Suspense } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { getBillForReview } from "@/lib/bills/review-data";
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
        className="mx-auto flex w-full max-w-[96rem] flex-col gap-6 px-6 py-10"
      >
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="max-w-2xl text-muted-foreground">{t("subtitle")}</p>
        </header>
        <ReviewTable bill={bill} />
      </main>
    </NextIntlClientProvider>
  );
}

export default function ReviewPage(props: PageProps<"/bills/[id]/review">) {
  return (
    <Suspense fallback={null}>
      <Review params={props.params} />
    </Suspense>
  );
}
