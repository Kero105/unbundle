import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  title: string;
  body: string;
  /** Buttons or links, rendered under the text. */
  children?: ReactNode;
  className?: string;
};

/** Calm full-width message block used for runtime errors and "not found". */
export function ErrorState({ title, body, children, className }: ErrorStateProps) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full max-w-2xl flex-1 flex-col items-start justify-center gap-4 px-4 py-16 sm:px-6",
        className,
      )}
    >
      <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
      <p className="text-lg text-muted-foreground">{body}</p>
      {children ? <div className="mt-4 flex flex-wrap gap-3">{children}</div> : null}
    </main>
  );
}

/** Placeholder with the same footprint as ErrorState, shown while its text streams in. */
export function ErrorStateSkeleton() {
  return (
    <main
      aria-busy="true"
      className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-start justify-center gap-4 px-4 py-16 sm:px-6"
    >
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-11 w-40" />
    </main>
  );
}
