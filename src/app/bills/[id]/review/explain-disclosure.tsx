"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { explainCodeAction } from "@/app/bills/explain-actions";
import type { ExplainErrorCode } from "@/lib/explain/types";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; text: string }
  | { status: "error"; code: ExplainErrorCode };

/**
 * The answer to "What is this?" for one coded line. The review table mounts it
 * the first time the person opens the question, so a page full of lines makes
 * no calls until they ask. After that it stays mounted (hidden when closed), so
 * reopening does not ask again.
 */
export function ExplainPanel({ id, code, demo }: { id: string; code: string; demo: boolean }) {
  const t = useTranslations("Explain");
  const [state, setState] = useState<State>({ status: "idle" });
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    let cancelled = false;
    setState({ status: "loading" });
    explainCodeAction({ code, demo })
      .then((result) => {
        if (cancelled) return;
        setState(result.ok ? { status: "done", text: result.text } : { status: "error", code: result.error });
        if (!result.ok) requested.current = false;
      })
      .catch(() => {
        if (cancelled) return;
        setState({ status: "error", code: "provider_error" });
        requested.current = false;
      });
    return () => {
      cancelled = true;
      // Strict-mode remounts run the effect twice; let the second run ask.
      requested.current = false;
    };
  }, [code, demo]);

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
    <div id={id} aria-live="polite" className="max-w-prose py-1">
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
  );
}
