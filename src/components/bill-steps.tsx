import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

const STEPS = ["review", "findings", "letter"] as const;
/** Optional extra step: shown after the required ones, never a gate. */
const OPTIONAL_STEPS = ["assistance"] as const;
const ALL_STEPS = [...STEPS, ...OPTIONAL_STEPS] as const;
type Step = (typeof ALL_STEPS)[number];

/** Progress indicator for the bill flow. `current` is the active step. */
export async function BillSteps({ current }: { current: Step }) {
  const t = await getTranslations("Review.steps");

  return (
    <nav aria-label={t("label")}>
      <ol className="flex flex-nowrap items-center gap-x-2 sm:gap-x-3">
        {ALL_STEPS.map((step, index) => {
          const isCurrent = step === current;
          const isOptional = (OPTIONAL_STEPS as readonly Step[]).includes(step);
          return (
            <li
              key={step}
              aria-current={isCurrent ? "step" : undefined}
              className="flex min-w-0 items-center gap-2"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                  isCurrent
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground",
                  isOptional && !isCurrent && "border-dashed",
                )}
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  "min-w-0 text-sm font-medium leading-tight sm:text-base sm:whitespace-nowrap",
                  isCurrent ? "text-foreground" : "text-muted-foreground max-sm:sr-only",
                )}
              >
                {t(step)}
                {isOptional ? (
                  <span className="text-sm font-normal text-muted-foreground max-sm:block">
                    {" "}
                    ({t("optional")})
                  </span>
                ) : null}
                {isCurrent ? <span className="sr-only"> ({t("current")})</span> : null}
              </span>
              {index < ALL_STEPS.length - 1 ? (
                <span aria-hidden="true" className="h-px w-3 shrink-0 bg-border sm:w-8" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
