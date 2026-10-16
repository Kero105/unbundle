// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../messages/en.json";
import { FileDropZone } from "./file-drop-zone";

function phone(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation(() => ({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

function view(props: Partial<Parameters<typeof FileDropZone>[0]> = {}) {
  const onSelect = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <FileDropZone
        id="bill-file"
        label="Bill"
        hint="Hint"
        accept="image/jpeg"
        file={null}
        error={null}
        onSelect={onSelect}
        onRemove={() => {}}
        {...props}
      />
    </NextIntlClientProvider>,
  );
  return { onSelect };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("FileDropZone on phones", () => {
  it("offers Take a photo and Choose a file as buttons", () => {
    phone(true);
    view();
    expect(screen.getAllByRole("button", { name: "Take a photo" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Choose a file" })).toBeTruthy();
  });

  it("opens the capture input from Take a photo, and the plain input from Choose a file", () => {
    phone(true);
    view();
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>("input[type=file]"));
    const camera = inputs.find((i) => i.getAttribute("capture") === "environment")!;
    const picker = inputs.find((i) => !i.hasAttribute("capture"))!;
    const cameraClick = vi.spyOn(camera, "click");
    const pickerClick = vi.spyOn(picker, "click");
    fireEvent.click(screen.getAllByRole("button", { name: "Take a photo" })[0]);
    expect(cameraClick).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Choose a file" }));
    expect(pickerClick).toHaveBeenCalled();
    expect(picker.getAttribute("accept")).toBe("image/jpeg");
  });

  it("takes the real input out of the tab order so the two buttons are the stops", () => {
    phone(true);
    view();
    expect(screen.getByLabelText("Bill").getAttribute("tabindex")).toBe("-1");
  });

  it("passes a picked file on unchanged", () => {
    phone(true);
    const { onSelect } = view();
    const picker = screen.getByLabelText("Bill");
    const file = new File(["x"], "x.jpg", { type: "image/jpeg" });
    fireEvent.change(picker, { target: { files: [file] } });
    expect(onSelect).toHaveBeenCalledWith(file);
  });
});

describe("FileDropZone above phones", () => {
  it("keeps the real input in the tab order", () => {
    phone(false);
    view();
    expect(screen.getByLabelText("Bill").getAttribute("tabindex")).toBe("0");
  });
});
