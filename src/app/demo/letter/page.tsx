import { Suspense } from "react";
import { DEMO_SOURCE } from "@/lib/bills/source";
import { LetterSkeleton, LetterView } from "@/app/bills/[id]/letter/letter-view";

export default function DemoLetterPage() {
  return (
    <Suspense fallback={<LetterSkeleton />}>
      <LetterView source={DEMO_SOURCE} />
    </Suspense>
  );
}
