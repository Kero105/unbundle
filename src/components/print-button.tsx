"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Opens the browser's print dialog (which also offers "Save as PDF"). Closed
 * <details> hide their content when printed, so every `details` on the page is
 * opened for the print and put back afterwards. This covers Ctrl/Cmd+P too.
 * Nothing leaves the browser.
 */
export function PrintButton({ label, variant = "default" }: { label: string; variant?: "default" | "outline" | "secondary" }) {
  useEffect(() => {
    const closed = new Set<HTMLDetailsElement>();
    const open = () => {
      document.querySelectorAll("details").forEach((el) => {
        if (!el.open) {
          el.open = true;
          closed.add(el);
        }
      });
    };
    const restore = () => {
      closed.forEach((el) => {
        el.open = false;
      });
      closed.clear();
    };
    window.addEventListener("beforeprint", open);
    window.addEventListener("afterprint", restore);
    return () => {
      window.removeEventListener("beforeprint", open);
      window.removeEventListener("afterprint", restore);
    };
  }, []);

  return (
    <Button type="button" variant={variant} onClick={() => window.print()} className="print:hidden">
      <Printer aria-hidden="true" />
      {label}
    </Button>
  );
}
