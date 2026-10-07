import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use | Unbundle",
};

export default function Terms() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16 font-sans text-zinc-800 dark:text-zinc-200">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        &larr; Home
      </Link>
      <h1 className="mt-6 text-3xl font-semibold text-black dark:text-zinc-50">
        Terms of Use
      </h1>
      <p className="mt-2 text-sm text-zinc-500">Last updated October 7, 2026</p>

      <div className="mt-8 space-y-6 leading-7">
        <p>
          Unbundle is a student project built for the Congressional App
          Challenge. By using it, you agree to these terms.
        </p>

        <section>
          <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
            Educational use only
          </h2>
          <p className="mt-2">
            Unbundle is an educational tool. It is not legal, medical, or
            financial advice. Before acting on anything it shows you, check
            with your provider, your insurer, or a qualified professional.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
            No guarantees
          </h2>
          <p className="mt-2">
            Unbundle is provided &ldquo;as is.&rdquo; It can make mistakes,
            including misreading a bill or missing a problem. We don&apos;t
            guarantee that it is accurate, complete, or always available, and
            we aren&apos;t responsible for decisions you make based on it.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
            Privacy
          </h2>
          <p className="mt-2">
            See our{" "}
            <Link href="/privacy" className="underline">
              Privacy Policy
            </Link>{" "}
            for how we handle your information.
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
