// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { ManualEntryForm } from "./manual-entry-form";

const { push, submit } = vi.hoisted(() => ({ push: vi.fn(), submit: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/app/bills/manual-actions", () => ({ submitManualBillAction: submit }));

const BILL_ID = "8f3c2c0e-5b6c-4f67-9a43-6f2f5d3a1b11";

function view(props: Parameters<typeof ManualEntryForm>[0] = {}, locale: "en" | "es" = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : es}>
      <ManualEntryForm {...props} />
    </NextIntlClientProvider>,
  );
}

function type(label: string, value: string) {
  const input = screen.getByLabelText(label);
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
}

function fillValidLine(row: number) {
  type(`Description, row ${row}`, "SYNTHETIC VISIT");
  type(`Code, row ${row}`, "99213");
  type(`Charge, row ${row}`, "125.00");
}

describe("ManualEntryForm", () => {
  beforeEach(() => {
    push.mockReset();
    submit.mockReset();
  });
  afterEach(cleanup);

  it("starts with one blank line and a zero total", () => {
    view();
    expect(screen.getAllByRole("group", { name: /^Line \d+$/ })).toHaveLength(1);
    expect(screen.getByText("Total of the lines you entered: $0.00")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove line 1" })).toHaveProperty("disabled", true);
  });

  it("adds and removes lines and keeps the total in step", () => {
    view();
    fillValidLine(1);
    fireEvent.click(screen.getByRole("button", { name: "Add a line" }));
    expect(screen.getAllByRole("group", { name: /^Line \d+$/ })).toHaveLength(2);
    type("Charge, row 2", "10.50");
    expect(screen.getByText("Total of the lines you entered: $135.50")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Remove line 2" }));
    expect(screen.getAllByRole("group", { name: /^Line \d+$/ })).toHaveLength(1);
    expect(screen.getByText("Total of the lines you entered: $125.00")).toBeTruthy();
  });

  it("stops adding at 100 lines", () => {
    view();
    const add = screen.getByRole("button", { name: "Add a line" });
    for (let i = 0; i < 99; i++) fireEvent.click(add);
    expect(screen.getAllByRole("group", { name: /^Line \d+$/ })).toHaveLength(100);
    expect(add).toHaveProperty("disabled", true);
    expect(screen.getByText("You can add up to 100 lines.")).toBeTruthy();
  });

  it("does not submit a blank form and says what is missing", async () => {
    view();
    fireEvent.click(screen.getByRole("button", { name: "Continue to review" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Every line needs a description and a charge");
    expect(screen.getByText("Enter a description.")).toBeTruthy();
    expect(screen.getByText("Enter the charge. Use 0.00 if the bill shows none.")).toBeTruthy();
    expect(submit).not.toHaveBeenCalled();
  });

  it("accepts a charge of 0.00", async () => {
    submit.mockResolvedValue({ ok: true, billId: BILL_ID });
    view();
    type("Provider or hospital", "Synthetic Clinic");
    type("Description, row 1", "SYNTHETIC NO CHARGE");
    type("Charge, row 1", "0");
    fireEvent.click(screen.getByRole("button", { name: "Continue to review" }));
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
  });

  it("sends integer cents and a normalized code, then opens the review", async () => {
    submit.mockResolvedValue({ ok: true, billId: BILL_ID });
    view({ billId: BILL_ID });
    type("Provider or hospital", "Synthetic Clinic");
    type("Description, row 1", "SYNTHETIC VISIT");
    type("Code, row 1", "j3490");
    type("Units, row 1", "2");
    type("Unit price, row 1", "62.50");
    type("Charge, row 1", "125.00");
    type("Modifiers, row 1", "25, 59");
    fireEvent.click(screen.getByRole("button", { name: "Continue to review" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith(`/bills/${BILL_ID}/review`));
    expect(submit).toHaveBeenCalledWith({
      billId: BILL_ID,
      header: { providerName: "Synthetic Clinic", serviceStart: null, serviceEnd: null },
      lines: [
        {
          dateOfService: null,
          code: "J3490",
          descriptionRaw: "SYNTHETIC VISIT",
          modifiers: ["25", "59"],
          units: 2,
          unitPriceCents: 6250,
          chargeCents: 12500,
        },
      ],
    });
  });

  it("shows a calm message and stays put when the server rejects", async () => {
    submit.mockResolvedValue({ ok: false, error: "bad_cents" });
    view();
    type("Provider or hospital", "Synthetic Clinic");
    fillValidLine(1);
    fireEvent.click(screen.getByRole("button", { name: "Continue to review" }));
    expect((await screen.findByRole("alert")).textContent).toContain("couldn't accept those lines");
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Continue to review" })).toHaveProperty("disabled", false);
  });

  it("flags a bad code on the field and keeps it out of state", () => {
    view();
    type("Code, row 1", "99-213");
    expect(screen.getByText("Use 3 to 10 letters or numbers, like 99213.")).toBeTruthy();
  });

  it("never writes the draft to browser storage", () => {
    const local = vi.spyOn(Storage.prototype, "setItem");
    view();
    fillValidLine(1);
    expect(local).not.toHaveBeenCalled();
    local.mockRestore();
  });

  it("prefills from an earlier manual entry", () => {
    view({
      billId: BILL_ID,
      draft: {
        header: { providerName: "Synthetic Clinic", serviceStart: "2026-10-02", serviceEnd: "2026-10-02" },
        lines: [
          {
            dateOfService: "2026-10-02",
            code: "99213",
            descriptionRaw: "SYNTHETIC VISIT",
            modifiers: [],
            units: 1,
            unitPriceCents: null,
            chargeCents: 12500,
          },
        ],
      },
    });
    expect((screen.getByLabelText("Provider or hospital") as HTMLInputElement).value).toBe("Synthetic Clinic");
    expect((screen.getByLabelText("Description, row 1") as HTMLInputElement).value).toBe("SYNTHETIC VISIT");
    expect(screen.getByText("Total of the lines you entered: $125.00")).toBeTruthy();
  });

  it("renders in Spanish", () => {
    view({}, "es");
    expect(screen.getByRole("button", { name: "Continuar a la revisión" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Agregar una línea" })).toBeTruthy();
  });
});
