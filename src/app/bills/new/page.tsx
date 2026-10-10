import { Suspense } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { UploadForm } from "./upload-form";

async function UploadView() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Upload")]);
  return (
    <NextIntlClientProvider>
      <main
        lang={locale}
        className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12"
      >
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold sm:text-4xl">{t("title")}</h1>
          <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
        </header>
        <UploadForm />
      </main>
    </NextIntlClientProvider>
  );
}

export default function NewBillPage() {
  return (
    <Suspense
      fallback={
        <main aria-busy="true" className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full" />
        </main>
      }
    >
      <UploadView />
    </Suspense>
  );
}
