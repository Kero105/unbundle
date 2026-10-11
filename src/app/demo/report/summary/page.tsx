import { Suspense } from "react";
import { demoSourceFrom } from "../../demo-source";
import { routeMetadata } from "@/lib/metadata";
import { ReportSummarySkeleton, ReportSummaryView } from "@/app/bills/[id]/report/report-summary-view";

export const generateMetadata = () => routeMetadata("report");

async function DemoReportSummary({
  searchParams,
}: Pick<PageProps<"/demo/report/summary">, "searchParams">) {
  return <ReportSummaryView source={await demoSourceFrom(searchParams)} />;
}

export default function DemoReportSummaryPage(props: PageProps<"/demo/report/summary">) {
  return (
    <Suspense fallback={<ReportSummarySkeleton />}>
      <DemoReportSummary searchParams={props.searchParams} />
    </Suspense>
  );
}
