"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { PendingLink } from "@/components/pending-link";
import { cn } from "@/lib/utils";
import { DEFAULT_DEMO_SCENARIO, DEMO_SCENARIOS, type DemoScenario } from "@/lib/demo/scenarios";

/**
 * Radio group of sample bills plus one start link. Native radios give arrow-key
 * navigation and a single tab stop for free; the cards stack on phones.
 */
export function ScenarioPicker() {
  const t = useTranslations("Demo.intro");
  const [scenario, setScenario] = useState<DemoScenario>(DEFAULT_DEMO_SCENARIO);
  const name = useId();
  const href =
    scenario === DEFAULT_DEMO_SCENARIO ? "/demo/review" : `/demo/review?scenario=${scenario}`;

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-lg font-semibold">{t("scenarios.legend")}</legend>
        {DEMO_SCENARIOS.map((id) => {
          const checked = id === scenario;
          return (
            <label
              key={id}
              className={cn(
                "flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border bg-card p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                checked ? "border-primary ring-2 ring-primary" : "hover:bg-muted/50",
              )}
            >
              <input
                type="radio"
                name={name}
                value={id}
                checked={checked}
                onChange={() => setScenario(id)}
                className="mt-1 size-5 shrink-0 accent-primary"
              />
              <span className="flex flex-col gap-1">
                <span className="font-semibold">{t(`scenarios.items.${id}.title`)}</span>
                <span className="text-muted-foreground">{t(`scenarios.items.${id}.description`)}</span>
              </span>
            </label>
          );
        })}
      </fieldset>
      <div>
        <PendingLink
          href={href}
          className={buttonVariants({ size: "lg" })}
          pendingLabel={t("startPending")}
        >
          {t("start")}
        </PendingLink>
      </div>
    </div>
  );
}
