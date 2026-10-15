import { ChevronDown } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CopyScript } from "@/components/copy-script";
import type { LetterItem } from "@/app/bills/[id]/letter/letter-model";
import { buildCallScript } from "@/lib/script/build-call-script";
import { formatCents } from "@/lib/money";

/**
 * Phone script for the billing office, built at render time from findings that
 * already exist (or the generic version when there are none). Nothing is stored.
 */
export async function CallScript({
  items,
  generic = false,
  collapsible = false,
}: {
  items: readonly LetterItem[];
  generic?: boolean;
  /** Start closed behind its heading, so a long page stays short. */
  collapsible?: boolean;
}) {
  const t = await getTranslations("CallScript");
  const script = buildCallScript(
    items,
    {
      opening: t("opening"),
      closing: t("closing"),
      generic: t("generic"),
      line: (v) => t("line", v),
      noCode: t("noCode"),
      noDate: t("noDate"),
      ask: (reason) => t(`ask.${reason}`),
      lead: { firm: t("lead.firm"), soft: t("lead.soft") },
      item: (v) => t("item", v),
    },
    formatCents,
  );

  const intro = <p className="text-muted-foreground">{generic ? t("genericIntro") : t("intro")}</p>;
  const copy = (
    <CopyScript
      text={script}
      labels={{
        copy: t("copy"),
        copied: t("copied"),
        failed: t("copyFailed"),
        textLabel: t("textLabel"),
      }}
    />
  );

  if (collapsible) {
    // The heading sits inside the summary, so the region keeps its name and the
    // whole title is the control. Closed by default; print hides it either way.
    return (
      <section aria-labelledby="call-script-title" className="print:hidden">
        <details className="group border-t pt-4">
          <summary className="flex min-h-11 cursor-pointer items-center focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring">
            <h2 id="call-script-title" className="text-lead font-semibold">
              {t("title")}
            </h2>
            <ChevronDown
              aria-hidden="true"
              className="ml-2 size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
            />
          </summary>
          <div className="mt-2 flex flex-col gap-3">
            {intro}
            {copy}
          </div>
        </details>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="call-script-title"
      className="flex flex-col gap-3 rounded-xl border bg-card p-6 print:hidden"
    >
      <div className="flex flex-col gap-1">
        <h2 id="call-script-title" className="text-xl font-semibold">
          {t("title")}
        </h2>
        {intro}
      </div>
      {copy}
    </section>
  );
}
