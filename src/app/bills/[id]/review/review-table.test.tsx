// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../../messages/en.json";
import demoBill from "../../../../../fixtures/review/demo-bill.json";
import { ExtractedBillSchema } from "@/lib/types";
import { ReviewTable } from "./review-table";

vi.mock("@/app/bills/actions", () => ({ updateLineItemAction: vi.fn() }));
vi.mock("@/app/bills/explain-actions", () => ({ explainCodeAction: vi.fn() }));
vi.mock("@/components/pending-link", () => ({
  PendingLink: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

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
