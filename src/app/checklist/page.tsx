import { Suspense } from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { BackLink } from "@/components/back-link";
import { PrintButton } from "@/components/print-button";
import { Skeleton } from "@/components/ui/skeleton";
import { CHECKLIST_ITEMS, ITEMIZED_LETTER_HREF } from "@/lib/content/checklist-items";
import { routeMetadata } from "@/lib/metadata";

export const generateMetadata = () => routeMetadata("checklist");

const linkClass = "font-medium text-primary underline underline-offset-4 hover:no-underline";

async function Checklist() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Checklist")]);

  return (
    <main
      lang={locale}
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14"
    >
      <div className="print:hidden">
        <BackLink />
      </div>
      <header className="flex flex-col gap-3">
        <h1 className="text-4xl leading-[1.1] font-semibold text-balance sm:text-5xl">{t("title")}</h1>
        <p className="text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-9">{t("subtitle")}</p>
        <p className="text-base text-muted-foreground">{t("nothingSaved")}</p>
      </header>

      <section aria-labelledby="gather-title" className="flex flex-col gap-4">
        <h2 id="gather-title" className="text-2xl font-semibold">
          {t("gatherTitle")}
        </h2>
        <ul className="flex flex-col gap-3">
          {CHECKLIST_ITEMS.map((item) => (
            <li key={item} className="flex items-start gap-4 rounded-lg border bg-card p-4 break-inside-avoid">
              {/* A box to tick on paper. Decorative: this page has no controls and keeps no state. */}
              <span
                aria-hidden="true"
                className="mt-1 size-6 shrink-0 rounded border-2 border-foreground/60"
              />
              <div>
                <h3 className="text-lg font-semibold">{t(`items.${item}.title`)}</h3>
                <p className="mt-1 text-lg leading-8">{t(`items.${item}.body`)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="notes-title" className="flex flex-col gap-3 break-inside-avoid">
        <h2 id="notes-title" className="text-2xl font-semibold">
          {t("notesTitle")}
        </h2>
        <p className="text-lg leading-8">{t("notesBody")}</p>
        {/* Blank writing space for the printed page. */}
        <div aria-hidden="true" className="h-56 rounded-lg border-2 border-dashed border-foreground/40" />
      </section>

      <section aria-labelledby="next-title" className="flex flex-col gap-3 print:hidden">
        <h2 id="next-title" className="text-2xl font-semibold">
          {t("nextTitle")}
        </h2>
        <p className="text-lg leading-8">{t("letterBody")}</p>
        <ul className="flex flex-col gap-2 text-lg">
          <li>
            <Link href={ITEMIZED_LETTER_HREF} className={linkClass}>
              {t("letterLink")}
            </Link>
          </li>
          <li>
            <Link href="/rights" className={linkClass}>
              {t("rightsLink")}
            </Link>
          </li>
        </ul>
        <div>
          <PrintButton label={t("print")} variant="outline" />
        </div>
      </section>

      <p className="text-sm text-muted-foreground">{t("notAdvice")}</p>
    </main>
  );
}

function ChecklistSkeleton() {
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="mt-6 h-24 w-full" />
      <Skeleton className="mt-4 h-24 w-full" />
    </main>
  );
}

export default function ChecklistPage() {
  return (
    <Suspense fallback={<ChecklistSkeleton />}>
      <Checklist />
    </Suspense>
  );
}
