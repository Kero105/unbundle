"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Camera, FileText, Loader2, TriangleAlert, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatBytes } from "@/lib/bills/image-compression";
import { cn } from "cn";

export type DropZoneFile =
  | { status: "compressing"; name: string; originalBytes: number }
  | {
      status: "ready";
      name: string;
      originalBytes: number;
      finalBytes: number;
      /** Object URL for image thumbnails; PDFs use a generic icon. */
      previewUrl: string | null;
    };

type Props = {
  id: string;
  label: string;
  hint: string;
  /** Value for the input's accept attribute. */
  accept: string;
  file: DropZoneFile | null;
  error: string | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
};

/**
 * Styled file picker. The real <input type="file"> stays in the DOM (visually
 * hidden) and is what the label, keyboard and screen readers talk to.
 */
export function FileDropZone({ id, label, hint, accept, file, error, onSelect, onRemove }: Props) {
  const t = useTranslations("Upload.zone");
  const locale = useLocale();
  const input = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = error ? `${hintId} ${errorId}` : hintId;

  function pickFrom(files: FileList | null) {
    const first = files?.[0];
    if (first) onSelect(first);
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-base font-semibold">
        {label}
      </Label>
      <p id={hintId} className="text-muted-foreground">
        {hint}
      </p>

      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pickFrom(e.dataTransfer.files);
        }}
        className="flex flex-col gap-2"
      >
        <input
          ref={input}
          id={id}
          type="file"
          accept={accept}
          // Out of the tab order once a file is shown; Replace takes over.
          tabIndex={file ? -1 : 0}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className="peer sr-only"
          onChange={(e) => {
            pickFrom(e.target.files);
            e.target.value = "";
          }}
        />

        {file ? (
          <div
            className={cn(
              "flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center",
              dragging && "border-primary bg-primary/5 ring-3 ring-ring",
              error && "border-destructive/50",
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                {file.status === "ready" && file.previewUrl ? (
                  // Blob URL of the user's own file; next/image can't optimize it.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.previewUrl} alt="" className="size-full object-cover" />
                ) : file.status === "compressing" ? (
                  <Loader2 aria-hidden="true" className="size-5 animate-spin text-muted-foreground motion-reduce:animate-none" />
                ) : (
                  <FileText aria-hidden="true" className="size-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="break-all font-medium">{file.name}</span>
                {file.status === "compressing" ? (
                  <span role="status" className="text-sm text-muted-foreground">
                    {t("compressing")}
                  </span>
                ) : file.finalBytes === file.originalBytes ? (
                  <span className="text-sm text-muted-foreground">
                    {formatBytes(file.finalBytes, locale)}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {t("sizes", {
                      from: formatBytes(file.originalBytes, locale),
                      to: formatBytes(file.finalBytes, locale),
                    })}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()}>
                {t("replace")}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
                {t("remove")}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <label
              htmlFor={id}
              className={cn(
                "flex min-h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-card px-4 py-6 text-center transition-colors hover:bg-muted peer-focus-visible:ring-3 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
                dragging && "border-primary bg-primary/5",
                error ? "border-destructive/50" : "border-input",
              )}
            >
              <Upload aria-hidden="true" className="size-7 text-muted-foreground" />
              <span className="font-medium">{dragging ? t("drop") : t("prompt")}</span>
              <span className="text-sm text-muted-foreground">{t("accepted")}</span>
            </label>
            {/* Separate input: `capture` would hide the photo library on the main one. */}
            <input
              ref={camera}
              type="file"
              accept="image/*"
              capture="environment"
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only"
              onChange={(e) => {
                pickFrom(e.target.files);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="hidden pointer-coarse:inline-flex"
              onClick={() => camera.current?.click()}
            >
              <Camera aria-hidden="true" />
              {t("takePhoto")}
            </Button>
          </>
        )}
      </div>

      {error ? (
        <p id={errorId} role="alert" className="flex items-start gap-2 text-destructive">
          <TriangleAlert aria-hidden="true" className="mt-1 size-4 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
