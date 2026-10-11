// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../../messages/en.json";
import demoBill from "../../../../../fixtures/review/demo-bill.json";
import { ExtractedBillSchema } from "@/lib/types";
import { SourcePanel, type PanelSource, type SelectedRow } from "./source-panel";

const bill = ExtractedBillSchema.parse(demoBill);

function view(source: PanelSource, selected: SelectedRow | null) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SourcePanel source={source} bill={bill} selected={selected} idPrefix="t" />
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
});
