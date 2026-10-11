import { describe, expect, it, vi } from "vitest";
import { loadSourceFile, type SourceFileStore } from "./source-file";

const USER = "11111111-1111-4111-8111-111111111111";
const BILL = "22222222-2222-4222-8222-222222222222";

function store(overrides: Partial<SourceFileStore> = {}): SourceFileStore {
  return {
    findBillFile: vi.fn(async () => ({
      storagePath: `${USER}/${BILL}/file.jpg`,
      mimeType: "image/jpeg",
    })),
    signUrl: vi.fn(async () => "https://example.test/signed"),
    ...overrides,
  };
}

describe("loadSourceFile", () => {
  it("signs an image for about five minutes", async () => {
    const s = store();
    const result = await loadSourceFile(s, USER, BILL);
    expect(result).toEqual({ kind: "image", url: "https://example.test/signed" });
    expect(s.signUrl).toHaveBeenCalledWith(`${USER}/${BILL}/file.jpg`, 300);
  });

  it("returns a pdf kind for PDFs", async () => {
    const s = store({
      findBillFile: async () => ({ storagePath: `${USER}/${BILL}/f.pdf`, mimeType: "application/pdf" }),
    });
    expect((await loadSourceFile(s, USER, BILL)).kind).toBe("pdf");
  });

  it("is unavailable when there is no file", async () => {
    const s = store({ findBillFile: async () => null });
    expect(await loadSourceFile(s, USER, BILL)).toEqual({ kind: "unavailable" });
    expect(s.signUrl).not.toHaveBeenCalled();
  });

  it("refuses a path outside the caller's folder", async () => {
    const s = store({
      findBillFile: async () => ({
        storagePath: `33333333-3333-4333-8333-333333333333/${BILL}/f.jpg`,
        mimeType: "image/jpeg",
      }),
    });
    expect(await loadSourceFile(s, USER, BILL)).toEqual({ kind: "unavailable" });
    expect(s.signUrl).not.toHaveBeenCalled();
  });

  it("refuses unknown mime types", async () => {
    const s = store({
      findBillFile: async () => ({ storagePath: `${USER}/${BILL}/f.svg`, mimeType: "image/svg+xml" }),
    });
    expect(await loadSourceFile(s, USER, BILL)).toEqual({ kind: "unavailable" });
  });

  it("fails closed when signing fails or throws", async () => {
    expect(await loadSourceFile(store({ signUrl: async () => null }), USER, BILL)).toEqual({
      kind: "unavailable",
    });
    expect(
      await loadSourceFile(
        store({
          signUrl: async () => {
            throw new Error("boom");
          },
        }),
        USER,
        BILL,
      ),
    ).toEqual({ kind: "unavailable" });
  });
});
