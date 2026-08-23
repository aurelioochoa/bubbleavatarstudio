// FR-2 geometry determinism and shapes.
import { describe, expect, it } from "vitest";
import {
  blobPath,
  capsulePath,
  circlePath,
  ringPath,
  clamp,
  lerp,
} from "./primitives";

describe("blobPath", () => {
  it("is deterministic", () => {
    const a = blobPath({ width: 220, height: 200, roundness: 0.85 });
    const b = blobPath({ width: 220, height: 200, roundness: 0.85 });
    expect(a).toBe(b);
  });

  it("roundness 1 approximates the bounding box extents", () => {
    const p = blobPath({ width: 200, height: 100, roundness: 1 });
    expect(p).toContain("M 100 0");
    expect(p).toContain("L -100 0");
  });

  it("roundness 0 stays inside the box corners", () => {
    const p = blobPath({ width: 200, height: 100, roundness: 0 });
    // rectangle corner sample must not exceed half-extents
    expect(p.startsWith("M")).toBe(true);
    const nums = p.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    for (const n of nums) expect(Math.abs(n)).toBeLessThanOrEqual(100.01);
  });
});

describe("other primitives", () => {
  it("capsule has arcs and is closed", () => {
    const p = capsulePath(60, 100);
    expect(p).toContain("A");
    expect(p.endsWith("Z")).toBe(true);
  });

  it("circle and ring are closed", () => {
    expect(circlePath(40).endsWith("Z")).toBe(true);
    expect(ringPath(60, 8).endsWith("Z")).toBe(true);
    expect(ringPath(60, 8)).toContain("M -30 0");
  });
});

describe("math utils", () => {
  it("clamp and lerp", () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(lerp(0, 10, 0.5)).toBe(5);
  });
});
