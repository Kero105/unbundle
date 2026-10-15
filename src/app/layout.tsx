import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Fraunces, Public_Sans } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SkipLink } from "@/components/skip-link";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { DARK_BACKGROUND, LIGHT_BACKGROUND, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
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
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  openGraph: { siteName: SITE_NAME, type: "website" },
  // The apple-touch-icon itself comes from app/apple-icon.tsx.
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
};

// viewport-fit=cover makes env(safe-area-inset-*) available; the fixed bars and
// the body use it so nothing sits under a notch or home indicator.
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: LIGHT_BACKGROUND },
    { media: "(prefers-color-scheme: dark)", color: DARK_BACKGROUND },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the theme script sets data-theme on <html> before
    // React hydrates, which is the one attribute React is not told about.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${publicSans.variable} ${fraunces.variable} h-full`}
    >
      <head>
        {/* Applies a saved theme before first paint, so there is no flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
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
