"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShareActionsProps {
  url: string;
  labels: {
    copy: string;
    copied: string;
    copyFailed: string;
    share: string;
    shareTitle: string;
  };
}

const subscribe = () => () => {};
// The server cannot know, so it renders without the button; the browser adds it.
const canShare = () => typeof navigator !== "undefined" && typeof navigator.share === "function";

/**
 * Copy-link and, where the browser has it, the system share sheet. The link is
 * passed in as-is and shared as-is: no parameters are added, nothing is sent
 * to us, and nothing is stored.
 */
export function ShareActions({ url, labels }: ShareActionsProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const shareAvailable = useSyncExternalStore(subscribe, canShare, () => false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  async function share() {
    try {
      await navigator.share({ title: labels.shareTitle, url });
    } catch {
      // Closing the share sheet rejects with AbortError; that is not a problem.
    }
  }

  return (
    <div className="flex flex-col gap-2 print:hidden">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={copy}>
          {status === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {labels.copy}
        </Button>
        {shareAvailable ? (
          <Button type="button" variant="outline" onClick={share}>
            <Share2 aria-hidden="true" />
            {labels.share}
          </Button>
        ) : null}
      </div>
      <p role="status" aria-live="polite" className="min-h-6 text-sm text-muted-foreground">
        {status === "copied" ? labels.copied : status === "failed" ? labels.copyFailed : ""}
      </p>
    </div>
  );
}
