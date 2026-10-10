import { Suspense } from "react";
import { ReviewSkeleton, ReviewView } from "./review-view";
import { routeMetadata } from "@/lib/metadata";

export const generateMetadata = () => routeMetadata("review");

export default function ReviewPage(props: PageProps<"/bills/[id]/review">) {
  return (
    <Suspense fallback={<ReviewSkeleton />}>
      <ReviewById params={props.params} />
    </Suspense>
  );
}

async function ReviewById({ params }: Pick<PageProps<"/bills/[id]/review">, "params">) {
  const { id } = await params;
  return <ReviewView source={{ kind: "bill", id }} />;
}
