// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PrintButton } from "./print-button";

describe("PrintButton", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("opens the print dialog on click", () => {
    const print = vi.fn();
    vi.stubGlobal("print", print);
    render(<PrintButton label="Print" />);
    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    expect(print).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("opens closed details for the print and restores them after", () => {
    render(
      <>
        <PrintButton label="Print" />
        <details data-testid="closed">
          <summary>a</summary>b
        </details>
        <details data-testid="open" open>
          <summary>c</summary>d
        </details>
      </>,
    );
    const closed = screen.getByTestId("closed") as HTMLDetailsElement;
    const open = screen.getByTestId("open") as HTMLDetailsElement;
    window.dispatchEvent(new Event("beforeprint"));
    expect(closed.open).toBe(true);
    window.dispatchEvent(new Event("afterprint"));
    expect(closed.open).toBe(false);
    expect(open.open).toBe(true);
  });
});
