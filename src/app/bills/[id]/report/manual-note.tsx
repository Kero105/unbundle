import { Info } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { readEntryMethod } from "@/lib/bills/entry-method";
import type { BillSource } from "@/lib/bills/source";
import { createClient } from "@/lib/supabase/server";

/**
 * For a bill the person typed in: says the checks used only what they typed.
 * Renders nothing for an uploaded bill or the sample.
 */
export async function ManualEntryNote({ source }: { source: BillSource }) {
  if (source.kind !== "bill") return null;
  if ((await readEntryMethod(await createClient(), source.id)) !== "manual") return null;
  const t = await getTranslations("Report.manual");
  return (
    <p role="note" className="flex max-w-2xl items-start gap-3 rounded-lg border bg-muted p-4 text-base">
      <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
      {t("note")}
    </p>
  );
}
