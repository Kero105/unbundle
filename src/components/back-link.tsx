import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

/** Every standalone page ends or begins with a way back; the default goes home. */
export async function BackLink({ href = "/", label }: { href?: string; label?: string }) {
  const text = label ?? (await getTranslations("Shell"))("backHome");
  return (
    <Link
      href={href}
      className="inline-flex min-h-10 items-center gap-2 text-base font-medium text-primary underline underline-offset-4 hover:no-underline"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      {text}
    </Link>
  );
}
