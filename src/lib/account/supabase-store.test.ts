import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createSupabaseAccountStore } from "./supabase-store";

type Entry = { name: string; id: string | null };

function fakeClient(tree: Record<string, Entry[]>, billRows: { id: string }[] = []) {
  const list = vi.fn(async (folder: string) => ({ data: tree[folder] ?? [], error: null }));
  const remove = vi.fn(async () => ({ error: null }));
  const range = vi.fn(async () => ({ data: billRows, error: null }));
  const client = {
    storage: { from: () => ({ list, remove }) },
    from: () => ({ select: () => ({ order: () => ({ range }) }) }),
  } as unknown as SupabaseClient;
  return { client, list };
}

describe("createSupabaseAccountStore", () => {
  it("lists every file under the user's folder, including bill subfolders", async () => {
    const { client, list } = fakeClient({
      u1: [
        { name: "bill-a", id: null },
        { name: "loose.png", id: "obj1" },
      ],
      "u1/bill-a": [
        { name: "one.jpg", id: "obj2" },
        { name: "two.pdf", id: "obj3" },
      ],
    });
    const paths = await createSupabaseAccountStore(client, "u1").listStoredPaths();
    expect(paths.sort()).toEqual(["u1/bill-a/one.jpg", "u1/bill-a/two.pdf", "u1/loose.png"]);
    expect(list).toHaveBeenCalledWith("u1", expect.anything());
  });

  it("only ever lists under the given user id", async () => {
    const { client, list } = fakeClient({ u1: [{ name: "b", id: null }], "u1/b": [] });
    await createSupabaseAccountStore(client, "u1").listStoredPaths();
    for (const [folder] of list.mock.calls) expect(folder.startsWith("u1")).toBe(true);
  });

  it("lists bill ids through the user-scoped client", async () => {
    const { client } = fakeClient({}, [{ id: "b1" }, { id: "b2" }]);
    expect(await createSupabaseAccountStore(client, "u1").listBillIds()).toEqual(["b1", "b2"]);
  });
});
