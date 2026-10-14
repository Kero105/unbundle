// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ReminderDownload } from "./reminder-download";

const labels = {
  heading: "Remind me",
  dateLabel: "Date",
  download: "Download",
  summary: "Follow up on your bill",
  description: "Call the office.",
  invalidDate: "Enter a real date.",
};

let blobs: Blob[];

beforeEach(() => {
  blobs = [];
  vi.stubGlobal(
    "URL",
    Object.assign(URL, {
      createObjectURL: (b: Blob) => {
        blobs.push(b);
        return "blob:test";
      },
      revokeObjectURL: vi.fn(),
    }),
  );
  vi.stubGlobal("fetch", vi.fn());
  HTMLAnchorElement.prototype.click = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ReminderDownload", () => {
  it("downloads the picked date as an all-day event with only the generic text", async () => {
    render(<ReminderDownload mode="followUp" labels={labels} />);
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-11-02" } });
    fireEvent.click(screen.getByRole("button", { name: "Download" }));

    expect(blobs).toHaveLength(1);
    const text = await blobs[0].text();
    expect(text).toContain("DTSTART;VALUE=DATE:20261102");
    expect(text).toContain("SUMMARY:Follow up on your bill");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("puts the 120-day window end on day 120 after the bill date", async () => {
    render(<ReminderDownload mode="gfe" labels={labels} />);
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    expect(await blobs[0].text()).toContain("DTSTART;VALUE=DATE:20260501");
  });

  it("shows an error and downloads nothing when no date is picked", () => {
    render(<ReminderDownload mode="followUp" labels={labels} />);
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    expect(blobs).toHaveLength(0);
    expect(screen.getByText("Enter a real date.")).toBeTruthy();
    expect(screen.getByLabelText("Date").getAttribute("aria-invalid")).toBe("true");
  });

  it("stores nothing in browser storage", () => {
    const set = vi.spyOn(Storage.prototype, "setItem");
    render(<ReminderDownload mode="followUp" labels={labels} />);
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-11-02" } });
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    expect(set).not.toHaveBeenCalled();
    expect(document.cookie).toBe("");
  });
});
