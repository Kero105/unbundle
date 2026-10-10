import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Unbundle",
};

export default function Privacy() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 text-lg leading-8 sm:px-6 sm:py-16">
      <Link href="/" className="text-base font-medium text-primary underline underline-offset-4 hover:no-underline">
        &larr; Home
      </Link>
      <h1 className="mt-6 text-3xl font-semibold sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-2 text-base text-muted-foreground">Last updated October 10, 2026</p>

      <div className="mt-8 space-y-8">
        <p>
          Unbundle is a student project built for the Congressional App
          Challenge. It helps people check their medical bills. This page
          explains what information we collect and what we do with it.
        </p>

        <section>
          <h2 className="text-2xl font-semibold">
            What we collect
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>
              Your Google account email and name, so you can sign in.
            </li>
            <li>
              The files you upload: a photo or PDF of your bill and,
              optionally, your insurer&apos;s Explanation of Benefits.
            </li>
            <li>
              The line items, dates, codes and amounts we read from those
              files, and any changes you make to them.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">
            What happens to your uploaded files
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>
              Files are stored in a private Supabase storage bucket, in a
              folder that only your account can read, write or delete.
            </li>
            <li>
              Photos are resized and re-saved as JPEG in your browser before
              they are uploaded, so the copy we store is smaller than the
              original and no longer carries its camera metadata. PDFs are
              uploaded as they are; PDFs over 4 MB are turned away.
            </li>
            <li>
              We check each file&apos;s actual type, size (10 MB) and, for PDFs,
              page count (6) before storing it. Only JPEG, PNG, WebP and PDF
              files are accepted.
            </li>
            <li>
              We use your files only to read your bill. We do not use them to
              train models or for advertising.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">
            How Anthropic is involved
          </h2>
          <p className="mt-2">
            To read the text on your bill, our server sends your uploaded
            files to Claude, an AI model made by Anthropic, through
            Anthropic&apos;s API. Anthropic processes the images to read them
            and returns the line items. The model only reads what is printed;
            it does not decide whether a charge is wrong. Those checks are run
            by fixed rules in our own code. Anthropic&apos;s published commercial terms say it may not
            train its models on customer content sent through its services,
            and its API data policy says that, by default, it automatically
            deletes API inputs and outputs from its systems within 30 days,
            except where content is flagged for violating its usage policy or
            the law requires it to keep it longer. Those are Anthropic&apos;s
            terms, not ours, and they can change; see{" "}
            <a
              href="https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data"
              className="font-medium text-primary underline underline-offset-4 hover:no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Anthropic&apos;s retention policy
            </a>
            . Our API key is kept on the server and never sent to your browser.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">
            Where it is kept
          </h2>
          <p className="mt-2">
            Your bills, line items and files are stored in Supabase, and access
            is limited to your account by row-level security. We don&apos;t put
            bill contents in our logs.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">
            What we don&apos;t do
          </h2>
          <p className="mt-2">
            We never sell your information. We don&apos;t share it with anyone,
            except sending your uploaded files to Anthropic so they can be read
            as described above.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">
            Deleting your data
          </h2>
          <p className="mt-2">
            You can delete any bill yourself at any time, from your dashboard
            or from the bill&apos;s review page using &ldquo;Delete bill.&rdquo;
            That permanently removes the bill, the line items we read from it,
            and the uploaded files from storage. Deleting a bill does not
            recall copies Anthropic may keep under its own retention policy.
            To delete your whole account and everything in it, email us at the
            address below.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">
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
