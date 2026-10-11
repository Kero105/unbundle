import { Suspense } from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ErrorState, ErrorStateSkeleton } from "@/components/error-state";
import { buttonVariants } from "@/components/ui/button";

async function NotFoundContent() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("NotFound")]);
  return (
    <div lang={locale} className="flex flex-1 flex-col">
      <ErrorState title={t("title")} body={t("body")}>
        <Link href="/" className={buttonVariants({ size: "lg" })}>
          {t("home")}
        </Link>
      </ErrorState>
    </div>
  );
}

export default function NotFound() {
  return (
    <Suspense fallback={<ErrorStateSkeleton />}>
      <NotFoundContent />
    </Suspense>
  );
}
