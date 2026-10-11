"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CircleHelp, Loader2 } from "lucide-react";
import { explainCodeAction } from "@/app/bills/explain-actions";
import type { ExplainErrorCode } from "@/lib/explain/types";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; text: string }
  | { status: "error"; code: ExplainErrorCode };

/**
 * "What is this?" for one coded line. Loads on first open, never on render,
 * so a page full of lines makes no calls until the user asks.
 */
export function ExplainDisclosure({
  code,
  demo,
  row,
}: {
  code: string;
  demo: boolean;
  row: number;
}) {
  const t = useTranslations("Explain");
  const [state, setState] = useState<State>({ status: "idle" });
  const requested = useRef(false);

  async function load() {
    if (requested.current) return;
    requested.current = true;
    setState({ status: "loading" });
    try {
      const result = await explainCodeAction({ code, demo });
      setState(result.ok ? { status: "done", text: result.text } : { status: "error", code: result.error });
      if (!result.ok) requested.current = false;
    } catch {
      setState({ status: "error", code: "provider_error" });
      requested.current = false;
    }
  }

  const errorKey =
    state.status === "error"
      ? state.code === "rate_limited"
        ? "rateLimited"
        : state.code === "unauthenticated"
          ? "signedOut"
          : state.code === "disabled" || state.code === "invalid_mode" || state.code === "missing_api_key"
            ? "unavailable"
            : "failed"
      : null;

  return (
    <details
      className="group rounded-lg border bg-card/60 px-3 py-1"
      onToggle={(event) => {
        if ((event.currentTarget as HTMLDetailsElement).open) void load();
      }}
    >
      <summary
        aria-label={t("summaryRow", { row })}
        className="flex min-h-11 cursor-pointer items-center gap-2 font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
      >
        <CircleHelp aria-hidden="true" className="size-4 text-muted-foreground" />
        {t("summary")}
      </summary>
      <div aria-live="polite" className="pb-3">
        {state.status === "loading" ? (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
            {t("loading")}
          </p>
        ) : null}
        {state.status === "done" ? (
          <>
            <p>{state.text}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("disclaimer")}</p>
          </>
        ) : null}
        {errorKey ? (
          <p role="alert" className="text-warning-foreground">
            {t(`errors.${errorKey}`)}
          </p>
        ) : null}
      </div>
    </details>
  );
}
