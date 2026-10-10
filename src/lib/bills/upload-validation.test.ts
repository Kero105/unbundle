import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
  detectFileType,
  MAX_FILE_BYTES,
  MAX_PDF_PAGES,
  validateUpload,
} from "./upload-validation";

const bytes = (...b: number[]) => new Uint8Array(b);
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff, 0xe0];
const WEBP = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];

async function pdfWithPages(pages: number) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage();
  return doc.save();
}

describe("detectFileType (magic bytes)", () => {
  it("recognizes the four allowed formats", () => {
    expect(detectFileType(bytes(...JPEG))).toBe("image/jpeg");
    expect(detectFileType(bytes(...PNG))).toBe("image/png");
    expect(detectFileType(bytes(...WEBP))).toBe("image/webp");
    expect(detectFileType(new TextEncoder().encode("%PDF-1.7\n"))).toBe("application/pdf");
  });

  it("rejects look-alikes and other formats", () => {
    expect(detectFileType(bytes())).toBeNull();
    expect(detectFileType(bytes(0xff, 0xd8))).toBeNull(); // truncated JPEG signature
    expect(detectFileType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45))).toBeNull(); // WAV
    expect(detectFileType(new TextEncoder().encode("GIF89a"))).toBeNull();
    expect(detectFileType(new TextEncoder().encode("<svg xmlns='x'></svg>"))).toBeNull();
    expect(detectFileType(new TextEncoder().encode("MZ\x90\x00"))).toBeNull(); // executable
    expect(detectFileType(new TextEncoder().encode("PK\x03\x04"))).toBeNull(); // zip/docx
  });
});

describe("validateUpload", () => {
  it("accepts an image by its bytes, with one page", async () => {
    expect(await validateUpload(bytes(...PNG, 1, 2))).toEqual({
      ok: true,
      mimeType: "image/png",
      extension: "png",
      pageCount: 1,
    });
  });

  it("rejects empty files", async () => {
    expect(await validateUpload(bytes())).toEqual({ ok: false, code: "empty" });
  });

  it("rejects an executable even though a client could name it bill.jpg", async () => {
    const result = await validateUpload(new TextEncoder().encode("MZ\x90\x00fake.jpg"));
    expect(result).toEqual({ ok: false, code: "unsupported_type" });
  });

  it("accepts exactly the size limit and rejects one byte over", async () => {
    const atLimit = new Uint8Array(MAX_FILE_BYTES);
    atLimit.set(JPEG);
    expect((await validateUpload(atLimit)).ok).toBe(true);

    const over = new Uint8Array(MAX_FILE_BYTES + 1);
    over.set(JPEG);
    expect(await validateUpload(over)).toEqual({ ok: false, code: "too_large" });
  });

  it("accepts a PDF at the page limit and rejects one page over", async () => {
    const ok = await validateUpload(await pdfWithPages(MAX_PDF_PAGES));
    expect(ok).toMatchObject({ ok: true, mimeType: "application/pdf", pageCount: MAX_PDF_PAGES });

    const tooMany = await validateUpload(await pdfWithPages(MAX_PDF_PAGES + 1));
    expect(tooMany).toEqual({ ok: false, code: "pdf_too_many_pages" });
  });

  it("rejects a corrupt PDF", async () => {
    const result = await validateUpload(new TextEncoder().encode("%PDF-1.4\nthis is not a pdf"));
    expect(result).toEqual({ ok: false, code: "pdf_unreadable" });
  });
});
