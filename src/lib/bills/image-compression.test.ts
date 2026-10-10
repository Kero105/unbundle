import { describe, expect, it } from "vitest";
import {
  LONG_SIDE_STEPS,
  MAX_PDF_BYTES,
  MIN_LONG_SIDE,
  QUALITY_STEPS,
  TARGET_IMAGE_BYTES,
  checkPickedFile,
  detectFileKind,
  fitsTarget,
  formatBytes,
  isServerFileError,
  jpegFileName,
  planAttempts,
  sniffFileKind,
  targetDimensions,
} from "./image-compression";

const bytes = (...values: number[]) => new Uint8Array(values);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

describe("targetDimensions", () => {
  it("scales the longest side down and keeps the aspect ratio", () => {
    expect(targetDimensions(4800, 3600, 2400)).toEqual({ width: 2400, height: 1800 });
    expect(targetDimensions(3000, 6000, 2400)).toEqual({ width: 1200, height: 2400 });
  });

  it("never scales up", () => {
    expect(targetDimensions(800, 600, 2400)).toEqual({ width: 800, height: 600 });
    expect(targetDimensions(2400, 100, 2400)).toEqual({ width: 2400, height: 100 });
  });

  it("never returns a zero side", () => {
    expect(targetDimensions(100000, 10, 2400)).toEqual({ width: 2400, height: 1 });
  });

  it("rejects invalid input", () => {
    expect(targetDimensions(0, 100, 2400)).toBeNull();
    expect(targetDimensions(100, -1, 2400)).toBeNull();
    expect(targetDimensions(NaN, 100, 2400)).toBeNull();
    expect(targetDimensions(100, 100, 0)).toBeNull();
  });
});

describe("planAttempts", () => {
  it("tries every quality at full size before shrinking", () => {
    const plan = planAttempts(4800, 3600);
    expect(plan.slice(0, QUALITY_STEPS.length).map((a) => a.quality)).toEqual([...QUALITY_STEPS]);
    expect(plan.slice(0, QUALITY_STEPS.length).every((a) => a.width === 2400)).toBe(true);
    expect(plan[QUALITY_STEPS.length].width).toBeLessThan(2400);
  });

  it("ends at the floor and never goes below it", () => {
    const plan = planAttempts(6000, 4000);
    expect(plan).toHaveLength(LONG_SIDE_STEPS.length * QUALITY_STEPS.length);
    const last = plan[plan.length - 1];
    expect(Math.max(last.width, last.height)).toBe(MIN_LONG_SIDE);
    for (const a of plan) expect(Math.max(a.width, a.height)).toBeGreaterThanOrEqual(MIN_LONG_SIDE);
  });

  it("does not repeat sizes for small images", () => {
    const plan = planAttempts(1000, 800);
    expect(plan).toHaveLength(QUALITY_STEPS.length);
    expect(new Set(plan.map((a) => `${a.width}x${a.height}`)).size).toBe(1);
  });

  it("collapses steps above the image's own size into one", () => {
    const plan = planAttempts(2000, 1500);
    // 2400 and 2100 both clamp to 2000, so the sizes are 2000, 1800, 1600.
    expect(plan.map((a) => a.width)).toEqual(
      [2000, 1800, 1600].flatMap((w) => QUALITY_STEPS.map(() => w)),
    );
  });

  it("returns nothing for invalid dimensions", () => {
    expect(planAttempts(0, 0)).toEqual([]);
  });
});

describe("fitsTarget", () => {
  it("accepts up to and including the target", () => {
    expect(fitsTarget(TARGET_IMAGE_BYTES)).toBe(true);
    expect(fitsTarget(TARGET_IMAGE_BYTES + 1)).toBe(false);
  });

  it("rejects empty output", () => {
    expect(fitsTarget(0)).toBe(false);
  });
});

