import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { FlaskConical } from "lucide-react";
import { PendingLink } from "@/components/pending-link";
import { SignInButton } from "@/components/sign-in-button";
import { buttonVariants } from "@/components/ui/button";
import { isSignedIn } from "@/lib/supabase/signed-in";

/** Shown on every /demo page so nobody mistakes the sample for their own bill. */
export async function DemoBanner() {
  await connection();
  const [locale, t, signedIn] = await Promise.all([
    getLocale(),
    getTranslations("Demo.banner"),
    isSignedIn(),
  ]);

  return (
    <aside lang={locale} aria-label={t("label")} className="border-b bg-secondary/60 print:hidden">
      <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-1 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
        <p className="flex items-start gap-2 text-meta font-medium text-secondary-foreground sm:text-body">
          <FlaskConical aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          {t("message")}
        </p>
        {signedIn ? (
          <PendingLink
            href="/bills/new"
            className={buttonVariants({ variant: "quiet" })}
            pendingLabel={t("uploadPending")}
          >
            {t("upload")}
          </PendingLink>
        ) : (
          <SignInButton
            size="default"
            variant="quiet"
            pendingLabel={t("signInPending")}
            className="h-auto min-h-11 justify-start py-2 text-left whitespace-normal sm:justify-center"
          >
            {t("signIn")}
          </SignInButton>
        )}
      </div>
    </aside>
  );
}
