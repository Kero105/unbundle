import type { ReactNode } from "react";
import Link from "next/link";

export const legalLinkClass =
  "font-medium text-primary underline underline-offset-4 hover:no-underline";

export function LegalPage({
  locale,
  home,
  title,
  updatedLabel,
  updated,
  summaryTitle,
  summary,
  children,
}: {
  locale: string;
  home: string;
  title: string;
  updatedLabel: string;
  updated: string;
  summaryTitle: string;
  summary: string[];
  children: ReactNode;
}) {
  return (
    <main
      lang={locale}
      className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 text-lg leading-8 sm:px-6 sm:py-16"
    >
      <Link href="/" className={`text-base ${legalLinkClass}`}>
        {home}
      </Link>
      <h1 className="mt-6 text-3xl font-semibold text-balance sm:text-4xl">{title}</h1>
      <p className="mt-2 text-base text-muted-foreground">
        {updatedLabel}: {updated}
      </p>

      <section aria-labelledby="summary-title" className="mt-8 rounded-lg border bg-card p-6">
        <h2 id="summary-title" className="text-xl font-semibold">
          {summaryTitle}
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-6">
          {summary.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <div className="mt-8 space-y-8">{children}</div>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-2xl font-semibold">{title}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}
