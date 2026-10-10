"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Camera, Lock, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { FileDropZone, type DropZoneFile } from "@/components/file-drop-zone";
import { CompressError, compressImage } from "@/lib/bills/compress-image";
import { errorMessageKey } from "@/lib/bills/error-messages";
import {
  checkPickedFile,
  detectFileKind,
  formatBytes,
  isImageKind,
  isServerFileError,
  type ClientFileErrorCode,
} from "@/lib/bills/image-compression";

// Not listing HEIC here on purpose: iOS then converts photos to JPEG for us.
const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

type Kind = "bill" | "eob";
type Step = "creating" | "bill" | "eob" | "reading";
type Phase = "form" | "working" | "error";

class ApiError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

async function call(input: string, init: RequestInit): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    throw new ApiError("network");
  }
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new ApiError(typeof body.error === "string" ? body.error : "unknown");
  return body;
}

/** A picked file once it is ready to send (compressed if it was an image). */
type Slot = {
  original: { name: string; bytes: number };
  status: "compressing" | "ready";
  /** What actually gets uploaded. */
  file: File | null;
  previewUrl: string | null;
};

const EMPTY_SLOTS: Record<Kind, Slot | null> = { bill: null, eob: null };

function toZoneFile(slot: Slot | null): DropZoneFile | null {
  if (!slot) return null;
  if (slot.status === "compressing" || !slot.file) {
    return { status: "compressing", name: slot.original.name, originalBytes: slot.original.bytes };
  }
  return {
    status: "ready",
    name: slot.file.name,
    originalBytes: slot.original.bytes,
    finalBytes: slot.file.size,
    previewUrl: slot.previewUrl,
  };
}

