import { Suspense } from "react";
import { DEMO_SOURCE } from "@/lib/bills/source";
import { LetterSkeleton, LetterView } from "@/app/bills/[id]/letter/letter-view";
import { parseLetterKind } from "@/app/bills/[id]/letter/letter-content";
import { routeMetadata } from "@/lib/metadata";

export const generateMetadata = () => routeMetadata("letter");

async function DemoLetter({ searchParams }: Pick<PageProps<"/demo/letter">, "searchParams">) {
  const query = await searchParams;
  return <LetterView source={DEMO_SOURCE} initialKind={parseLetterKind(query.type)} />;
}

export default function DemoLetterPage(props: PageProps<"/demo/letter">) {
  return (
    <Suspense fallback={<LetterSkeleton />}>
      <DemoLetter searchParams={props.searchParams} />
    </Suspense>
  );
}
