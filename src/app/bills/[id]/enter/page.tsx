import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { ManualEntryForm } from "@/components/manual-entry-form";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getBillForEntry } from "@/lib/bills/manual-entry-data";
import { routeMetadata } from "@/lib/metadata";

// Request-time clock for the stale-extraction check; this runs after connection().
const currentTimeMs = () => Date.now();

const MAIN = "mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12";

async function EnterView({ id }: { id: string }) {
  await connection();
  const load = await getBillForEntry(id, currentTimeMs());
  if (!load) notFound();
  if (load.state === "reviewed") redirect(`/bills/${id}/review`);

  const [locale, t] = await Promise.all([getLocale(), getTranslations("Manual")]);

  return (
    <NextIntlClientProvider>
      <main lang={locale} className={MAIN}>
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold sm:text-4xl">{t("title")}</h1>
          <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
        </header>
        {load.state === "busy" ? (
          <div className="flex flex-col items-start gap-4">
            <p role="status">{t("busy")}</p>
            <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
              {t("cancel")}
            </Link>
          </div>
        ) : (
          <ManualEntryForm billId={id} draft={load.draft} />
        )}
      </main>
    </NextIntlClientProvider>
  );
}

async function EnterById({ params }: Pick<PageProps<"/bills/[id]/enter">, "params">) {
  const { id } = await params;
  return <EnterView id={id} />;
}

export const generateMetadata = () => routeMetadata("manualEntry");

export default function EnterPage(props: PageProps<"/bills/[id]/enter">) {
  return (
    <Suspense
      fallback={
        <main aria-busy="true" className={MAIN}>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </main>
      }
    >
      <EnterById params={props.params} />
    </Suspense>
  );
}
