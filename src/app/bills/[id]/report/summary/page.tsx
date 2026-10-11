import { Suspense } from "react";
import { routeMetadata } from "@/lib/metadata";
import { ReportSummarySkeleton, ReportSummaryView } from "../report-summary-view";

export const generateMetadata = () => routeMetadata("report");

async function SummaryById({ params }: Pick<PageProps<"/bills/[id]/report/summary">, "params">) {
  const { id } = await params;
  return <ReportSummaryView source={{ kind: "bill", id }} />;
}

export default function ReportSummaryPage(props: PageProps<"/bills/[id]/report/summary">) {
  return (
    <Suspense fallback={<ReportSummarySkeleton />}>
      <SummaryById params={props.params} />
    </Suspense>
  );
}
