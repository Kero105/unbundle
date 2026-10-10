import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

const STEPS = ["review", "findings", "letter"] as const;

/** Progress indicator for the bill flow. `current` is the active step. */
export async function BillSteps({ current }: { current: (typeof STEPS)[number] }) {
  const t = await getTranslations("Review.steps");

  return (
    <nav aria-label={t("label")}>
      <ol className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {STEPS.map((step, index) => {
          const isCurrent = step === current;
          return (
            <li
              key={step}
              aria-current={isCurrent ? "step" : undefined}
              className="flex items-center gap-2"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border text-sm font-semibold",
                  isCurrent
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground",
                )}
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  "font-medium",
                  isCurrent ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {t(step)}
                {isCurrent ? <span className="sr-only"> ({t("current")})</span> : null}
              </span>
              {index < STEPS.length - 1 ? (
                <span aria-hidden="true" className="ml-2 h-px w-8 bg-border sm:w-12" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
