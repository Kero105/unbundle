import { getTranslations } from "next-intl/server";
import { ReminderDownload } from "@/components/reminder-download";

/** Server wrapper: resolves the copy once, then hands plain strings to the client. */
export async function Reminders({ mode }: { mode: "followUp" | "gfe" }) {
  const t = await getTranslations("Reminders");
  const base = {
    invalidDate: t("invalidDate"),
  };
  const labels =
    mode === "gfe"
      ? {
          ...base,
          heading: t("gfe.heading"),
          dateLabel: t("gfe.dateLabel"),
          download: t("gfe.download"),
          summary: t("gfe.summary"),
          description: t("gfe.description"),
          note: t("gfe.note"),
        }
      : {
          ...base,
          heading: t("followUp.heading"),
          dateLabel: t("followUp.dateLabel"),
          download: t("followUp.download"),
          summary: t("followUp.summary"),
          description: t("followUp.description"),
        };

  return (
    <div className="flex flex-col gap-2 print:hidden">
      <ReminderDownload mode={mode} labels={labels} />
      <p className="text-sm text-muted-foreground">
        {t("privacy")} {t("contents")}
      </p>
    </div>
  );
}
