import { getLocale, getTranslations } from "next-intl/server";
import { DemoWalkthroughClient, type WalkthroughLabels } from "@/components/demo-walkthrough-client";
import { TIP_IDS } from "@/lib/demo/walkthrough";

/** Resolves the copy for the request locale, then hands plain strings to the client. */
export async function DemoWalkthrough() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Demo.walkthrough")]);
  const labels: WalkthroughLabels = {
    label: t("label"),
    // The client fills in the numbers; the placeholders are kept literal here.
    step: t.raw("step") as string,
    show: t("show"),
    dismiss: t("dismiss"),
    pointed: t("pointed"),
    tips: Object.fromEntries(
      TIP_IDS.map((id) => [id, { title: t(`tips.${id}.title`), body: t(`tips.${id}.body`) }]),
    ) as WalkthroughLabels["tips"],
  };
  return (
    <div lang={locale}>
      <DemoWalkthroughClient labels={labels} />
    </div>
  );
}
