import { Suspense } from "react";
import { DEMO_SOURCE } from "@/lib/bills/source";
import { AssistanceSkeleton, AssistanceView } from "@/app/bills/[id]/assistance/assistance-view";

export default function DemoAssistancePage() {
  return (
    <Suspense fallback={<AssistanceSkeleton />}>
      <AssistanceView source={DEMO_SOURCE} />
    </Suspense>
  );
}
