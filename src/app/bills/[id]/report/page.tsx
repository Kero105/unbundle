import { Suspense } from "react";
import { ReportSkeleton, ReportView } from "./report-view";
import { routeMetadata } from "@/lib/metadata";

async function ReportById({ params }: Pick<PageProps<"/bills/[id]/report">, "params">) {
  const { id } = await params;
  return <ReportView source={{ kind: "bill", id }} />;
}

export const generateMetadata = () => routeMetadata("report");

export default function ReportPage(props: PageProps<"/bills/[id]/report">) {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <ReportById params={props.params} />
    </Suspense>
  );
}
