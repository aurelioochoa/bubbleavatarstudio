// Colour maths under the shaded solid (FR-2.8) — no FR of its own, because
// nothing here is a requirement a user can state, only the arithmetic the
// visible ones run on. Pure and total: no input should be able to produce an
// unparseable colour, because it ends up in an SVG fill.
import { describe, expect, it } from "vitest";
import { darken, lighten, luminance, mix, parseHex, toHex } from "./color";

describe("parseHex", () => {
  it("reads long and short forms", () => {
    expect(parseHex("#6c7bff")).toEqual({ r: 108, g: 123, b: 255 });
    expect(parseHex("#08f")).toEqual({ r: 0, g: 136, b: 255 });
    expect(parseHex("6c7bff")).toEqual({ r: 108, g: 123, b: 255 });
  });

  it("falls back to grey rather than producing NaN", () => {
    for (const bad of ["", "#xyz", "not a colour", "#12345"]) {
      const rgb = parseHex(bad);
      expect(Number.isFinite(rgb.r)).toBe(true);
      expect(toHex(rgb)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe("mix", () => {
  it("interpolates and clamps the ends", () => {
    expect(mix("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mix("#000000", "#ffffff", 1)).toBe("#ffffff");
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mix("#000000", "#ffffff", 5)).toBe("#ffffff");
    expect(mix("#000000", "#ffffff", -5)).toBe("#000000");
  });
});

describe("lighten and darken", () => {
  it("move brightness in the expected direction", () => {
    const base = "#6c7bff";
    expect(luminance(lighten(base, 0.3))).toBeGreaterThan(luminance(base));
    expect(luminance(darken(base, 0.3))).toBeLessThan(luminance(base));
  });

  it("stay in range at the extremes", () => {
    expect(lighten("#ffffff", 1)).toBe("#ffffff");
    expect(darken("#000000", 1)).toBe("#000000");
  });
});

describe("luminance", () => {
  it("orders black, mid and white", () => {
    expect(luminance("#000000")).toBe(0);
    expect(luminance("#ffffff")).toBe(1);
    expect(luminance("#808080")).toBeGreaterThan(0.4);
    expect(luminance("#808080")).toBeLessThan(0.6);
  });
});
