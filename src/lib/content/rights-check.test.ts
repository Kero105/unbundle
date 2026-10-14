import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("standalone checker privacy", () => {
  const root = path.resolve(__dirname, "../../..");
  const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

  it("the form never reaches the network, storage or logs", () => {
    const form = read("src/app/bills/[id]/assistance/assistance-form.tsx");
    for (const banned of [
      "fetch(",
      "XMLHttpRequest",
      "sendBeacon",
      "localStorage",
      "sessionStorage",
      "indexedDB",
      "document.cookie",
      "console.",
      "useActionState",
      "action=",
    ]) {
      expect(form, banned).not.toContain(banned);
    }
    expect(form).toContain("event.preventDefault()");
  });

  it("the page uses the bundled guidelines, not the database or the service role", () => {
    const page = read("src/app/rights/check/page.tsx");
    expect(page).not.toMatch(/supabase|service[_-]?role/i);
    expect(page).toContain("getDemoPovertyGuidelines");
  });
});
