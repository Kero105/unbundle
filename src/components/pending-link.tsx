"use client";

import Link, { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Must render inside a <Link>; swaps the label and shows a spinner while navigating. */
function LinkLabel({ pendingLabel, children }: { pendingLabel: string; children: ReactNode }) {
  const { pending } = useLinkStatus();
  return (
    <>
      <Loader2
        aria-hidden="true"
        className={cn("animate-spin motion-reduce:animate-none", !pending && "hidden")}
      />
      <span role={pending ? "status" : undefined}>{pending ? pendingLabel : children}</span>
    </>
  );
}

type PendingLinkProps = Omit<ComponentProps<typeof Link>, "children"> & {
  /** Shown (and announced) while the navigation is in flight. */
  pendingLabel: string;
  children: ReactNode;
};

/** A Link that acknowledges the click when the destination is slow to render. */
export function PendingLink({ pendingLabel, children, ...props }: PendingLinkProps) {
  return (
    <Link {...props}>
      <LinkLabel pendingLabel={pendingLabel}>{children}</LinkLabel>
    </Link>
  );
}
