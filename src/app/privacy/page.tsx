import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Unbundle",
};

export default function Privacy() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16 font-sans text-zinc-800 dark:text-zinc-200">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        &larr; Home
      </Link>
      <h1 className="mt-6 text-3xl font-semibold text-black dark:text-zinc-50">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-zinc-500">Last updated October 7, 2026</p>

      <div className="mt-8 space-y-6 leading-7">
        <p>
          Unbundle is a student project built for the Congressional App
          Challenge. It helps people check their medical bills. This page
          explains what information we collect and what we do with it.
        </p>

        <section>
          <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
            What we collect
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>
              Your Google account email and name, so you can sign in.
            </li>
            <li>
              Bill images you upload, and the line items we read from them.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
            How we use it
          </h2>
          <p className="mt-2">
            To read the text on your bill, we send the image to Claude, an AI
            model made by Anthropic. Your bills and line items are stored in
            Supabase, and access is limited to your account.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
            What we don&apos;t do
          </h2>
          <p className="mt-2">
            We never sell your information. We don&apos;t share it with anyone,
            except sending bill images to Anthropic so they can be read as
            described above.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
            Deleting your data
          </h2>
          <p className="mt-2">
            You can ask us to delete your account and everything you&apos;ve
            uploaded at any time by emailing us at the address below.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
            Contact
          </h2>
          <p className="mt-2">
            Questions? Email rohankelkar2020@gmail.com.
          </p>
        </section>
      </div>
    </main>
  );
}
