import { describe, expect, it } from "vitest";
import en from "../../../../../messages/en.json";
import es from "../../../../../messages/es.json";
import { composeLetter, parseLetterKind, type LetterFields } from "./letter-content";
import type { LetterItem, LetterModel } from "./letter-model";

const fields: LetterFields = {
  senderName: "Pat Example",
  senderAddress: "1 Test St\nSpringfield",
  accountNumber: "ACCT-0",
  providerName: "Synthetic Clinic",
  providerAddress: "",
  date: "2026-10-10",
};

function item(overrides: Partial<LetterItem> = {}): LetterItem {
  return {
    number: 1,
    findingId: "f1",
    reason: "duplicateCharge",
    tone: "firm",
    lines: [{ code: "93000", description: "ECG", dateOfService: "2026-10-02", chargeCents: 12345 }],
    amountInQuestionCents: 12345,
    ...overrides,
  };
}

const model = (...items: LetterItem[]): LetterModel => ({ items });

describe("composeLetter", () => {
  it("fills fields, formats money from cents, and localizes dates", () => {
    const c = composeLetter(model(item()), fields, "en", en.Letter.doc);
    expect(c.sender).toEqual(["Pat Example", "1 Test St", "Springfield"]);
    expect(c.account).toContain("ACCT-0");
    expect(c.date).toBe("October 10, 2026");
    expect(c.items[0].amountInQuestion).toContain("$123.45");
    expect(c.items[0].lines[0].date).toContain("Oct 2, 2026");
    expect(c.footer).toMatch(/Unbundle/);
    expect(c.footer).toMatch(/not legal advice/);
  });

  it("uses bracketed placeholders for blank fields", () => {
    const c = composeLetter(model(item()), { ...fields, senderName: " ", providerAddress: "", accountNumber: "" }, "en", en.Letter.doc);
    expect(c.sender[0]).toBe(en.Letter.doc.placeholders.senderName);
    expect(c.recipient[1]).toBe(en.Letter.doc.placeholders.providerAddress);
    expect(c.account).toContain(en.Letter.doc.placeholders.accountNumber);
    expect(c.signature).toBe(en.Letter.doc.placeholders.senderName);
  });

  it("picks the soft reason for soft items and the firm reason otherwise", () => {
    const c = composeLetter(
      model(item(), item({ number: 2, tone: "soft" })),
      fields,
      "en",
      en.Letter.doc,
    );
    expect(c.items[0].reason).toBe(en.Letter.doc.reasons.duplicateCharge.firm);
    expect(c.items[1].reason).toBe(en.Letter.doc.reasons.duplicateCharge.soft);
  });

  it("words every reason as a question, in both languages", () => {
    for (const [locale, doc] of [["en", en.Letter.doc], ["es", es.Letter.doc]] as const) {
      for (const [reason, variants] of Object.entries(doc.reasons)) {
        for (const tone of ["firm", "soft"] as const) {
          const c = composeLetter(
            model(item({ reason: reason as LetterItem["reason"], tone })),
            fields,
            locale,
            doc,
          );
          expect(c.items[0].reason, `${locale}.${reason}.${tone}`).toBe(variants[tone]);
          expect(variants[tone], `${locale}.${reason}.${tone}`).toMatch(/\?/);
        }
      }
    }
  });

  it("handles lines without a code or date", () => {
    const c = composeLetter(
      model(item({ lines: [{ code: null, description: "SUPPLIES", dateOfService: null, chargeCents: 100 }] })),
      fields,
      "es",
      es.Letter.doc,
    );
    expect(c.items[0].lines[0].heading).toContain(es.Letter.doc.line.noCode);
    expect(c.items[0].lines[0].date).toContain(es.Letter.doc.line.noDate);
  });

  it("composes in Spanish", () => {
    const c = composeLetter(model(item(), item({ number: 2 })), fields, "es", es.Letter.doc);
    expect(c.date).toBe("10 de octubre de 2026");
    expect(c.subject).toBe(es.Letter.doc.subject);
    expect(c.intro).toContain("los puntos indicados");
  });

  it("composes an empty model without items", () => {
    const c = composeLetter(model(), fields, "en", en.Letter.doc);
    expect(c.items).toEqual([]);
  });

  it("is a pure function of its inputs: en, es, en leaves no Spanish behind", () => {
    const m = model(item(), item({ number: 2, tone: "soft" }));
    const first = composeLetter(m, fields, "en", en.Letter.doc);
    const spanish = composeLetter(m, fields, "es", es.Letter.doc);
    const again = composeLetter(m, fields, "en", en.Letter.doc);

    expect(spanish).not.toEqual(first);
    expect(spanish.subject).toBe(es.Letter.doc.subject);
    expect(spanish.date).not.toBe(first.date);
    expect(spanish.items[0].reason).not.toBe(first.items[0].reason);
    expect(again).toEqual(first);
    expect(again.locale).toBe("en");
  });
});

