import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ALSO_ASK, TIMELINE_STEPS, timelineLinks, type TimelineHrefs } from "./timeline-steps";

/**
 * One section for what to do after reading the report: four plain steps in the
 * order people usually take them, then a few things worth asking along the
 * way. Static copy: no dates or deadlines appear because none is tied to a
 * source here.
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
      className="flex flex-col gap-4 border-t pt-8 break-inside-avoid"
    >
      <div className="flex flex-col gap-1">
        <h2 id="timeline-title" className="text-lead font-semibold">
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
                <h3 className="text-body font-semibold">{t(`steps.${step}.title`)}</h3>
                <p>{t(`steps.${step}.body`)}</p>
                <p className="print:hidden">
                  <Link
                    href={href}
                    className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4 hover:no-underline"
                  >
                    {t(`steps.${step}.${linkKey}` as "steps.dispute.link")}
                  </Link>
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col gap-2 border-t pt-4">
        <h3 className="text-body font-semibold">{t("alsoTitle")}</h3>
        <ul className="list-disc space-y-2 pl-6">
          {ALSO_ASK.map((key) => (
            <li key={key}>{t(`also.${key}`)}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
