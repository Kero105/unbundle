import Link from "next/link";
import { getTranslations } from "next-intl/server";

const STEPS = ["call", "itemized", "assistance", "collections", "writing", "insurer"] as const;

/** Calm, ordered checklist of what to do after reading the report. */
export async function NextSteps({ letterHref }: { letterHref: string }) {
  const t = await getTranslations("Report.nextSteps");
  return (
    <section
      aria-labelledby="next-steps-title"
      className="flex flex-col gap-4 rounded-xl border bg-card p-6 break-inside-avoid"
    >
      <div className="flex flex-col gap-1">
        <h2 id="next-steps-title" className="text-xl font-semibold">
          {t("title")}
        </h2>
        <p className="text-muted-foreground">{t("intro")}</p>
      </div>
      <ol className="flex flex-col gap-3">
        {STEPS.map((step, index) => (
          <li key={step} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border-2 border-foreground/60 text-sm font-semibold"
            >
              {index + 1}
            </span>
            <p>
              {t(`items.${step}`)}
              {step === "itemized" || step === "writing" ? (
                <>
                  {" "}
                  <Link href={letterHref} className="font-medium underline underline-offset-4 print:hidden">
                    {t("letterLink")}
                  </Link>
                </>
              ) : null}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
