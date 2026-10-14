import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";

describe("call script copy", () => {
  it("asks something for every reason key the report can produce, in both languages", () => {
    const why = Object.keys(en.Report.why).sort();
    expect(Object.keys(en.CallScript.ask).sort()).toEqual(why);
    expect(Object.keys(es.CallScript.ask).sort()).toEqual(why);
  });
});
