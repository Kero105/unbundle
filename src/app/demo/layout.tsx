import { Suspense } from "react";
import { DemoBanner } from "@/components/demo-banner";
import { DemoWalkthrough } from "@/components/demo-walkthrough";

// The banner reads the request locale, so it streams in behind Suspense and
// the pages below keep their static shells.
export default function DemoLayout({ children }: LayoutProps<"/demo">) {
  return (
    <>
      <Suspense fallback={null}>
        <DemoBanner />
      </Suspense>
      <Suspense fallback={null}>
        <DemoWalkthrough />
      </Suspense>
      {children}
    </>
  );
}
