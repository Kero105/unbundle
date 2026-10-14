import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { BackLink } from "@/components/back-link";
import { PrintButton } from "@/components/print-button";
import { ShareActions } from "@/components/share-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { routeMetadata } from "@/lib/metadata";
import { renderQrSvg } from "@/lib/share/qr";
import { getSiteUrl } from "@/lib/share/site-url";

export const generateMetadata = () => routeMetadata("share");

async function Share() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Share")]);
  const url = getSiteUrl();
  // One variable feeds the visible link, the QR and the buttons, so they cannot disagree.
  const svg = url ? renderQrSvg(url) : null;

  return (
    <main
      lang={locale}
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14"
    >
      <div className="print:hidden">
        <BackLink />
      </div>
      <header className="flex flex-col gap-3 print:hidden">
        <h1 className="text-4xl leading-[1.1] font-semibold text-balance sm:text-5xl">{t("title")}</h1>
        <p className="text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-9">{t("subtitle")}</p>
      </header>

      {url && svg ? (
        <>
          <section
            aria-labelledby="share-block-title"
            className="flex flex-col items-center gap-5 rounded-xl border bg-card p-6 text-center break-inside-avoid sm:p-10"
          >
            <h2 id="share-block-title" className="text-2xl font-semibold text-balance sm:text-3xl">
              {t("blockTitle")}
            </h2>
            <p className="max-w-md text-lg leading-8">{t("blockLine")}</p>
            {/* White behind the code even in dark mode, so it always scans. */}
            <div
              role="img"
              aria-label={t("qrLabel", { url })}
              className="w-56 max-w-full rounded-lg bg-white sm:w-64 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            <p className="text-sm font-medium text-muted-foreground print:hidden">{t("qrNote")}</p>
            <p className="text-xl font-semibold break-all">{url}</p>
          </section>

          <section aria-labelledby="share-link-title" className="flex flex-col gap-3 print:hidden">
            <h2 id="share-link-title" className="text-2xl font-semibold">
              {t("linkTitle")}
            </h2>
            <p className="rounded-lg border bg-card p-3 font-mono text-base break-all">{url}</p>
            <ShareActions
              url={url}
              labels={{
                copy: t("copy"),
                copied: t("copied"),
                copyFailed: t("copyFailed"),
                share: t("shareButton"),
                shareTitle: t("shareTitle"),
              }}
            />
            <div>
              <PrintButton label={t("print")} variant="outline" />
            </div>
          </section>
        </>
      ) : (
        <p role="note" className="rounded-xl border bg-card p-6 text-lg leading-8">
          {t("notConfigured")}
        </p>
      )}
    </main>
  );
}

function ShareSkeleton() {
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="mt-6 h-72 w-full" />
    </main>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={<ShareSkeleton />}>
      <Share />
    </Suspense>
  );
}
