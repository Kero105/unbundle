import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { TIMELINE_STEPS, timelineLinks, type TimelineHrefs } from "./timeline-steps";

/**
 * Four plain steps in the order people usually take them. Static copy: no
 * dates or deadlines appear because none is tied to a source here.
 */
export async function Timeline({
  hrefs,
  hasFindings,
}: {
  hrefs: TimelineHrefs;
  hasFindings: boolean;
}) {
  const t = await getTranslations("Report.timeline");
  const links = timelineLinks(hrefs, hasFindings);

  return (
    <section
      aria-labelledby="timeline-title"
      className="flex flex-col gap-4 rounded-xl border bg-card p-6 break-inside-avoid"
    >
      <div className="flex flex-col gap-1">
        <h2 id="timeline-title" className="text-xl font-semibold">
          {t("title")}
        </h2>
        <p className="text-muted-foreground">{t("intro")}</p>
      </div>
      <ol className="flex flex-col gap-4">
        {TIMELINE_STEPS.map((step, index) => {
          const { href, linkKey } = links[step];
          return (
            <li key={step} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary font-heading text-lg font-semibold text-secondary-foreground"
              >
                {index + 1}
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold">{t(`steps.${step}.title`)}</h3>
                <p>{t(`steps.${step}.body`)}</p>
                <p className="print:hidden">
                  <Link
                    href={href}
                    className="font-medium text-primary underline underline-offset-4 hover:no-underline"
                  >
                    {t(`steps.${step}.${linkKey}` as "steps.dispute.link")}
                  </Link>
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
