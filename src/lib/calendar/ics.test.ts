import { describe, expect, it } from "vitest";
import { addDays, buildIcs } from "./ics";

const base = {
  date: "2026-03-02",
  summary: "Follow up on your bill",
  description: "Check in, then call.",
  uid: "abc-123",
  stamp: "20260101T000000Z",
};

describe("addDays", () => {
  it("adds calendar days across month and year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("handles the 120-day boundary, including a leap year", () => {
    expect(addDays("2026-01-01", 120)).toBe("2026-05-01");
    expect(addDays("2028-01-01", 120)).toBe("2028-04-30");
  });

  it("returns null for impossible dates and non-integer days", () => {
    expect(addDays("2026-02-30", 1)).toBeNull();
    expect(addDays("not a date", 1)).toBeNull();
    expect(addDays("", 1)).toBeNull();
    expect(addDays("2026-01-01", 1.5)).toBeNull();
  });
});

describe("buildIcs", () => {
  it("builds a CRLF all-day event whose end is the next day", () => {
    const out = buildIcs(base)!;
    expect(out.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(out.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(out).toContain("DTSTART;VALUE=DATE:20260302\r\n");
    expect(out).toContain("DTEND;VALUE=DATE:20260303\r\n");
    expect(out.replace(/\r\n/g, "")).not.toContain("\n");
  });

  it("rolls the end date over a month boundary", () => {
    expect(buildIcs({ ...base, date: "2026-02-28" })).toContain("DTEND;VALUE=DATE:20260301");
  });

  it("escapes commas, semicolons, backslashes and newlines in text", () => {
    const out = buildIcs({ ...base, summary: "a,b;c\\d\ne" })!;
    expect(out).toContain("SUMMARY:a\\,b\;c\\\\d\\ne\r\n");
  });

  it("folds long lines at 75 octets", () => {
    const out = buildIcs({ ...base, description: "x".repeat(200) })!;
    for (const line of out.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    // Unfolding restores the original text.
    expect(out.replace(/\r\n /g, "")).toContain(`DESCRIPTION:${"x".repeat(200)}`);
  });

  it("does not split a multi-byte character when folding", () => {
    const out = buildIcs({ ...base, description: "ñ".repeat(100) })!;
    expect(out.replace(/\r\n /g, "")).toContain(`DESCRIPTION:${"ñ".repeat(100)}`);
  });

  it("rejects an invalid date, stamp or empty uid", () => {
    expect(buildIcs({ ...base, date: "2026-13-01" })).toBeNull();
    expect(buildIcs({ ...base, date: "" })).toBeNull();
    expect(buildIcs({ ...base, stamp: "2026-01-01" })).toBeNull();
    expect(buildIcs({ ...base, uid: "  " })).toBeNull();
  });

  it("contains only what the caller passed in", () => {
    const out = buildIcs(base)!;
    expect(out).toContain("SUMMARY:Follow up on your bill");
    expect(out).not.toMatch(/\$|ATTENDEE|ORGANIZER|LOCATION/);
  });
});
