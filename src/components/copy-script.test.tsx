// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CopyScript } from "./copy-script";

const labels = { copy: "Copy", copied: "Copied", failed: "Failed", textLabel: "Script" };

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CopyScript", () => {
  it("shows the script text and copies exactly that text", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<CopyScript text={"line one\nline two"} labels={labels} />);
    expect((screen.getByLabelText("Script") as HTMLTextAreaElement).value).toBe("line one\nline two");
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Copied"));
    expect(writeText).toHaveBeenCalledWith("line one\nline two");
  });

  it("says so when the clipboard is unavailable", async () => {
    vi.stubGlobal("navigator", {});
    render(<CopyScript text="x" labels={labels} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Failed"));
  });

  it("is read-only so edits never drift from what was built", () => {
    render(<CopyScript text="x" labels={labels} />);
    expect((screen.getByLabelText("Script") as HTMLTextAreaElement).readOnly).toBe(true);
  });
});
