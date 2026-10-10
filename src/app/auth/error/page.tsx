import { Suspense } from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ErrorState } from "@/components/error-state";
import { SignInButton } from "@/components/sign-in-button";
import { buttonVariants } from "@/components/ui/button";
import { routeMetadata } from "@/lib/metadata";

async function AuthErrorContent() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("AuthError")]);
  return (
    <div lang={locale} className="flex flex-1 flex-col">
      <ErrorState title={t("title")} body={t("body")}>
        <SignInButton>{t("retry")}</SignInButton>
        <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
          {t("home")}
        </Link>
      </ErrorState>
    </div>
  );
}

export const generateMetadata = () => routeMetadata("authError");

export default function AuthErrorPage() {
  return (
    <Suspense fallback={null}>
      <AuthErrorContent />
    </Suspense>
  );
}
