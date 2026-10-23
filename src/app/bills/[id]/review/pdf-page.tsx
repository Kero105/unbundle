"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

/** Pixel width a page is drawn at; the canvas is then scaled by CSS, so zooming stays sharp up to about 2x. */
const RENDER_WIDTH = 1600;

/**
 * Draws one page of the user's PDF bill into a canvas, in the browser, so a
 * row's box can be highlighted on it the same way as on a photo. The file is
 * fetched from the short-lived signed URL and never leaves the browser.
 */
export function PdfPage({
  url,
  page,
  label,
  onPageCount,
  onRendered,
  onError,
}: {
  url: string;
  page: number;
  label: string;
  onPageCount: (count: number) => void;
  onRendered: () => void;
  onError: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  // Callbacks change identity on every parent render; keep the latest without re-running effects.
  const callbacks = useRef({ onPageCount, onRendered, onError });
  useEffect(() => {
    callbacks.current = { onPageCount, onRendered, onError };
  });

  useEffect(() => {
    let cancelled = false;
    let loaded: PDFDocumentProxy | null = null;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        loaded = await pdfjs.getDocument({ url, isEvalSupported: false }).promise;
        if (cancelled) {
          void loaded.destroy();
          return;
        }
        setDoc(loaded);
        callbacks.current.onPageCount(loaded.numPages);
      } catch {
        if (!cancelled) callbacks.current.onError();
      }
    })();
    return () => {
      cancelled = true;
      if (loaded) void loaded.destroy();
    };
  }, [url]);

  useEffect(() => {
    if (!doc || !canvas.current) return;
    const target = canvas.current;
    let task: { cancel: () => void } | null = null;
    let cancelled = false;
    (async () => {
      try {
        const pdfPage = await doc.getPage(Math.min(Math.max(1, page), doc.numPages));
        if (cancelled) return;
        const base = pdfPage.getViewport({ scale: 1 });
        const viewport = pdfPage.getViewport({ scale: RENDER_WIDTH / base.width });
        const context = target.getContext("2d");
        if (!context) throw new Error("no-canvas");
        target.width = Math.floor(viewport.width);
        target.height = Math.floor(viewport.height);
        const render = pdfPage.render({ canvasContext: context, viewport });
        task = render;
        await render.promise;
        if (!cancelled) callbacks.current.onRendered();
      } catch (error) {
        if (!cancelled && (error as { name?: string })?.name !== "RenderingCancelledException") {
          callbacks.current.onError();
        }
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, page]);

  return (
    <canvas
      ref={canvas}
      role="img"
      aria-label={label}
      className="block h-auto w-full bg-white select-none"
    />
  );
}
