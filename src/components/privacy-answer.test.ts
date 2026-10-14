import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { FAQ_PRIVACY_KEYS } from "@/lib/content/faq";

const root = path.resolve(__dirname, "../..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

// The privacy answer is shown on /privacy, in the FAQ and in Help. These tests
// fail if any of them starts carrying its own wording.
describe("privacy answer", () => {
  it("comes from the Privacy page's summary strings, in the page's order", () => {
    const component = read("src/components/privacy-answer.tsx");
    expect(component).toContain('getTranslations("Privacy.summary")');
    expect(component).toContain("FAQ_PRIVACY_KEYS");
    expect([...FAQ_PRIVACY_KEYS]).toEqual(["files", "anthropic", "delete", "sell", "storage"]);

    // /privacy renders its summary in this same key order.
    const privacyPage = read("src/app/privacy/page.tsx");
    expect(privacyPage).toContain('["files", "browser", "anthropic", "delete", "sell", "storage"]');
  });

  it("is the only privacy answer on the Help page and the FAQ", () => {
    for (const file of ["src/app/help/page.tsx", "src/app/faq/page.tsx"]) {
      expect(read(file), file).toContain("<PrivacyAnswer />");
    }
    // No separate answer text left in the Help or FAQ messages.
    for (const m of [en, es]) {
      expect(Object.keys(m.Help.faqs.privacy)).toEqual(["q"]);
      expect(Object.keys(m.FAQ.items.privacy)).toEqual(["q"]);
    }
  });

  it("includes the billing-code exception and the 30-day statement, in both languages", () => {
    const text = (m: typeof en | typeof es) => FAQ_PRIVACY_KEYS.map((k) => m.Privacy.summary[k]).join(" ");
    expect(text(en)).toContain("a single billing code");
    expect(text(en)).toContain("within 30 days");
    expect(text(es)).toContain("un código de facturación");
    expect(text(es)).toContain("30 días");
  });

  it("is not paraphrased anywhere else in the Help messages", () => {
    // The old Help answer began like this; it must not come back.
    for (const m of [en, es]) {
      expect(JSON.stringify(m.Help)).not.toMatch(/private folder that only your account can open|carpeta privada que solo su cuenta puede abrir/);
    }
  });
});
