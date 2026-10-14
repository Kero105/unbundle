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
}: {
  items: readonly LetterItem[];
  generic?: boolean;
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

  return (
    <section
      aria-labelledby="call-script-title"
      className="flex flex-col gap-3 rounded-xl border bg-card p-6 print:hidden"
    >
      <div className="flex flex-col gap-1">
        <h2 id="call-script-title" className="text-xl font-semibold">
          {t("title")}
        </h2>
        <p className="text-muted-foreground">{generic ? t("genericIntro") : t("intro")}</p>
      </div>
      <CopyScript
        text={script}
        labels={{
          copy: t("copy"),
          copied: t("copied"),
          failed: t("copyFailed"),
          textLabel: t("textLabel"),
        }}
      />
    </section>
  );
}