describe("file kind detection", () => {
  it("recognizes magic bytes", () => {
    expect(sniffFileKind(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("jpeg");
    expect(sniffFileKind(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("png");
    expect(sniffFileKind(bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP")))).toBe("webp");
    expect(sniffFileKind(bytes(...ascii("%PDF-1.7")))).toBe("pdf");
    expect(sniffFileKind(bytes(0, 0, 0, 24, ...ascii("ftypheic")))).toBe("heic");
    expect(sniffFileKind(bytes(0, 0, 0, 24, ...ascii("ftypmif1")))).toBe("heic");
  });

  it("does not call other ISO media HEIC", () => {
    expect(sniffFileKind(bytes(0, 0, 0, 24, ...ascii("ftypmp42")))).toBeNull();
  });

  it("returns null for unknown or short input", () => {
    expect(sniffFileKind(bytes())).toBeNull();
    expect(sniffFileKind(bytes(1, 2, 3))).toBeNull();
  });

  it("prefers content over a wrong MIME type or extension", () => {
    const head = bytes(0xff, 0xd8, 0xff, 0xe0);
    expect(detectFileKind({ type: "application/pdf", name: "bill.pdf", head })).toBe("jpeg");
  });

  it("falls back to MIME type, then extension", () => {
    expect(detectFileKind({ type: "image/heif", name: "x" })).toBe("heic");
    expect(detectFileKind({ type: "", name: "IMG_0001.HEIC" })).toBe("heic");
    expect(detectFileKind({ type: "", name: "scan.JPG" })).toBe("jpeg");
    expect(detectFileKind({ type: "text/plain", name: "notes.txt" })).toBeNull();
    expect(detectFileKind({ type: "", name: "noextension" })).toBeNull();
  });
});

describe("checkPickedFile", () => {
  it("flags empty and unsupported files", () => {
    expect(checkPickedFile("jpeg", 0)).toBe("empty");
    expect(checkPickedFile(null, 100)).toBe("unsupported_type");
  });

  it("rejects PDFs over the limit but not at it", () => {
    expect(checkPickedFile("pdf", MAX_PDF_BYTES)).toBeNull();
    expect(checkPickedFile("pdf", MAX_PDF_BYTES + 1)).toBe("pdf_too_large");
  });

  it("lets large images through, since they get compressed", () => {
    expect(checkPickedFile("jpeg", 30 * 1024 * 1024)).toBeNull();
    expect(checkPickedFile("heic", 5 * 1024 * 1024)).toBeNull();
  });
});

describe("isServerFileError", () => {
  it("separates file problems from request problems", () => {
    expect(isServerFileError("pdf_too_many_pages")).toBe(true);
    expect(isServerFileError("pdf_encrypted")).toBe(true);
    expect(isServerFileError("network")).toBe(false);
    expect(isServerFileError("unauthenticated")).toBe(false);
  });
});

describe("formatBytes", () => {
  it("formats megabytes with one decimal", () => {
    expect(formatBytes(4.2 * 1024 * 1024)).toBe("4.2 MB");
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
  });

  it("formats kilobytes and never shows 0 KB", () => {
    expect(formatBytes(850 * 1024)).toBe("850 KB");
    expect(formatBytes(1)).toBe("1 KB");
    expect(formatBytes(0)).toBe("1 KB");
  });

  it("uses the locale's decimal separator", () => {
    expect(formatBytes(1.5 * 1024 * 1024, "es")).toBe("1,5 MB");
  });
});

describe("jpegFileName", () => {
  it("swaps the extension", () => {
    expect(jpegFileName("IMG_1.HEIC")).toBe("IMG_1.jpg");
    expect(jpegFileName("a.b.png")).toBe("a.b.jpg");
  });

  it("handles names without an extension or without a base", () => {
    expect(jpegFileName("scan")).toBe("scan.jpg");
    expect(jpegFileName(".png")).toBe(".png.jpg");
    expect(jpegFileName("")).toBe("photo.jpg");
  });
});
