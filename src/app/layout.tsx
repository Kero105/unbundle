import type { Metadata } from "next";
import { Suspense } from "react";
import { Fraunces, Public_Sans } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SkipLink } from "@/components/skip-link";
import { SiteHeader, SiteHeaderFallback } from "@/components/site-header";
import "./globals.css";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

// Optional public origin, used to build absolute Open Graph URLs. Not a secret.
function siteOrigin(): URL | undefined {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) return undefined;
  try {
    return new URL(raw);
  } catch {
    return undefined;
  }
}

// Every route sets its own localized title and description; these are the
// fallback for anything that does not.
export const metadata: Metadata = {
  metadataBase: siteOrigin(),
  title: "Unbundle",
  description:
    "Check your medical bill for duplicate charges, unbundled procedures, and prices far above Medicare.",
  openGraph: { siteName: "Unbundle", type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${publicSans.variable} ${fraunces.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        {/* Locale and session are request-time data: the header and footer
            stream in behind Suspense while the page shell stays static. */}
        <Suspense fallback={null}>
          <SkipLink />
        </Suspense>
        <Suspense fallback={<SiteHeaderFallback />}>
          <SiteHeader />
        </Suspense>
        <div id="content" tabIndex={-1} className="flex flex-1 flex-col outline-none">
          {children}
        </div>
        <Suspense fallback={null}>
          <SiteFooter />
        </Suspense>
      </body>
    </html>
  );
}
