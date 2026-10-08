import Link from "next/link";
import { SignInButton } from "@/components/sign-in-button";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center gap-8 px-16 py-32 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Unbundle</h1>
        <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Upload a medical bill and find out what you were charged for.
        </p>
        <SignInButton />
      </main>
      <footer className="flex gap-6 py-6 text-sm text-zinc-500">
        <Link href="/privacy" className="hover:underline">
          Privacy
        </Link>
        <Link href="/terms" className="hover:underline">
          Terms
        </Link>
      </footer>
    </div>
  );
}
