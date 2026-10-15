// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../../messages/en.json";
import demoBill from "../../../../../fixtures/review/demo-bill.json";
import { ExtractedBillSchema } from "@/lib/types";
import { SourcePanel, type PanelSource, type SelectedRow } from "./source-panel";

const bill = ExtractedBillSchema.parse(demoBill);

function view(source: PanelSource, selected: SelectedRow | null, manual = false) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SourcePanel source={source} bill={bill} selected={selected} idPrefix="t" manual={manual} />
    </NextIntlClientProvider>,
  );
}

const row = (i: number): SelectedRow => ({
  id: bill.lineItems[i].id,
  row: i + 1,
  sourcePage: bill.lineItems[i].sourcePage,
  sourceBox: bill.lineItems[i].sourceBox,
});

describe("SourcePanel", () => {
  afterEach(cleanup);

  it("highlights the selected row on the synthetic demo bill", () => {
    view({ kind: "demo" }, row(1));
    const mark = screen.getByTestId("source-highlight");
    expect(mark.style.top).toBe("29.5%");
    expect(screen.getByText(/FICTIONAL/)).toBeTruthy();
  });

  it("switches to the page of a row on page two", () => {
    view({ kind: "demo" }, row(6));
    expect(screen.getByText("Page 2 of 2")).toBeTruthy();
    expect(screen.getByTestId("source-highlight")).toBeTruthy();
  });

  it("shows a calm note and no highlight when the box is null", () => {
    view({ kind: "image", url: "https://example.test/x" }, { ...row(0), sourceBox: null });
    expect(screen.queryByTestId("source-highlight")).toBeNull();
    expect(screen.getByRole("note").textContent).toContain("couldn’t pinpoint");
  });

  it("says a typed row has no spot on the bill, instead of claiming it could not be found", () => {
    view({ kind: "image", url: "https://example.test/x" }, { ...row(0), sourceBox: null }, true);
    expect(screen.queryByTestId("source-highlight")).toBeNull();
    const note = screen.getByRole("note").textContent ?? "";
    expect(note).toContain("You typed row 1");
    expect(note).not.toContain("couldn’t pinpoint");
  });

  it("gives the image alt text and zooms with buttons and keys", () => {
    view({ kind: "image", url: "https://example.test/x" }, null);
    expect(screen.getByAltText("The bill you uploaded")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByText("125%")).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("region"), { key: "-" });
    expect(screen.getByText("100%")).toBeTruthy();
  });

  it("links to the original PDF", () => {
    view({ kind: "pdf", url: "https://example.test/x.pdf" }, null);
    const link = screen.getByRole("link", { name: /Open your original PDF/ });
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("puts the row message above the image", () => {
    view({ kind: "image", url: "https://example.test/x" }, { ...row(0), sourceBox: null });
    const note = screen.getByRole("note");
    const img = screen.getByAltText("The bill you uploaded");
    expect(note.compareDocumentPosition(img) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("does not lazy-load the image and re-scrolls to the highlight when it loads", () => {
    view({ kind: "image", url: "https://example.test/x" }, row(1));
    const img = screen.getByAltText("The bill you uploaded");
    expect(img.getAttribute("loading")).toBeNull();
    const region = screen.getByRole("region");
    const mark = screen.getByTestId("source-highlight");
    // jsdom has no layout: give the highlight a position that only exists once the image has loaded.
    Object.defineProperty(mark, "offsetTop", { value: 900, configurable: true });
    Object.defineProperty(mark, "offsetHeight", { value: 20, configurable: true });
    Object.defineProperty(region, "clientHeight", { value: 400, configurable: true });
    region.scrollTop = 0;
    fireEvent.load(img);
    expect(region.scrollTop).toBe(900 - 200 + 10);
  });

  it("names the row on the PDF branch, even when the row has a box", () => {
    view({ kind: "pdf", url: "https://example.test/x.pdf" }, row(1));
    expect(screen.getByRole("note").textContent).toContain("row 2");
    expect(screen.queryByTestId("source-highlight")).toBeNull();
  });

  it("names the row when the bill file is unavailable, above the generic message", () => {
    view({ kind: "unavailable" }, row(0));
    const notes = screen.getAllByRole("note");
    expect(notes).toHaveLength(2);
    expect(notes[0].textContent).toContain("row 1");
    expect(notes[1].textContent).toContain("couldn’t load your original bill");
  });

  it("names the row when the image fails to load", () => {
    view({ kind: "image", url: "https://example.test/x" }, row(0));
    fireEvent.error(screen.getByAltText("The bill you uploaded"));
    expect(screen.getAllByRole("note")[0].textContent).toContain("row 1");
  });

  it("says nothing about a row when none is selected", () => {
    view({ kind: "pdf", url: "https://example.test/x.pdf" }, null);
    expect(screen.queryByRole("note")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });
});
