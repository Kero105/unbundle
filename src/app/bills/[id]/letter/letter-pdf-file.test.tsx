import { beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../../../../messages/en.json";
import es from "../../../../../messages/es.json";
import { composeLetter, type LetterFields } from "./letter-content";
import type { LetterModel } from "./letter-model";

const pdfMock = vi.hoisted(() =>
  vi.fn((element: unknown) => ({ toBlob: async () => new Blob([JSON.stringify(element !== null)]) })),
);

vi.mock("@react-pdf/renderer", () => ({
  pdf: pdfMock,
  Document: () => null,
  Page: () => null,
  Text: () => null,
  View: () => null,
  StyleSheet: { create: <T,>(styles: T) => styles },
}));

const fields: LetterFields = {
  senderName: "Pat Example",
  senderAddress: "",
  accountNumber: "ACCT-0",
  providerName: "Synthetic Clinic",
  providerAddress: "",
  date: "2026-10-10",
};

const model: LetterModel = {
  items: [
    {
      number: 1,
      findingId: "f1",
      reason: "duplicateCharge",
      tone: "firm",
      lines: [{ code: "93000", description: "ECG", dateOfService: "2026-10-02", chargeCents: 12345 }],
      amountInQuestionCents: 12345,
    },
  ],
};

describe("renderLetterPdf", () => {
  beforeEach(() => pdfMock.mockClear());

  it("renders the content it is called with, every time, with no caching", async () => {
    const { renderLetterPdf } = await import("./letter-pdf-file");
    const english = composeLetter(model, fields, "en", en.Letter.doc);
    const spanish = composeLetter(model, fields, "es", es.Letter.doc);

    for (const content of [english, spanish, english]) await renderLetterPdf(content);

    const rendered = pdfMock.mock.calls.map(
      ([element]) => (element as { props: { content: { locale: string; subject: string } } }).props.content,
    );
    expect(rendered.map((c) => c.locale)).toEqual(["en", "es", "en"]);
    expect(rendered[2].subject).toBe(en.Letter.doc.subject);
    expect(rendered[1].subject).toBe(es.Letter.doc.subject);
  });
});
