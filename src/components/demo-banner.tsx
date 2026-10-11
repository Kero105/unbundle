import { getLocale, getTranslations } from "next-intl/server";
import { FlaskConical } from "lucide-react";
import { SignInButton } from "@/components/sign-in-button";

/** Shown on every /demo page so nobody mistakes the sample for their own bill. */
export async function DemoBanner() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Demo.banner")]);

  return (
    <aside lang={locale} aria-label={t("label")} className="border-b bg-secondary/60 print:hidden">
      <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="flex items-start gap-2 font-medium text-secondary-foreground">
          <FlaskConical aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          {t("message")}
        </p>
        <SignInButton size="default" variant="outline" pendingLabel={t("signInPending")}>
          {t("signIn")}
        </SignInButton>
      </div>
    </aside>
  );
}
