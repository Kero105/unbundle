import { Suspense } from "react";
import { demoSourceFrom } from "../demo-source";
import { ReviewSkeleton, ReviewView } from "@/app/bills/[id]/review/review-view";
import { routeMetadata } from "@/lib/metadata";

export const generateMetadata = () => routeMetadata("review");

async function DemoReview({ searchParams }: Pick<PageProps<"/demo/review">, "searchParams">) {
  return <ReviewView source={await demoSourceFrom(searchParams)} />;
}

export default function DemoReviewPage(props: PageProps<"/demo/review">) {
  return (
    <Suspense fallback={<ReviewSkeleton />}>
      <DemoReview searchParams={props.searchParams} />
    </Suspense>
  );
}
