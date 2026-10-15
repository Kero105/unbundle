// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../../messages/en.json";
import demoBill from "../../../../../fixtures/review/demo-bill.json";
import { ExtractedBillSchema } from "@/lib/types";
import { explainCodeAction } from "@/app/bills/explain-actions";
import { ReviewTable } from "./review-table";

vi.mock("@/app/bills/actions", () => ({ updateLineItemAction: vi.fn() }));
vi.mock("@/app/bills/explain-actions", () => ({ explainCodeAction: vi.fn() }));
vi.mock("@/components/pending-link", () => ({
  PendingLink: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const explainMock = vi.mocked(explainCodeAction);
const bill = ExtractedBillSchema.parse(demoBill);
const typed = {
  ...bill,
  lineItems: bill.lineItems.map((l) => ({
    ...l,
    sourceBox: null,
    confidence: "high" as const,
    userVerified: true,
  })),
};

function view(props: Partial<Parameters<typeof ReviewTable>[0]>) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ReviewTable bill={typed} reportHref="/bills/x/report" billId="b" {...props} />
    </NextIntlClientProvider>,
  );
}

describe("ReviewTable for a typed-in bill", () => {
  afterEach(cleanup);

  it("keeps the source panel and per-row buttons for an uploaded bill", () => {
    view({ manual: false, source: { kind: "image", url: "https://example.test/x" } });
    expect(screen.getAllByRole("button", { name: /Show row \d+ on the original bill/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Original bill").length).toBeGreaterThan(0);
  });

  it("hides the source panel and 'Show on bill' when there is no file", () => {
    view({ manual: true, source: { kind: "unavailable" } });
    expect(screen.queryByRole("button", { name: /on the original bill/ })).toBeNull();
    expect(screen.queryByText("Original bill")).toBeNull();
    expect(screen.queryByText(/couldn.t load your original bill/)).toBeNull();
    // Editing still works.
    expect(screen.getByLabelText("Description, row 1")).toBeTruthy();
  });

  it("keeps the file when one exists, but drops the per-row buttons", () => {
    view({ manual: true, source: { kind: "image", url: "https://example.test/x" } });
    expect(screen.queryByRole("button", { name: /on the original bill/ })).toBeNull();
    expect(screen.getAllByText("Original bill").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/aren't linked to a spot on it/).length).toBeGreaterThan(0);
  });
});

describe("What is this? and the uncertainty notice", () => {
  afterEach(() => {
    cleanup();
    explainMock.mockReset();
  });

  it("asks only when opened, keeps the answer, and does not ask again on reopen", async () => {
    explainMock.mockResolvedValue({ ok: true, text: "A general explanation." });
    view({});
    const button = screen.getAllByRole("button", { name: "What is this? Row 1" })[0];
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(explainMock).not.toHaveBeenCalled();

    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    await waitFor(() => expect(screen.getByText("A general explanation.")).toBeTruthy());
    expect(explainMock).toHaveBeenCalledTimes(1);

    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(button);
    expect(screen.getByText("A general explanation.")).toBeTruthy();
    expect(explainMock).toHaveBeenCalledTimes(1);
  });

  it("says the AI-uncertainty caveat once, only while rows are flagged", () => {
    const flagged = {
      ...typed,
      lineItems: typed.lineItems.map((l, i) => ({
        ...l,
        confidence: i < 2 ? ("low" as const) : ("high" as const),
        userVerified: false,
      })),
    };
    view({ bill: flagged });
    expect(screen.getAllByText(/marked its own reading of the rows labeled/)).toHaveLength(1);
    cleanup();
    view({});
    expect(screen.queryByText(/marked its own reading/)).toBeNull();
  });
});

describe("row summaries on phones", () => {
  afterEach(cleanup);

  it("starts flagged rows open and the rest closed, and toggles with aria-expanded", () => {
    const flagged = {
      ...typed,
      lineItems: typed.lineItems.map((l, i) => ({
        ...l,
        confidence: i === 0 ? ("low" as const) : ("high" as const),
        userVerified: i !== 0,
      })),
    };
    view({ bill: flagged });
    const first = screen.getByRole("button", { name: "Details for row 1" });
    const second = screen.getByRole("button", { name: "Details for row 2" });
    expect(first.getAttribute("aria-expanded")).toBe("true");
    expect(second.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(second);
    expect(second.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(first);
    expect(first.getAttribute("aria-expanded")).toBe("false");
  });

  it("keeps every field labelled for each row", () => {
    view({});
    for (const name of ["Date", "Code", "Description", "Units", "Unit price", "Charge", "Modifiers"]) {
      expect(screen.getByLabelText(`${name}, row 1`)).toBeTruthy();
    }
  });
});
