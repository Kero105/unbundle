import { Suspense } from "react";
import { LetterSkeleton, LetterView } from "./letter-view";

async function LetterById({ params }: Pick<PageProps<"/bills/[id]/letter">, "params">) {
  const { id } = await params;
  return <LetterView source={{ kind: "bill", id }} />;
}

export default function LetterPage(props: PageProps<"/bills/[id]/letter">) {
  return (
    <Suspense fallback={<LetterSkeleton />}>
      <LetterById params={props.params} />
    </Suspense>
  );
}
