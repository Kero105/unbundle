import { Suspense } from "react";
import { demoSourceFrom } from "../demo-source";
import { AssistanceSkeleton, AssistanceView } from "@/app/bills/[id]/assistance/assistance-view";
import { routeMetadata } from "@/lib/metadata";

export const generateMetadata = () => routeMetadata("assistance");

async function DemoAssistance({ searchParams }: Pick<PageProps<"/demo/assistance">, "searchParams">) {
  return <AssistanceView source={await demoSourceFrom(searchParams)} />;
}

export default function DemoAssistancePage(props: PageProps<"/demo/assistance">) {
  return (
    <Suspense fallback={<AssistanceSkeleton />}>
      <DemoAssistance searchParams={props.searchParams} />
    </Suspense>
  );
}
