import { Suspense } from "react";
import { LetterSkeleton, LetterView } from "./letter-view";
import { parseLetterKind } from "./letter-content";
import { routeMetadata } from "@/lib/metadata";

async function LetterById({
  params,
  searchParams,
}: Pick<PageProps<"/bills/[id]/letter">, "params" | "searchParams">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <LetterView source={{ kind: "bill", id }} initialKind={parseLetterKind(query.type)} />;
}

export const generateMetadata = () => routeMetadata("letter");

export default function LetterPage(props: PageProps<"/bills/[id]/letter">) {
  return (
    <Suspense fallback={<LetterSkeleton />}>
      <LetterById params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
