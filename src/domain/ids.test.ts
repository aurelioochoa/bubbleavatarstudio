// FR-1 data layer: ID generation format (docs/03 §0)
import { describe, expect, it } from "vitest";
import { isId, newId } from "./ids";

describe("newId", () => {
  it("prefixes and uses lowercase base36 suffix", () => {
    const id = newId("bbl");
    expect(id.startsWith("bbl_")).toBe(true);
    expect(/^bbl_[a-z0-9]+$/.test(id)).toBe(true);
  });

  it("generates unique ids", () => {
    const seen = new Set(Array.from({ length: 500 }, () => newId("mood")));
    expect(seen.size).toBe(500);
  });

  it("honors injected randomness for deterministic tests", () => {
    expect(newId("loop", () => 0)).toBe("loop_0000000000");
  });
});

describe("isId", () => {
  it("accepts well-formed ids with matching prefix", () => {
    expect(isId("prim", "prim_abc123")).toBe(true);
  });
  it("rejects wrong prefix or malformed", () => {
    expect(isId("prim", "bbl_abc")).toBe(false);
    expect(isId("prim", "prim_")).toBe(false);
    expect(isId("prim", 42 as unknown as string)).toBe(false);
  });
});
