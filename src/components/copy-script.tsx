"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CopyScriptProps {
  text: string;
  labels: { copy: string; copied: string; failed: string; textLabel: string };
}

/**
 * Shows the script as read-only text with a copy button. The text is only held
 * in this render: no storage, no network, no logging.
 */
export function CopyScript({ text, labels }: CopyScriptProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        readOnly
        aria-label={labels.textLabel}
        value={text}
        rows={Math.min(24, text.split("\n").length + 1)}
        className="font-mono text-[0.9375rem]"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={copy}>
          {status === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {labels.copy}
        </Button>
        <span role="status" aria-live="polite" className="text-sm text-muted-foreground">
          {status === "copied" ? labels.copied : status === "failed" ? labels.failed : ""}
        </span>
      </div>
    </div>
  );
}
