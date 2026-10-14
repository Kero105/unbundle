// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ShareActions } from "./share-actions";

const labels = {
  copy: "Copy link",
  copied: "Link copied.",
  copyFailed: "Could not copy.",
  share: "Share…",
  shareTitle: "Unbundle",
};
const URL_ = "https://unbundle.example";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ShareActions", () => {
  it("copies exactly the link and confirms it in a live region", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<ShareActions url={URL_} labels={labels} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Link copied."));
    expect(writeText).toHaveBeenCalledWith(URL_);
    expect(writeText).toHaveBeenCalledTimes(1);
  });

  it("says so when copying is not possible", async () => {
    vi.stubGlobal("navigator", {});
    render(<ShareActions url={URL_} labels={labels} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Could not copy."));
  });

  it("has no share button where navigator.share does not exist", () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn() } });
    render(<ShareActions url={URL_} labels={labels} />);
    expect(screen.queryByRole("button", { name: "Share…" })).toBeNull();
  });

  it("shares the bare link, with no added parameters, where navigator.share exists", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share, clipboard: { writeText: vi.fn() } });
    render(<ShareActions url={URL_} labels={labels} />);
    fireEvent.click(screen.getByRole("button", { name: "Share…" }));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(share).toHaveBeenCalledWith({ title: "Unbundle", url: URL_ });
  });

  it("does not complain when the person closes the share sheet", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("closed", "AbortError"));
    vi.stubGlobal("navigator", { share, clipboard: { writeText: vi.fn() } });
    render(<ShareActions url={URL_} labels={labels} />);
    fireEvent.click(screen.getByRole("button", { name: "Share…" }));
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("stores nothing", () => {
    const set = vi.spyOn(Storage.prototype, "setItem");
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    render(<ShareActions url={URL_} labels={labels} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(set).not.toHaveBeenCalled();
  });
});
