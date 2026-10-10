// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import en from "../../../../../messages/en.json";
import es from "../../../../../messages/es.json";
import { LetterEditor } from "./letter-editor";

// Real renderer, spying only on the blob it produces.
describe("LetterEditor with the real PDF renderer", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("produces a differently sized PDF per language and names it by language", async () => {
    const names: string[] = [];
    const sizes: number[] = [];
    URL.createObjectURL = vi.fn((blob: Blob) => {
      sizes.push(blob.size);
      return "blob:x";
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      names.push(this.download);
    });
    render(
      <LetterEditor
        model={{
          items: [
            {
              number: 1,
              findingId: "f",
              reason: "duplicateCharge",
              tone: "firm",
              lines: [{ code: "93000", description: "ECG", dateOfService: "2026-10-02", chargeCents: 100 }],
              amountInQuestionCents: 100,
            },
          ],
        }}
        uiLocale="en"
        messages={{ en: en.Letter, es: es.Letter }}
        initialDate="2026-10-10"
        initialProviderName="Clinic"
      />,
    );
    const dl = () => screen.getByRole("button", { name: /download|descargar/i });
    fireEvent.click(dl());
    await waitFor(() => expect(names).toHaveLength(1), { timeout: 10000 });
    fireEvent.click(screen.getByRole("button", { name: es.Letter.page.languageSpanish }));
    fireEvent.click(dl());
    await waitFor(() => expect(names).toHaveLength(2), { timeout: 10000 });
    expect(names).toEqual(["dispute-letter-en.pdf", "dispute-letter-es.pdf"]);
    expect(sizes[0]).not.toBe(sizes[1]);
  }, 30000);
});
