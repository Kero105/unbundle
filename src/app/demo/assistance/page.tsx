import { Suspense } from "react";
import { DEMO_SOURCE } from "@/lib/bills/source";
import { AssistanceSkeleton, AssistanceView } from "@/app/bills/[id]/assistance/assistance-view";
import { routeMetadata } from "@/lib/metadata";

export const generateMetadata = () => routeMetadata("assistance");

export default function DemoAssistancePage() {
  return (
    <Suspense fallback={<AssistanceSkeleton />}>
      <AssistanceView source={DEMO_SOURCE} />
    </Suspense>
  );
}
