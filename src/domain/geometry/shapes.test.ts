// Shape families (FR-2.6, FR-2.7). Each family is a deterministic function of
// its parameters — the renderer, the goldens and the exported files all depend
// on identical input producing identical bytes.
import { describe, expect, it } from "vitest";
import { surfacePath } from "./shapes";
import { blobPath } from "./primitives";

const SIZE = { width: 220, height: 200, roundness: 0.9 };

/** Sampled points of a path, as fractions of the half-extents. */
function points(path: string): { x: number; y: number }[] {
  return [...path.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
  }));
}

const maxRadius = (path: string): number =>
  Math.max(...points(path).map((p) => Math.hypot(p.x / 110, p.y / 100)));

describe("surfacePath · round", () => {
  it("is the superellipse the round family already drew", () => {
    expect(surfacePath({ ...SIZE, shape: "round" })).toBe(blobPath(SIZE));
  });

  it("ignores the organic parameters", () => {
    expect(
      surfacePath({ ...SIZE, shape: "round", lobes: 7, wobble: 0.9, seed: 3 }),
    ).toBe(surfacePath({ ...SIZE, shape: "round" }));
  });
});

describe("surfacePath · organic", () => {
  const organic = (over: Record<string, number> = {}) =>
    surfacePath({ ...SIZE, shape: "organic", lobes: 5, wobble: 0.2, seed: 1, ...over });

  it("no wobble collapses back to the round family", () => {
    expect(organic({ wobble: 0 })).toBe(surfacePath({ ...SIZE, shape: "round" }));
  });

  it("wobble pushes the outline off the round silhouette", () => {
    expect(organic()).not.toBe(surfacePath({ ...SIZE, shape: "round" }));
  });

  it("is deterministic per seed, and different seeds differ", () => {
    expect(organic({ seed: 4 })).toBe(organic({ seed: 4 }));
    expect(organic({ seed: 4 })).not.toBe(organic({ seed: 5 }));
  });

  it("stays a closed, bounded outline", () => {
    const path = organic({ wobble: 1 });
    expect(path.startsWith("M ")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
    for (const p of points(path)) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
    // Even at full wobble the shape stays in the neighbourhood of its box,
    // so a character cannot balloon out of frame.
    expect(maxRadius(path)).toBeLessThan(1.6);
  });

  it("gets lumpier as wobble rises", () => {
    const spread = (w: number) => {
      const r = points(organic({ wobble: w })).map((p) =>
        Math.hypot(p.x / 110, p.y / 100),
      );
      return Math.max(...r) - Math.min(...r);
    };
    expect(spread(0.4)).toBeGreaterThan(spread(0.1));
  });
});

describe("surfacePath · drop", () => {
  it("tapers toward the top and stays full at the bottom", () => {
    const path = surfacePath({ ...SIZE, shape: "drop" });
    const pts = points(path);
    // Measured well into each half, which is where a taper actually shows;
    // near the equator every family is the same width. SVG y grows downward.
    const band = 0.6 * (SIZE.height / 2);
    const widest = (keep: (y: number) => boolean) =>
      Math.max(...pts.filter((p) => keep(p.y)).map((p) => Math.abs(p.x)));
    expect(widest((y) => y < -band)).toBeLessThan(
      widest((y) => y > band) * 0.85,
    );
  });

  it("is deterministic", () => {
    expect(surfacePath({ ...SIZE, shape: "drop" })).toBe(
      surfacePath({ ...SIZE, shape: "drop" }),
    );
  });
});
