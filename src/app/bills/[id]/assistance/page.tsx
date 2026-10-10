import { Suspense } from "react";
import { AssistanceSkeleton, AssistanceView } from "./assistance-view";

async function AssistanceById({ params }: Pick<PageProps<"/bills/[id]/assistance">, "params">) {
  const { id } = await params;
  return <AssistanceView source={{ kind: "bill", id }} />;
}

export default function AssistancePage(props: PageProps<"/bills/[id]/assistance">) {
  return (
    <Suspense fallback={<AssistanceSkeleton />}>
      <AssistanceById params={props.params} />
    </Suspense>
  );
}