export function UploadForm() {
  const t = useTranslations("Upload");
  const router = useRouter();
  const locale = useLocale();
  const [slots, setSlots] = useState<Record<Kind, Slot | null>>(EMPTY_SLOTS);
  const [fileError, setFileError] = useState<Record<Kind, string | null>>({ bill: null, eob: null });
  // Bumped on every pick/remove so a slow compression can't overwrite a newer choice.
  const tokens = useRef<Record<Kind, number>>({ bill: 0, eob: 0 });
  const previewUrls = useRef<Record<Kind, string | null>>({ bill: null, eob: null });
  const failedStep = useRef<Kind | null>(null);
  const bill = slots.bill?.status === "ready" ? slots.bill.file : null;
  const eob = slots.eob?.status === "ready" ? slots.eob.file : null;
  const compressing = slots.bill?.status === "compressing" || slots.eob?.status === "compressing";
  const [phase, setPhase] = useState<Phase>("form");
  const [step, setStep] = useState<Step>("creating");
  const [errorCode, setErrorCode] = useState<string>("unknown");
  // Survive retries: a retry resumes after the last step that succeeded.
  const progress = useRef<{ billId: string | null; bill: boolean; eob: boolean }>({
    billId: null,
    bill: false,
    eob: false,
  });

  const stepOrder: Step[] = ["creating", "bill", ...(eob ? (["eob"] as const) : []), "reading"];

  useEffect(() => {
    const urls = previewUrls.current;
    return () => {
      for (const url of Object.values(urls)) if (url) URL.revokeObjectURL(url);
    };
  }, []);

  function setError(kind: Kind, code: ClientFileErrorCode | string | null) {
    const message = code === null ? null : t(`errors.${errorMessageKey(code)}`);
    setFileError((prev) => ({ ...prev, [kind]: message }));
  }

  function clear(kind: Kind) {
    const url = previewUrls.current[kind];
    if (url) URL.revokeObjectURL(url);
    previewUrls.current[kind] = null;
    setSlots((prev) => ({ ...prev, [kind]: null }));
  }

  async function pick(kind: Kind, picked: File | null) {
    const token = ++tokens.current[kind];
    clear(kind);
    setError(kind, null);
    // Changing a file that was already uploaded means starting a fresh bill.
    if (progress.current[kind]) progress.current = { billId: null, bill: false, eob: false };
    if (!picked) return;

    const head = new Uint8Array(await picked.slice(0, 16).arrayBuffer().catch(() => new ArrayBuffer(0)));
    if (token !== tokens.current[kind]) return;
    const fileKind = detectFileKind({ type: picked.type, name: picked.name, head });
    const problem = checkPickedFile(fileKind, picked.size);
    if (problem || !fileKind) {
      setError(kind, problem ?? "unsupported_type");
      return;
    }

    const original = { name: picked.name, bytes: picked.size };
    if (!isImageKind(fileKind)) {
      setSlots((prev) => ({ ...prev, [kind]: { original, status: "ready", file: picked, previewUrl: null } }));
      return;
    }

    setSlots((prev) => ({ ...prev, [kind]: { original, status: "compressing", file: null, previewUrl: null } }));
    try {
      const compressed = await compressImage(picked, fileKind);
      if (token !== tokens.current[kind]) return;
      const previewUrl = URL.createObjectURL(compressed);
      previewUrls.current[kind] = previewUrl;
      setSlots((prev) => ({ ...prev, [kind]: { original, status: "ready", file: compressed, previewUrl } }));
    } catch (e) {
      if (token !== tokens.current[kind]) return;
      clear(kind);
      setError(kind, e instanceof CompressError ? e.code : "image_unreadable");
    }
  }

  async function upload(billId: string, kind: Kind, file: File) {
    const form = new FormData();
    form.set("kind", kind);
    form.set("file", file);
    try {
      await call(`/api/bills/${billId}/files`, { method: "POST", body: form });
    } catch (e) {
      // Already stored by an earlier attempt whose response was lost.
      if (!(e instanceof ApiError && e.code === "already_uploaded")) throw e;
    }
  }

  async function run() {
    if (!bill || compressing) return;
    const state = progress.current;
    failedStep.current = null;
    setPhase("working");
    try {
      if (!state.billId) {
        setStep("creating");
        const created = await call("/api/bills", { method: "POST" });
        state.billId = String(created.billId);
      }
      if (!state.bill) {
        failedStep.current = "bill";
        setStep("bill");
        await upload(state.billId, "bill", bill);
        state.bill = true;
      }
      if (eob && !state.eob) {
        failedStep.current = "eob";
        setStep("eob");
        await upload(state.billId, "eob", eob);
        state.eob = true;
      }
      failedStep.current = null;
      setStep("reading");
      try {
        await call("/api/extract", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ billId: state.billId }),
        });
      } catch (e) {
        if (!(e instanceof ApiError && e.code === "already_done")) throw e;
      }
      router.push(`/bills/${state.billId}/review`);
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "unknown";
      const culprit = failedStep.current;
      if (culprit && isServerFileError(code)) {
        // The server rejected this particular file: send the user back to it.
        clear(culprit);
        setError(culprit, code);
        setPhase("form");
        return;
      }
      setErrorCode(code);
      setPhase("error");
    }
  }

  function startOver() {
    progress.current = { billId: null, bill: false, eob: false };
    tokens.current = { bill: tokens.current.bill + 1, eob: tokens.current.eob + 1 };
    clear("bill");
    clear("eob");
    setFileError({ bill: null, eob: null });
    setPhase("form");
  }

  const privacy = (
    <aside className="flex gap-3 rounded-lg border bg-muted/40 p-4">
      <Lock aria-hidden="true" className="mt-1 size-5 shrink-0 text-muted-foreground" />
      <div>
        <p className="font-semibold">{t("privacy.title")}</p>
        <p className="text-muted-foreground">{t("privacy.body")}</p>
        <Link
          href="/privacy"
          className="mt-2 inline-block font-medium text-primary underline underline-offset-4 hover:no-underline"
        >
          {t("privacy.more")}
        </Link>
      </div>
    </aside>
  );

  if (phase === "working") {
    const current = stepOrder.indexOf(step) + 1;
    const stepLabel = t(`progress.${step}`);
    const text = t("progress.text", { current, total: stepOrder.length, step: stepLabel });
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <Progress
          value={current - 1}
          max={stepOrder.length}
          label={t("progress.label")}
          valueText={text}
        />
        <p role="status" className="flex items-center gap-2 text-lg font-semibold">
          <Loader2 aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" />
          {step === "reading" ? t("reading.title") : stepLabel}
        </p>
        {step === "reading" ? (
          <>
            <p className="text-muted-foreground">{t("reading.body")}</p>
            <div className="flex flex-col gap-3" aria-hidden="true">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </>
        ) : null}
        {privacy}
      </div>
    );
  }

  if (phase === "error") {
    const kept = (["bill", "eob"] as const).flatMap((kind) => {
      const file = kind === "bill" ? bill : eob;
      return file ? [{ kind, name: file.name, size: formatBytes(file.size, locale) }] : [];
    });
    return (
      <div className="flex flex-col gap-6">
        <div role="alert" className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive-surface p-4">
          <p className="flex items-center gap-2 font-semibold text-destructive">
            <TriangleAlert aria-hidden="true" className="size-5" />
            {t("errorTitle")}
          </p>
          <p>{t(`errors.${errorMessageKey(errorCode)}`)}</p>
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-semibold">{t("keptFiles")}</p>
          <ul className="flex flex-col gap-1 text-muted-foreground">
            {kept.map((item) => (
              <li key={item.kind} className="break-all">
                {t(item.kind === "bill" ? "billLabel" : "eobLabel")}: {item.name} ({item.size})
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" onClick={() => void run()}>
            {t("retry")}
          </Button>
          <Button type="button" variant="outline" onClick={startOver}>
            {t("startOver")}
          </Button>
        </div>
      </div>
    );
  }

  const blocker = bill
    ? compressing
      ? "compressing"
      : null
    : slots.bill?.status === "compressing"
      ? "compressing"
      : fileError.bill
        ? "fixBill"
        : "needBill";

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        void run();
      }}
    >
      <details className="group rounded-lg border bg-card">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-4 py-2 font-medium hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring">
          <Camera aria-hidden="true" className="size-5 text-muted-foreground" />
          {t("tips.title")}
        </summary>
        <ul className="list-disc space-y-1 px-4 pb-4 pl-9 text-muted-foreground">
          {(["flat", "light", "pages", "edges"] as const).map((tip) => (
            <li key={tip}>{t(`tips.${tip}`)}</li>
          ))}
        </ul>
      </details>
      <FileDropZone
        id="bill-file"
        label={t("billLabel")}
        hint={t("billHint")}
        accept={ACCEPT}
        file={toZoneFile(slots.bill)}
        error={fileError.bill}
        onSelect={(f) => void pick("bill", f)}
        onRemove={() => void pick("bill", null)}
      />
      <FileDropZone
        id="eob-file"
        label={t("eobLabel")}
        hint={t("eobHint")}
        accept={ACCEPT}
        file={toZoneFile(slots.eob)}
        error={fileError.eob}
        onSelect={(f) => void pick("eob", f)}
        onRemove={() => void pick("eob", null)}
      />
      <p className="text-sm text-muted-foreground">{t("formats")}</p>
      {privacy}
      <div className="flex flex-col gap-2">
        <Button
          type="submit"
          size="lg"
          disabled={blocker !== null}
          aria-describedby={blocker ? "submit-help" : undefined}
          className="w-full sm:w-auto sm:self-start"
        >
          {t("submit")}
        </Button>
        {blocker ? (
          <p id="submit-help" className="text-sm text-muted-foreground">
            {t(`blocked.${blocker}`)}
          </p>
        ) : null}
      </div>
    </form>
  );
}
