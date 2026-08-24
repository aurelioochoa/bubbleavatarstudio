// FR-2 geometry determinism and shapes.
import { describe, expect, it } from "vitest";
import {
  blobPath,
  fmtScale,
  smoothClosedPath,
  superellipsePoints,
  capsulePath,
  circlePath,
  ringPath,
  clamp,
  lerp,
} from "./primitives";

/**
 * How close the path comes to the bounding-box corner, 0..1: 1 is a rectangle,
 * an ellipse sits near 0.7.
 */
function cornerReach(path: string): number {
  const points = [...path.matchAll(/(-?[0-9.]+) (-?[0-9.]+)/g)].map((m) => ({
    x: Number(m[1]) / 100,
    y: Number(m[2]) / 50,
  }));
  return Math.max(...points.map((p) => Math.min(Math.abs(p.x), Math.abs(p.y))));
}

describe("smoothClosedPath", () => {
  it("emits curves rather than straight segments", () => {
    const path = blobPath({ width: 200, height: 100, roundness: 1 });
    expect(path).toContain("C ");
    expect(path).not.toContain("L ");
    expect(path.endsWith("Z")).toBe(true);
  });

  it("passes through every sampled point", () => {
    const pts = superellipsePoints({ width: 200, height: 100, roundness: 1 });
    const path = smoothClosedPath(pts);
    // Each curve ends on its knot, so every sample appears in the output.
    for (const p of pts.slice(1, 5)) {
      expect(path).toContain(`${String(Math.round(p.x * 100) / 100)} ${String(Math.round(p.y * 100) / 100)}`);
    }
  });

  it("degenerate input yields an empty path rather than nonsense", () => {
    expect(smoothClosedPath([])).toBe("");
    expect(smoothClosedPath([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe("");
  });
});

describe("fmtScale", () => {
  it("keeps enough precision for a multiplier near 1", () => {
    // Breathing spans well under a hundredth; two decimals would step.
    expect(fmtScale(1.0075)).toBe("1.0075");
    expect(fmtScale(1.00749)).not.toBe(fmtScale(1.0061));
    expect(fmtScale(-0)).toBe("0");
  });
});

describe("blobPath", () => {
  it("is deterministic", () => {
    const a = blobPath({ width: 220, height: 200, roundness: 0.85 });
    const b = blobPath({ width: 220, height: 200, roundness: 0.85 });
    expect(a).toBe(b);
  });

  it("roundness 1 is an ellipse through the bounding box extents", () => {
    const p = blobPath({ width: 200, height: 100, roundness: 1 });
    expect(p).toContain("M 100 0");
    // The outline is a spline, so the far extent is a curve endpoint.
    expect(p).toContain("-100 0");
    // A quarter turn around an ellipse lands near the diagonal, well inside
    // the corner a rectangle would reach.
    const corner = cornerReach(p);
    expect(corner).toBeLessThan(0.8);
  });

  it("roundness 0 squares off toward the box corners", () => {
    const p = blobPath({ width: 200, height: 100, roundness: 0 });
    expect(cornerReach(p)).toBeGreaterThan(0.9);
    const nums = p.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    for (const n of nums) expect(Math.abs(n)).toBeLessThanOrEqual(100.01);
  });

  it("reads as increasingly round as roundness rises", () => {
    const reach = (r: number) =>
      cornerReach(blobPath({ width: 200, height: 100, roundness: r }));
    expect(reach(0)).toBeGreaterThan(reach(0.5));
    expect(reach(0.5)).toBeGreaterThan(reach(1));
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
