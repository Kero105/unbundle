"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, FileText, Minus, Plus, RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { boxAppliesToPage, boxToCss, clampZoom, ZOOM_MIN, ZOOM_STEP } from "@/lib/bills/source-image";
import { formatCents } from "@/lib/money";
import type { SourceFile } from "@/lib/bills/source-file";
import type { ExtractedBill, LineItem } from "@/lib/types";

export type PanelSource = SourceFile | { kind: "demo" };

export type SelectedRow = {
  id: string;
  /** 1-based position in the table, for the alt text and the note. */
  row: number;
  sourcePage: number;
  sourceBox: LineItem["sourceBox"];
};

const PAGE_ASPECT = "aspect-[8.5/11]";

/** A clearly fictional bill drawn from the sample data, so highlights line up by construction. */
function SyntheticBillPage({ bill, page }: { bill: ExtractedBill; page: number }) {
  const t = useTranslations("Review.source.demo");
  const rows = bill.lineItems.filter((item) => item.sourcePage === page && item.sourceBox);
  return (
    <div
      className={`relative w-full ${PAGE_ASPECT} overflow-hidden bg-white text-[0.6rem] leading-tight text-neutral-900 sm:text-[0.7rem]`}
    >
      <div className="absolute inset-x-[5%] top-[3%]">
        <p className="text-[0.9em] font-bold tracking-wide">{bill.providerName}</p>
        <p className="mt-[0.4em] text-[0.8em] text-neutral-600">{t("statement")}</p>
      </div>
      {page === 1 ? (
        <div className="absolute inset-x-[5%] top-[12%] flex justify-between text-[0.8em] text-neutral-600">
          <span>{t("patient")}</span>
          <span>{t("account")}</span>
        </div>
      ) : null}
      <div className="absolute inset-x-[5%] top-[21%] flex justify-between border-b border-neutral-400 pb-[0.2em] text-[0.75em] font-semibold uppercase text-neutral-600">
        <span>{t("columnService")}</span>
        <span>{t("columnCharge")}</span>
      </div>
      {rows.map((item) => {
        const css = boxToCss(item.sourceBox);
        if (!css) return null;
        return (
          <div
            key={item.id}
            style={{ top: css.top, left: css.left, width: css.width, height: css.height }}
            className="absolute flex items-center justify-between gap-2 border-b border-neutral-200 px-[0.4em]"
          >
            <span className="truncate">
              {item.code ? `${item.code}  ` : ""}
              {item.descriptionRaw}
            </span>
            <span className="tabular-nums">{formatCents(item.chargeCents)}</span>
          </div>
        );
      })}
      <p className="absolute inset-x-0 bottom-[2%] text-center text-[0.8em] font-semibold tracking-widest text-neutral-500">
        {t("watermark")}
      </p>
    </div>
  );
}

