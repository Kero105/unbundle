import { createTranslator } from "next-intl";
import { formatCents } from "@/lib/money";
import type { Locale } from "@/i18n/locale";
import type { LetterModel } from "./letter-model";

/** What the user types. Held in browser memory only; never stored or logged. */
export interface LetterFields {
  senderName: string;
  senderAddress: string;
  accountNumber: string;
  providerName: string;
  providerAddress: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
}

export interface LetterContentItem {
  number: number;
  lines: { heading: string; date: string; charge: string }[];
  amountInQuestion: string;
  reason: string;
}

/** Fully resolved letter text, shared by the HTML preview and the PDF. */
export type LetterKind = "dispute" | "itemized";

/** Reads the `?type=` query value; anything unknown means the default letter. */
export function parseLetterKind(value: string | string[] | undefined): LetterKind | undefined {
  return value === "itemized" ? "itemized" : value === "dispute" ? "dispute" : undefined;
}

export interface LetterContent {
  kind: LetterKind;
  locale: Locale;
  sender: string[];
  date: string;
  recipient: string[];
  account: string;
  subject: string;
  salutation: string;
  intro: string;
  itemsHeading: string;
  items: LetterContentItem[];
  /** Itemized-bill request only: the numbered things being asked for. */
  requests: string[];
  response: string;
  closing: string;
  sincerely: string;
  signature: string;
  footer: string;
}

/** Messages under `Letter.doc` for one locale. */
export type LetterMessages = Record<string, unknown>;

type Translate = (key: string, values?: Record<string, string | number>) => string;

function translatorFor(locale: Locale, messages: LetterMessages): Translate {
  const t = createTranslator({ locale, messages: { doc: messages }, namespace: "doc" });
  return (key, values) => (t as unknown as Translate)(key, values);
}

function formatDate(iso: string, locale: Locale, dateStyle: "long" | "medium"): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat(locale, { dateStyle, timeZone: "UTC" }).format(date);
}

function addressLines(value: string, placeholder: string): string[] {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : [placeholder];
}

/**
 * Turns the letter model and the user's fields into final text in `locale`.
 * Blank fields become bracketed placeholders so the letter never goes out with
 * a silent gap. All wording comes from the `Letter.doc` messages.
 */
export function composeLetter(
  model: LetterModel,
  fields: LetterFields,
  locale: Locale,
  messages: LetterMessages,
  kind: LetterKind = "dispute",
): LetterContent {
  const t = translatorFor(locale, messages);
  const single = (value: string, placeholderKey: string) => value.trim() || t(placeholderKey);
  const senderName = single(fields.senderName, "placeholders.senderName");

  if (kind === "itemized") {
    return {
      kind,
      locale,
      sender: [senderName, ...addressLines(fields.senderAddress, t("placeholders.senderAddress"))],
      date: fields.date ? formatDate(fields.date, locale, "long") : t("placeholders.date"),
      recipient: [
        single(fields.providerName, "placeholders.providerName"),
        ...addressLines(fields.providerAddress, t("placeholders.providerAddress")),
      ],
      account: t("account", { account: single(fields.accountNumber, "placeholders.accountNumber") }),
      subject: t("itemized.subject"),
      salutation: t("salutation"),
      intro: t("itemized.intro"),
      itemsHeading: t("itemized.requestsHeading"),
      items: [],
      requests: [
        t("itemized.requests.itemizedStatement"),
        t("itemized.requests.assistancePolicy"),
      ],
      response: t("itemized.response"),
      closing: t("closing"),
      sincerely: t("sincerely"),
      signature: senderName,
      footer: t("footer"),
    };
  }

  return {
    kind,
    locale,
    sender: [senderName, ...addressLines(fields.senderAddress, t("placeholders.senderAddress"))],
    date: fields.date ? formatDate(fields.date, locale, "long") : t("placeholders.date"),
    recipient: [
      single(fields.providerName, "placeholders.providerName"),
      ...addressLines(fields.providerAddress, t("placeholders.providerAddress")),
    ],
    account: t("account", { account: single(fields.accountNumber, "placeholders.accountNumber") }),
    subject: t("subject"),
    salutation: t("salutation"),
    intro: t("intro", { count: model.items.length }),
    itemsHeading: t("itemsHeading"),
    items: model.items.map((item) => ({
      number: item.number,
      lines: item.lines.map((line) => ({
        heading: t("line.heading", {
          code: line.code ?? t("line.noCode"),
          description: line.description,
        }),
        date: t("line.date", {
          date: line.dateOfService
            ? formatDate(line.dateOfService, locale, "medium")
            : t("line.noDate"),
        }),
        charge: t("line.charge", { amount: formatCents(line.chargeCents) }),
      })),
      amountInQuestion: t("amountInQuestion", { amount: formatCents(item.amountInQuestionCents) }),
      reason: t(`reasons.${item.reason}.${item.tone}`),
    })),
    requests: [],
    response: t("response"),
    closing: t("closing"),
    sincerely: t("sincerely"),
    signature: senderName,
    footer: t("footer"),
  };
}
