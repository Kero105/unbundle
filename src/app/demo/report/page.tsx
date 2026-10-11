import { Suspense } from "react";
import { demoSourceFrom } from "../demo-source";
import { ReportSkeleton, ReportView } from "@/app/bills/[id]/report/report-view";
import { routeMetadata } from "@/lib/metadata";

export const generateMetadata = () => routeMetadata("report");

async function DemoReport({ searchParams }: Pick<PageProps<"/demo/report">, "searchParams">) {
  return <ReportView source={await demoSourceFrom(searchParams)} />;
}

export default function DemoReportPage(props: PageProps<"/demo/report">) {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <DemoReport searchParams={props.searchParams} />
    </Suspense>
  );
}
