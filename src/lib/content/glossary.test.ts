import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import { GLOSSARY_TERM_KEYS } from "./glossary-terms";

const both = [
  ["en", en],
  ["es", es],
] as const;

describe("glossary", () => {
  it.each(both)("defines every term in %s and carries the CPT attribution", (_, messages) => {
    for (const key of GLOSSARY_TERM_KEYS) {
      const term = messages.Glossary.terms[key];
      expect(term.term.length, key).toBeGreaterThan(0);
      expect(term.definition.length, key).toBeGreaterThan(0);
    }
    expect(messages.Glossary.attribution).toContain("CPT®");
  });

  it("has no term in the messages that the page does not list", () => {
    expect(Object.keys(en.Glossary.terms).sort()).toEqual([...GLOSSARY_TERM_KEYS].sort());
  });
});
