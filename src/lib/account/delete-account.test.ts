import { describe, expect, it, vi } from "vitest";
import { deleteAccount } from "./delete-account";
import type { AccountDataStore } from "./delete-data";

function store(overrides: Partial<AccountDataStore> = {}): AccountDataStore {
  return {
    listBillIds: vi.fn(async () => ["b1"]),
    listFilePaths: vi.fn(async () => []),
    removeFiles: vi.fn(async () => {}),
    deleteBillRow: vi.fn(async () => true),
    listStoredPaths: vi.fn(async () => []),
    ...overrides,
  };
}

describe("deleteAccount", () => {
  it("removes the data, then the auth user", async () => {
    const order: string[] = [];
    const s = store({
      deleteBillRow: vi.fn(async () => {
        order.push("data");
        return true;
      }),
    });
    const removeAuthUser = vi.fn(async () => {
      order.push("auth");
    });
    expect(await deleteAccount({ store: s, removeAuthUser }, "user-1")).toEqual({ ok: true });
    expect(order).toEqual(["data", "auth"]);
    expect(removeAuthUser).toHaveBeenCalledWith("user-1");
  });

  it("leaves the sign-in account alone when data could not be removed", async () => {
    const removeAuthUser = vi.fn();
    const s = store({
      removeFiles: vi.fn(async () => {
        throw new Error("down");
      }),
      listFilePaths: vi.fn(async () => ["u/b1/f.png"]),
    });
    expect(await deleteAccount({ store: s, removeAuthUser }, "user-1")).toEqual({
      ok: false,
      reason: "data_failed",
    });
    expect(removeAuthUser).not.toHaveBeenCalled();
  });

  it("reports auth_failed when the account removal fails after the data is gone", async () => {
    const removeAuthUser = vi.fn(async () => {
      throw new Error("auth down");
    });
    expect(await deleteAccount({ store: store(), removeAuthUser }, "user-1")).toEqual({
      ok: false,
      reason: "auth_failed",
    });
  });
});
