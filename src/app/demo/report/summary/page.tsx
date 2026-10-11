import { Suspense } from "react";
import { DEMO_SOURCE } from "@/lib/bills/source";
import { routeMetadata } from "@/lib/metadata";
import { ReportSummarySkeleton, ReportSummaryView } from "@/app/bills/[id]/report/report-summary-view";

export const generateMetadata = () => routeMetadata("report");

export default function DemoReportSummaryPage() {
  return (
    <Suspense fallback={<ReportSummarySkeleton />}>
      <ReportSummaryView source={DEMO_SOURCE} />
    </Suspense>
  );
}