export function SourcePanel({
  source,
  bill,
  selected,
  idPrefix,
  manual = false,
}: {
  source: PanelSource;
  bill: ExtractedBill;
  selected: SelectedRow | null;
  idPrefix: string;
  /** Rows were typed in, so none has a position on the file. */
  manual?: boolean;
}) {
  const t = useTranslations("Review.source");
  const regionId = useId();
  const [zoom, setZoom] = useState(ZOOM_MIN);
  const [page, setPage] = useState(1);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  // Counts image loads. The image arrives after the click when the panel was
  // closed, so the scroll to the highlight has to run again once it has a height.
  const [imageLoads, setImageLoads] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const highlight = useRef<HTMLDivElement>(null);

  const pageCount =
    source.kind === "demo"
      ? Math.max(1, ...bill.lineItems.map((i) => i.sourcePage))
      : 1;

  // Follow the selected row to its page (adjusting state during render).
  if (selected && selected.id !== lastSelectedId) {
    setLastSelectedId(selected.id);
    if (source.kind === "demo" && selected.sourcePage >= 1 && selected.sourcePage <= pageCount) {
      setPage(selected.sourcePage);
    }
  }

  const css =
    selected && boxAppliesToPage(selected.sourcePage, page, pageCount) ? boxToCss(selected.sourceBox) : null;
  // Whether the original can be drawn here at all. A PDF opens in its own tab
  // and a missing or broken image has nothing to draw on, so nothing is
  // highlighted for any row, even one that has a box.
  const canHighlight =
    source.kind === "demo" || (source.kind === "image" && !imageFailed);
  const shown = canHighlight && css !== null;
  const noteKey = manual ? "noBoxManual" : canHighlight ? "noBox" : "noHighlight";
  // The row-specific message goes first, above the image, so it is seen even
  // when the highlight is below the fold of the scroll area.
  const rowMessage =
    selected === null ? null : shown ? (
      <p role="status" className="text-sm font-medium">
        {t("showingRow", { row: selected.row })}
      </p>
    ) : (
      <p role="note" className="rounded-lg border bg-muted p-3 text-sm">
        {t(noteKey, { row: selected.row })}
      </p>
    );

  useEffect(() => {
    const box = scroller.current;
    const mark = highlight.current;
    if (!box || !mark) return;
    // Scroll only the panel, not the page, and without animation.
    box.scrollTop = Math.max(0, mark.offsetTop - box.clientHeight / 2 + mark.offsetHeight / 2);
  }, [selected?.id, page, zoom, css?.top, imageLoads]);

  if (source.kind === "pdf") {
    return (
      <div className="flex flex-col gap-4">
        {rowMessage}
        <p className="text-muted-foreground">{t("pdfNote")}</p>
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline" })}
        >
          <ExternalLink aria-hidden="true" />
          {t("openPdf")}
        </a>
        <p className="text-sm text-muted-foreground">{t("linkExpires")}</p>
      </div>
    );
  }

  if (source.kind === "unavailable" || (source.kind === "image" && imageFailed)) {
    return (
      <div className="flex flex-col gap-3">
        {rowMessage}
        <div
          role="note"
          className={`flex ${PAGE_ASPECT} flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed bg-muted/40 p-6 text-center text-muted-foreground`}
        >
          <FileText aria-hidden="true" className="size-8" />
          <p>{t("unavailable")}</p>
        </div>
      </div>
    );
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setZoom((z) => clampZoom(z + ZOOM_STEP));
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      setZoom((z) => clampZoom(z - ZOOM_STEP));
    } else if (event.key === "0") {
      event.preventDefault();
      setZoom(ZOOM_MIN);
    }
  }

  const zoomLabel = t("zoomLevel", { percent: Math.round(zoom * 100) });

  return (
    <div className="flex flex-col gap-3">
      {rowMessage}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t("zoomOut")}
          aria-controls={regionId}
          disabled={zoom <= ZOOM_MIN}
          onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
        >
          <Minus aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t("zoomIn")}
          aria-controls={regionId}
          onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
        >
          <Plus aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t("zoomReset")}
          aria-controls={regionId}
          disabled={zoom === ZOOM_MIN}
          onClick={() => setZoom(ZOOM_MIN)}
        >
          <RotateCcw aria-hidden="true" />
        </Button>
        <span aria-live="polite" className="text-sm tabular-nums text-muted-foreground">
          {zoomLabel}
        </span>
        {pageCount > 1 ? (
          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t("previousPage")}
            </Button>
            <span className="text-sm tabular-nums">{t("pageOf", { page, count: pageCount })}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              {t("nextPage")}
            </Button>
          </div>
        ) : null}
      </div>

      <div
        id={regionId}
        ref={scroller}
        role="region"
        tabIndex={0}
        aria-label={t("regionLabel")}
        aria-describedby={`${idPrefix}-hint`}
        onKeyDown={onKeyDown}
        className="max-h-[70vh] overflow-auto rounded-lg border bg-muted/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <div className="relative" style={{ width: `${zoom * 100}%` }}>
          {source.kind === "demo" ? (
            <div role="img" aria-label={t("demoAlt", { page })}>
              <SyntheticBillPage bill={bill} page={page} />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL; the image optimizer must never see it
            <img
              src={source.url}
              alt={t("imageAlt")}
              decoding="async"
              referrerPolicy="no-referrer"
              onLoad={() => setImageLoads((n) => n + 1)}
              onError={() => setImageFailed(true)}
              className="block h-auto w-full select-none"
            />
          )}
          {css ? (
            <div
              ref={highlight}
              data-testid="source-highlight"
              aria-hidden="true"
              style={{ left: css.left, top: css.top, width: css.width, height: css.height }}
              className="pointer-events-none absolute rounded-sm border-2 border-primary bg-primary/15 shadow-[0_0_0_2px_var(--background)]"
            />
          ) : null}
        </div>
      </div>

      <p id={`${idPrefix}-hint`} className="text-sm text-muted-foreground">
        {t("keyboardHint")}
      </p>
      {source.kind === "demo" ? (
        <p className="text-sm text-muted-foreground">{t("demoNote")}</p>
      ) : null}
    </div>
  );
}
