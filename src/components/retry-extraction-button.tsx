"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { errorMessageKey } from "@/lib/bills/error-messages";

/** Re-runs reading for a bill whose files are already uploaded. */
export function RetryExtractionButton({ billId }: { billId: string }) {
  const t = useTranslations("Dashboard");
  const te = useTranslations("Upload.errors");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ billId }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (response.ok || body.error === "already_done") {
        router.push(`/bills/${billId}/review`);
        return;
      }
      setError(te(errorMessageKey(body.error)));
    } catch {
      setError(te("network"));
    }
    setPending(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" size="sm" disabled={pending} onClick={retry}>
        {pending ? <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : null}
        {pending ? t("retryPending") : t("retry")}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
