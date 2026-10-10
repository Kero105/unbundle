import type { Metadata } from "next";
import { Suspense } from "react";
import { Fraunces, Public_Sans } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
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

export const metadata: Metadata = {
  title: "Unbundle",
  description:
    "Check your medical bill for duplicate charges, unbundled procedures, and prices far above Medicare.",
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
