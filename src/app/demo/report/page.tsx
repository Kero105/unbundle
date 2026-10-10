import { Suspense } from "react";
import { DEMO_SOURCE } from "@/lib/bills/source";
import { ReportSkeleton, ReportView } from "@/app/bills/[id]/report/report-view";
import { routeMetadata } from "@/lib/metadata";

export const generateMetadata = () => routeMetadata("report");

export default function DemoReportPage() {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <ReportView source={DEMO_SOURCE} />
    </Suspense>
  );
}
