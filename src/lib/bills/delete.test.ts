import { describe, expect, it, vi } from "vitest";
import { deleteBill, type BillDeletionStore } from "./delete";

function makeStore(overrides: Partial<BillDeletionStore> = {}) {
  const calls: string[] = [];
  const store = {
    listFilePaths: vi.fn(async () => {
      calls.push("list");
      return ["u/b/1.png", "u/b/2.pdf"];
    }),
    removeFiles: vi.fn(async () => {
      calls.push("remove");
    }),
    deleteBillRow: vi.fn(async () => {
      calls.push("row");
      return true;
    }),
    ...overrides,
  } satisfies BillDeletionStore;
  return { store, calls };
}

describe("deleteBill", () => {
  it("removes the stored files, then the rows", async () => {
    const { store, calls } = makeStore();
    expect(await deleteBill(store, "b")).toEqual({ ok: true });
    expect(store.removeFiles).toHaveBeenCalledWith(["u/b/1.png", "u/b/2.pdf"]);
    expect(calls).toEqual(["list", "remove", "row"]);
  });

  it("skips storage when the bill has no files", async () => {
    const { store } = makeStore({ listFilePaths: vi.fn(async () => []) });
    expect(await deleteBill(store, "b")).toEqual({ ok: true });
    expect(store.removeFiles).not.toHaveBeenCalled();
    expect(store.deleteBillRow).toHaveBeenCalled();
  });

  it("keeps the rows when storage removal fails, so the user can retry", async () => {
    const { store } = makeStore({
      removeFiles: vi.fn(async () => {
        throw new Error("storage down");
      }),
    });
    expect(await deleteBill(store, "b")).toEqual({ ok: false, reason: "failed" });
    expect(store.deleteBillRow).not.toHaveBeenCalled();
  });

  it("reports not_found when no row was removed (not the caller's bill, or already gone)", async () => {
    const { store } = makeStore({
      listFilePaths: vi.fn(async () => []),
      deleteBillRow: vi.fn(async () => false),
    });
    expect(await deleteBill(store, "b")).toEqual({ ok: false, reason: "not_found" });
  });

  it("reports failed when the row delete throws", async () => {
    const { store } = makeStore({
      deleteBillRow: vi.fn(async () => {
        throw new Error("db");
      }),
    });
    expect(await deleteBill(store, "b")).toEqual({ ok: false, reason: "failed" });
  });
});
