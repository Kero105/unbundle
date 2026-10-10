import { describe, expect, it } from "vitest";
import { displayStatus, EXTRACTION_STALE_MS } from "./extraction-status";

const NOW = Date.parse("2026-10-10T12:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe("displayStatus", () => {
  it("keeps a recent extracting bill as extracting", () => {
    expect(displayStatus("extracting", ago(60_000), NOW)).toBe("extracting");
  });

  it("keeps extracting at exactly five minutes (boundary)", () => {
    expect(displayStatus("extracting", ago(EXTRACTION_STALE_MS), NOW)).toBe("extracting");
  });

  it("shows an extracting bill older than five minutes as failed", () => {
    expect(displayStatus("extracting", ago(EXTRACTION_STALE_MS + 1), NOW)).toBe("failed");
  });

  it("shows extracting with a missing or invalid start time as failed", () => {
    expect(displayStatus("extracting", null, NOW)).toBe("failed");
    expect(displayStatus("extracting", undefined, NOW)).toBe("failed");
    expect(displayStatus("extracting", "not a date", NOW)).toBe("failed");
  });

  it("does not change other statuses, however old", () => {
    const old = ago(EXTRACTION_STALE_MS * 10);
    expect(displayStatus("needs_review", old, NOW)).toBe("needs_review");
    expect(displayStatus("failed", old, NOW)).toBe("failed");
    expect(displayStatus("pending", old, NOW)).toBe("pending");
  });

  it("falls back to pending for unknown values", () => {
    expect(displayStatus("weird", null, NOW)).toBe("pending");
    expect(displayStatus(null, null, NOW)).toBe("pending");
  });
});
