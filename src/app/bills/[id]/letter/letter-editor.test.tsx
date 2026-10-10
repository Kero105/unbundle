// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import en from "../../../../../messages/en.json";
import es from "../../../../../messages/es.json";
import type { LetterContent } from "./letter-content";
import { LetterEditor } from "./letter-editor";
import type { LetterModel } from "./letter-model";

const renderMock = vi.hoisted(() => vi.fn(async (...args: unknown[]) => new Blob([String(args.length)])));
vi.mock("./letter-pdf-file", () => ({ renderLetterPdf: renderMock }));

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

const messages = { en: en.Letter, es: es.Letter };
let downloads: string[];

function setup(uiLocale: "en" | "es" = "en") {
  render(
    <LetterEditor
      model={model}
      uiLocale={uiLocale}
      messages={messages}
      initialDate="2026-10-10"
      initialProviderName="Synthetic Clinic"
    />,
  );
}

const lastContent = () => renderMock.mock.calls.at(-1)![0] as LetterContent;

async function download(expectedCalls: number) {
  fireEvent.click(screen.getByRole("button", { name: /download|descargar/i }));
  await waitFor(() => expect(renderMock).toHaveBeenCalledTimes(expectedCalls));
  await waitFor(() => expect(downloads.length).toBe(expectedCalls));
}

describe("LetterEditor download", () => {
  beforeEach(() => {
    renderMock.mockClear();
    downloads = [];
    URL.createObjectURL = vi.fn(() => "blob:test");
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(this.download);
    });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("hands the PDF renderer Spanish content after clicking ES, then English after EN", async () => {
    setup("en");

    fireEvent.click(screen.getByRole("button", { name: es.Letter.page.languageSpanish }));
    await download(1);
    expect(lastContent().locale).toBe("es");
    expect(lastContent().subject).toBe(es.Letter.doc.subject);
    expect(lastContent().subject).not.toBe(en.Letter.doc.subject);
    expect(lastContent().salutation).toBe(es.Letter.doc.salutation);
    expect(lastContent().items[0].reason).toBe(es.Letter.doc.reasons.duplicateCharge.firm);
    expect(downloads[0]).toBe("dispute-letter-es.pdf");

    fireEvent.click(screen.getByRole("button", { name: es.Letter.page.languageEnglish }));
    await download(2);
    expect(lastContent().locale).toBe("en");
    expect(lastContent().subject).toBe(en.Letter.doc.subject);
    expect(lastContent().items[0].reason).toBe(en.Letter.doc.reasons.duplicateCharge.firm);
    expect(downloads[1]).toBe("dispute-letter-en.pdf");
  });

  it("uses field values typed after the language switch", async () => {
    setup("en");
    fireEvent.click(screen.getByRole("button", { name: /^ES$|Spanish|Español/ }));
    fireEvent.change(screen.getByLabelText(/account number|número de cuenta/i), {
      target: { value: "ACCT-9" },
    });
    await download(1);
    expect(lastContent().account).toContain("ACCT-9");
    expect(lastContent().locale).toBe("es");
  });
});