describe("itemized bill request", () => {
  const empty = model();

  it("works with no flagged items, in English", () => {
    const c = composeLetter(empty, fields, "en", en.Letter.doc, "itemized");
    expect(c.kind).toBe("itemized");
    expect(c.items).toEqual([]);
    expect(c.subject).toBe(en.Letter.doc.itemized.subject);
    expect(c.requests).toEqual([
      en.Letter.doc.itemized.requests.itemizedStatement,
      en.Letter.doc.itemized.requests.assistancePolicy,
    ]);
    expect(c.requests[0]).toMatch(/CPT or HCPCS/);
    expect(c.requests[0]).toMatch(/units/);
    expect(c.requests[1]).toMatch(/financial assistance/);
    expect(c.response).toMatch(/30 days/);
    expect(c.footer).toMatch(/not legal advice/);
  });

  it("works in Spanish with the formal register", () => {
    const c = composeLetter(empty, fields, "es", es.Letter.doc, "itemized");
    expect(c.locale).toBe("es");
    expect(c.subject).toBe(es.Letter.doc.itemized.subject);
    expect(c.requests[0]).toMatch(/CPT o HCPCS/);
    expect(c.requests[1]).toMatch(/asistencia financiera/);
    expect(c.response).toMatch(/30 días/);
    expect(c.salutation).toBe(es.Letter.doc.salutation);
  });

  it("ignores flagged items so the two letters never mix", () => {
    const c = composeLetter(model(item()), fields, "en", en.Letter.doc, "itemized");
    expect(c.items).toEqual([]);
    expect(c.intro).toBe(en.Letter.doc.itemized.intro);
  });

  it("uses bracketed placeholders for blank sender fields", () => {
    const blank = { ...fields, senderName: "", senderAddress: "", accountNumber: "", providerName: "", providerAddress: "" };
    for (const [locale, doc] of [["en", en.Letter.doc], ["es", es.Letter.doc]] as const) {
      const c = composeLetter(empty, blank, locale, doc, "itemized");
      expect(c.sender).toEqual([doc.placeholders.senderName, doc.placeholders.senderAddress]);
      expect(c.recipient).toEqual([doc.placeholders.providerName, doc.placeholders.providerAddress]);
      expect(c.account).toContain(doc.placeholders.accountNumber);
      expect(c.signature).toBe(doc.placeholders.senderName);
    }
  });

  it("defaults to the dispute letter", () => {
    expect(composeLetter(model(item()), fields, "en", en.Letter.doc).kind).toBe("dispute");
  });
});

describe("parseLetterKind", () => {
  it("accepts only known kinds", () => {
    expect(parseLetterKind("itemized")).toBe("itemized");
    expect(parseLetterKind("dispute")).toBe("dispute");
    expect(parseLetterKind("other")).toBeUndefined();
    expect(parseLetterKind(["itemized"])).toBeUndefined();
    expect(parseLetterKind(undefined)).toBeUndefined();
  });
});
