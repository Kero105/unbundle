import { Suspense } from "react";
import { connection } from "next/server";
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
  // The entry-method read and the signed file URL go through the Supabase
  // session, which reads the clock; opt out of prerendering first.
  await connection();
  const { id } = await params;
  return <ReviewView source={{ kind: "bill", id }} />;
}
