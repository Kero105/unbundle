import { Suspense } from "react";
import { DEMO_SOURCE } from "@/lib/bills/source";
import { ReviewSkeleton, ReviewView } from "@/app/bills/[id]/review/review-view";
import { routeMetadata } from "@/lib/metadata";

export const generateMetadata = () => routeMetadata("review");

export default function DemoReviewPage() {
  return (
    <Suspense fallback={<ReviewSkeleton />}>
      <ReviewView source={DEMO_SOURCE} />
    </Suspense>
  );
}
