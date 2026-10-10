import { Suspense } from "react";
import { DEMO_SOURCE } from "@/lib/bills/source";
import { LetterSkeleton, LetterView } from "@/app/bills/[id]/letter/letter-view";
import { routeMetadata } from "@/lib/metadata";

export const generateMetadata = () => routeMetadata("letter");

export default function DemoLetterPage() {
  return (
    <Suspense fallback={<LetterSkeleton />}>
      <LetterView source={DEMO_SOURCE} />
    </Suspense>
  );
}
