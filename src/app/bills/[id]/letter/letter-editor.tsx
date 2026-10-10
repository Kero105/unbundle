"use client";

import { useEffect, useMemo, useState } from "react";
import { createTranslator } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { locales, type Locale } from "@/i18n/locale";
import { composeLetter, type LetterFields, type LetterMessages } from "./letter-content";
import type { LetterModel } from "./letter-model";

interface LetterEditorProps {
  model: LetterModel;
  /** Language the page UI is shown in; also the letter's starting language. */
  uiLocale: Locale;
  /** `Letter` messages for every locale, so the toggle switches instantly. */
  messages: Record<Locale, { page: Record<string, unknown>; doc: LetterMessages }>;
  initialDate: string;
  initialProviderName: string;
}

// The PDF renderer is large, so load it on demand and only once. The module is
// cached; the PDF it produces never is.
let pdfModule: Promise<typeof import("./letter-pdf-file")> | null = null;
function loadPdfModule() {
  pdfModule ??= import("./letter-pdf-file").catch((error) => {
    pdfModule = null;
    throw error;
  });
  return pdfModule;
}

const textareaClass =
  "min-h-24 w-full rounded-lg border border-input bg-card px-3 py-2 text-base text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40";

/**
 * Fields, language toggle, live preview and PDF download. What the user types
 * lives only in this component's state: no storage, no network, no logging.
 */
export function LetterEditor({
  model,
  uiLocale,
  messages,
  initialDate,
  initialProviderName,
}: LetterEditorProps) {
  const [letterLocale, setLetterLocale] = useState<Locale>(uiLocale);
  const [fields, setFields] = useState<LetterFields>({
    senderName: "",
    senderAddress: "",
    accountNumber: "",
    providerName: initialProviderName,
    providerAddress: "",
    date: initialDate,
  });
  const [status, setStatus] = useState<"idle" | "busy" | "error">("idle");

  const t = useMemo(
    () => createTranslator({ locale: uiLocale, messages: { page: messages[uiLocale].page }, namespace: "page" }),
    [uiLocale, messages],
  );
  const label = (key: string) => (t as unknown as (k: string) => string)(key);

  const content = useMemo(
    () => composeLetter(model, fields, letterLocale, messages[letterLocale].doc),
    [model, fields, letterLocale, messages],
  );

  // Warm the renderer while the user types, so the first download is quick.
  useEffect(() => {
    loadPdfModule().catch(() => {});
  }, []);

  function set<K extends keyof LetterFields>(key: K, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  async function download() {
    setStatus("busy");
    try {
      // Compose from the language and fields as they are right now, with the
      // same composer the preview uses, rather than reusing any earlier render.
      const current = composeLetter(model, fields, letterLocale, messages[letterLocale].doc);
      const { renderLetterPdf } = await loadPdfModule();
      const blob = await renderLetterPdf(current);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `dispute-letter-${current.locale}.pdf`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus("idle");
    } catch {
      // Deliberately drop the error: it may echo the letter's text.
      setStatus("error");
    }
  }

  const languageNames: Record<Locale, { short: string; name: string }> = {
    en: { short: "EN", name: label("languageEnglish") },
    es: { short: "ES", name: label("languageSpanish") },
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <section aria-labelledby="letter-details" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="letter-details" className="text-xl font-semibold">
            {label("detailsTitle")}
          </h2>
          <p className="text-muted-foreground">{label("detailsNote")}</p>
        </div>

        <div
          role="group"
          aria-label={label("languageGroup")}
          className="inline-flex w-fit items-center rounded-lg border border-input bg-card p-0.5"
        >
          {locales.map((value) => {
            const active = value === letterLocale;
            return (
              <button
                key={value}
                type="button"
                lang={value}
                aria-label={languageNames[value].name}
                aria-pressed={active}
                onClick={() => setLetterLocale(value)}
                className={cn(
                  "inline-flex h-10 min-w-11 items-center justify-center rounded-md px-3 text-sm font-semibold tracking-wide transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted active:bg-muted/60",
                )}
              >
                {languageNames[value].short}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sender-name">{label("fields.senderName")}</Label>
          <Input
            id="sender-name"
            autoComplete="off"
            value={fields.senderName}
            onChange={(e) => set("senderName", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sender-address">{label("fields.senderAddress")}</Label>
          <textarea
            id="sender-address"
            autoComplete="off"
            rows={3}
            className={textareaClass}
            value={fields.senderAddress}
            onChange={(e) => set("senderAddress", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="account-number">{label("fields.accountNumber")}</Label>
          <Input
            id="account-number"
            autoComplete="off"
            value={fields.accountNumber}
            onChange={(e) => set("accountNumber", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="provider-name">{label("fields.providerName")}</Label>
          <Input
            id="provider-name"
            autoComplete="off"
            value={fields.providerName}
            onChange={(e) => set("providerName", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="provider-address">{label("fields.providerAddress")}</Label>
          <textarea
            id="provider-address"
            autoComplete="off"
            rows={3}
            className={textareaClass}
            value={fields.providerAddress}
            onChange={(e) => set("providerAddress", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="letter-date">{label("fields.date")}</Label>
          <Input
            id="letter-date"
            type="date"
            value={fields.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </div>
      </section>

      <section aria-labelledby="letter-preview" className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="letter-preview" className="text-xl font-semibold">
            {label("previewTitle")}
          </h2>
          <Button
            type="button"
            onClick={download}
            disabled={status === "busy"}
            aria-busy={status === "busy"}
          >
            {status === "busy" ? (
              <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
            ) : null}
            <span role={status === "busy" ? "status" : undefined}>
              {status === "busy" ? label("preparing") : label("download")}
            </span>
          </Button>
        </div>
        <p className="text-muted-foreground">{label("reviewReminder")}</p>
        {status === "error" ? (
          <p role="alert" className="font-medium text-destructive">
            {label("downloadError")}
          </p>
        ) : null}

        <article
          lang={letterLocale}
          aria-label={label("previewLabel")}
          className="flex flex-col gap-4 rounded-xl border bg-white p-6 text-sm leading-relaxed text-neutral-900 shadow-sm sm:p-10"
        >
          <div>
            {content.sender.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
          <p>{content.date}</p>
          <div>
            {content.recipient.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
          <div>
            <p className="font-semibold">{content.subject}</p>
            <p>{content.account}</p>
          </div>
          <p>{content.salutation}</p>
          <p>{content.intro}</p>
          <h3 className="font-semibold">{content.itemsHeading}</h3>
          <ol className="flex flex-col gap-3">
            {content.items.map((item) => (
              <li key={item.number} className="flex gap-2">
                <span className="font-semibold">{item.number}.</span>
                <div className="flex min-w-0 flex-col gap-1">
                  {item.lines.map((line, i) => (
                    <div key={i}>
                      <p className="break-words">{line.heading}</p>
                      <p className="text-neutral-600">
                        {line.date} | {line.charge}
                      </p>
                    </div>
                  ))}
                  <p>{item.amountInQuestion}</p>
                  <p>{item.reason}</p>
                </div>
              </li>
            ))}
          </ol>
          <p>{content.response}</p>
          <p>{content.closing}</p>
          <div>
            <p>{content.sincerely}</p>
            <p>{content.signature}</p>
          </div>
          <p className="border-t pt-3 text-xs text-neutral-600">{content.footer}</p>
        </article>
      </section>
    </div>
  );
}
