import { Suspense } from "react";
import { DEMO_SOURCE } from "@/lib/bills/source";
import { ReportSkeleton, ReportView } from "@/app/bills/[id]/report/report-view";

export default function DemoReportPage() {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <ReportView source={DEMO_SOURCE} />
    </Suspense>
  );
}
