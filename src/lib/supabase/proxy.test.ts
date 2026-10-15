import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getClaims = vi.fn();
const createServerClient = vi.fn(() => ({ auth: { getClaims } }));
vi.mock("@supabase/ssr", () => ({ createServerClient: (...a: unknown[]) => createServerClient(...(a as [])) }));

import { hasAuthCookie, updateSession } from "./proxy";

function req(path: string, cookie?: string) {
  return new NextRequest(`https://example.test${path}`, {
    headers: cookie ? { cookie } : {},
  });
}

const SESSION = "sb-abc-auth-token=x";

beforeEach(() => {
  getClaims.mockReset();
  createServerClient.mockClear();
});

describe("updateSession", () => {
  it("does not call auth for a public page without a session cookie", async () => {
    const res = await updateSession(req("/privacy"));
    expect(res.status).toBe(200);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it.each(["/dashboard", "/settings", "/bills/abc/review"])(
    "redirects %s when signed out, without calling auth",
    async (path) => {
      const res = await updateSession(req(path));
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname).toBe("/");
      expect(createServerClient).not.toHaveBeenCalled();
    },
  );

  it("redirects a protected path when the cookie holds no valid claims", async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error("bad") });
    const res = await updateSession(req("/dashboard", SESSION));
    expect(res.status).toBe(307);
  });

  it("lets a signed-in user through using getClaims", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } }, error: null });
    const res = await updateSession(req("/bills/abc/review", SESSION));
    expect(res.status).toBe(200);
    expect(getClaims).toHaveBeenCalledTimes(1);
  });

  it("refreshes a signed-in user's session on a public page", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } }, error: null });
    await updateSession(req("/privacy", SESSION));
    expect(getClaims).toHaveBeenCalledTimes(1);
  });
});

describe("hasAuthCookie", () => {
  it("recognizes plain and chunked auth cookies only", () => {
    expect(hasAuthCookie(req("/", "sb-abc-auth-token.0=a; sb-abc-auth-token.1=b"))).toBe(true);
    expect(hasAuthCookie(req("/", "NEXT_LOCALE=es; theme=dark"))).toBe(false);
    expect(hasAuthCookie(req("/", "sb-abc-auth-token-code-verifier=z"))).toBe(false);
  });
});
