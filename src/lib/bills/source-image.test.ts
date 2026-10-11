import { describe, expect, it } from "vitest";
import {
  ZOOM_MAX,
  ZOOM_MIN,
  boxAppliesToPage,
  boxToCss,
  clampUnit,
  clampZoom,
} from "./source-image";

describe("boxToCss", () => {
  it("converts a normalized box to percentages", () => {
    expect(boxToCss({ x: 0.05, y: 0.25, width: 0.9, height: 0.035 })).toEqual({
      left: "5%",
      top: "25%",
      width: "90%",
      height: "3.5%",
    });
  });

  it("returns null for a missing box", () => {
    expect(boxToCss(null)).toBeNull();
    expect(boxToCss(undefined)).toBeNull();
  });

  it("returns null for an empty box", () => {
    expect(boxToCss({ x: 0.2, y: 0.2, width: 0, height: 0.1 })).toBeNull();
    expect(boxToCss({ x: 0.2, y: 0.2, width: 0.1, height: 0 })).toBeNull();
  });

  it("keeps a box that overflows the page inside it", () => {
    expect(boxToCss({ x: 0.9, y: 0.95, width: 0.5, height: 0.5 })).toEqual({
      left: "90%",
      top: "95%",
      width: "10%",
      height: "5%",
    });
  });

  it("returns null when the box starts at the far edge", () => {
    expect(boxToCss({ x: 1, y: 0.5, width: 0.2, height: 0.1 })).toBeNull();
  });

  it("clamps out-of-range and non-finite values", () => {
    expect(boxToCss({ x: -1, y: 0, width: 0.5, height: 0.5 })?.left).toBe("0%");
    expect(boxToCss({ x: Number.NaN, y: 0, width: 0.5, height: 0.5 })?.left).toBe("0%");
  });
});

describe("clampUnit", () => {
  it("clamps to 0..1", () => {
    expect(clampUnit(-0.5)).toBe(0);
    expect(clampUnit(2)).toBe(1);
    expect(clampUnit(0.4)).toBe(0.4);
    expect(clampUnit(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("clampZoom", () => {
  it("stays within the allowed range", () => {
    expect(clampZoom(0.1)).toBe(ZOOM_MIN);
    expect(clampZoom(10)).toBe(ZOOM_MAX);
    expect(clampZoom(1.5)).toBe(1.5);
    expect(clampZoom(Number.NaN)).toBe(ZOOM_MIN);
  });
});

describe("boxAppliesToPage", () => {
  it("matches only the same page", () => {
    expect(boxAppliesToPage(1, 1)).toBe(true);
    expect(boxAppliesToPage(2, 1)).toBe(false);
  });
});
