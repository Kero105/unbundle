import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { BackLink } from "@/components/back-link";
import { Skeleton } from "@/components/ui/skeleton";
import { AssistanceForm } from "@/app/bills/[id]/assistance/assistance-form";
import { getDemoPovertyGuidelines } from "@/lib/demo/data";
import { resolveLocale } from "@/i18n/locale";
import { routeMetadata } from "@/lib/metadata";
import en from "../../../../messages/en.json";
import es from "../../../../messages/es.json";

export const generateMetadata = () => routeMetadata("rightsCheck");

async function RightsCheck() {
  const [localeRaw, t] = await Promise.all([getLocale(), getTranslations("RightsCheck")]);
  const locale = resolveLocale(localeRaw, null);
  // Public HHS poverty guidelines from the bundled snapshot: no database read,
  // no session, and no service role. The same table the signed-in flow reads.
  const guidelines = getDemoPovertyGuidelines();

  return (
    <main
      lang={locale}
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14"
    >
      <BackLink href="/rights" label={t("back")} />
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold text-balance sm:text-4xl">{t("title")}</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">{t("subtitle")}</p>
        <p className="font-medium">{t("privacy")}</p>
      </header>

      <AssistanceForm
        uiLocale={locale}
        messages={{ en: en.Assistance, es: es.Assistance }}
        guidelines={guidelines}
        initialBilledTotalCents={0}
      />
    </main>
  );
}

function RightsCheckSkeleton() {
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="mt-4 h-6 w-full" />
      <Skeleton className="mt-8 h-96 w-full" />
    </main>
  );
}

export default function RightsCheckPage() {
  return (
    <Suspense fallback={<RightsCheckSkeleton />}>
      <RightsCheck />
    </Suspense>
  );
}
