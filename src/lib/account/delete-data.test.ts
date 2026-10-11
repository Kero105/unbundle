import { describe, expect, it, vi } from "vitest";
import { deleteAllBills, type AccountDataStore } from "./delete-data";

function makeStore(overrides: Partial<AccountDataStore> = {}) {
  const calls: string[] = [];
  const store: AccountDataStore = {
    listBillIds: vi.fn(async () => ["b1", "b2"]),
    listFilePaths: vi.fn(async (id: string) => [`u/${id}/f.png`]),
    removeFiles: vi.fn(async (paths: string[]) => {
      calls.push(`remove:${paths.join(",")}`);
    }),
    deleteBillRow: vi.fn(async (id: string) => {
      calls.push(`row:${id}`);
      return true;
    }),
    listStoredPaths: vi.fn(async () => []),
    ...overrides,
  };
  return { store, calls };
}

describe("deleteAllBills", () => {
  it("deletes every bill with the single-bill logic: files, then rows", async () => {
    const { store, calls } = makeStore();
    expect(await deleteAllBills(store)).toEqual({ ok: true, bills: 2 });
    expect(calls).toEqual(["remove:u/b1/f.png", "row:b1", "remove:u/b2/f.png", "row:b2"]);
  });

  it("succeeds with no bills", async () => {
    const { store } = makeStore({ listBillIds: vi.fn(async () => []) });
    expect(await deleteAllBills(store)).toEqual({ ok: true, bills: 0 });
    expect(store.deleteBillRow).not.toHaveBeenCalled();
  });

  it("counts a bill that is already gone as deleted", async () => {
    const { store } = makeStore({ deleteBillRow: vi.fn(async () => false) });
    expect(await deleteAllBills(store)).toEqual({ ok: true, bills: 2 });
  });

  it("sweeps leftover files in the user's folder", async () => {
    const { store } = makeStore({ listStoredPaths: vi.fn(async () => ["u/orphan/x.jpg"]) });
    await deleteAllBills(store);
    expect(store.removeFiles).toHaveBeenLastCalledWith(["u/orphan/x.jpg"]);
  });

  it("reports failure and keeps going when one bill cannot be deleted", async () => {
    const { store } = makeStore({
      removeFiles: vi.fn(async (paths: string[]) => {
        if (paths[0].includes("b1")) throw new Error("storage down");
      }),
    });
    const result = await deleteAllBills(store);
    expect(result).toEqual({ ok: false, reason: "failed", remaining: 1 });
    expect(store.deleteBillRow).toHaveBeenCalledTimes(1);
    expect(store.deleteBillRow).toHaveBeenCalledWith("b2");
  });

  it("fails when listing fails", async () => {
    const { store } = makeStore({
      listBillIds: vi.fn(async () => {
        throw new Error("db");
      }),
    });
    expect(await deleteAllBills(store)).toMatchObject({ ok: false, reason: "failed" });
  });
});
