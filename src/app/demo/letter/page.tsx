import { Suspense } from "react";
import { demoSourceFrom } from "../demo-source";
import { LetterSkeleton, LetterView } from "@/app/bills/[id]/letter/letter-view";
import { parseLetterKind } from "@/app/bills/[id]/letter/letter-content";
import { routeMetadata } from "@/lib/metadata";

export const generateMetadata = () => routeMetadata("letter");

async function DemoLetter({ searchParams }: Pick<PageProps<"/demo/letter">, "searchParams">) {
  const [source, query] = await Promise.all([demoSourceFrom(searchParams), searchParams]);
  return <LetterView source={source} initialKind={parseLetterKind(query.type)} />;
}

export default function DemoLetterPage(props: PageProps<"/demo/letter">) {
  return (
    <Suspense fallback={<LetterSkeleton />}>
      <DemoLetter searchParams={props.searchParams} />
    </Suspense>
  );
}
