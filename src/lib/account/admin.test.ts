import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { deleteUser, createClient } = vi.hoisted(() => {
  const deleteUser = vi.fn();
  return { deleteUser, createClient: vi.fn(() => ({ auth: { admin: { deleteUser } } })) };
});
vi.mock("@supabase/supabase-js", () => ({ createClient }));

import { deleteAuthUser } from "./admin";

describe("deleteAuthUser", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key-test";
    deleteUser.mockReset();
    createClient.mockClear();
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it("deletes exactly the given user with a non-persistent admin client", async () => {
    deleteUser.mockResolvedValue({ error: null });
    await deleteAuthUser("user-1");
    expect(deleteUser).toHaveBeenCalledWith("user-1");
    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "service-key-test",
      expect.objectContaining({ auth: expect.objectContaining({ persistSession: false }) }),
    );
  });

  it("throws an opaque error when Supabase refuses", async () => {
    deleteUser.mockResolvedValue({ error: { message: "user 123 has secrets" } });
    await expect(deleteAuthUser("user-1")).rejects.toThrow("auth_delete_failed");
  });

  it("does nothing without the key", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    await expect(deleteAuthUser("user-1")).rejects.toThrow("admin_unavailable");
    expect(createClient).not.toHaveBeenCalled();
  });
});
