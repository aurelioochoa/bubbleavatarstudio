// Solid silhouettes (FR-2.6, FR-8.2): the body is a solid that turns, not a
// flat outline that squashes.
import { describe, expect, it } from "vitest";
import { isAnalyticSolid, solidOutline, solidRadii } from "./solid";
import { surfacePoints } from "./shapes";
import { projectFace } from "./projection";

const SIZE = { width: 220, height: 200, depth: 170, roundness: 0.9 };
const FLAT = { x: 0, y: 0, z: 0 };
const at = (
  extra: Partial<Parameters<typeof solidRadii>[0]> = {},
): Parameters<typeof solidRadii>[0] => ({
  ...SIZE,
  shape: "round",
  perspective: 1,
  rotation: FLAT,
  ...extra,
});

/**
 * The flat outline's own radius at each of the sampler's output angles, found
 * by intersecting the ray with the outline polygon. Exact for a star-shaped
 * outline, and unlike binning it leaves no hole to be guessed at.
 */
function flatRadii(
  opts: Parameters<typeof surfacePoints>[0],
  bins: number,
): Float64Array {
  // Sampled as densely as the solid samples it, so this compares the solid
  // construction rather than how coarsely each side polygonises a curve.
  const pts = surfacePoints({ ...opts, samples: 192 });
  const out = new Float64Array(bins);
  for (let k = 0; k < bins; k++) {
    const a = (k * 2 * Math.PI) / bins;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let best = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const q = pts[(i + 1) % pts.length];
      if (!p || !q) continue;
      const ex = q.x - p.x;
      const ey = q.y - p.y;
      const den = ex * dy - ey * dx;
      if (Math.abs(den) < 1e-12) continue;
      const t = (p.y * dx - p.x * dy) / den;
      if (t < 0 || t > 1) continue;
      const s = (p.x + t * ex) * dx + (p.y + t * ey) * dy;
      if (s > best) best = s;
    }
    out[k] = best;
  }
  return out;
}

const worstRatio = (a: Float64Array, b: Float64Array): number => {
  let worst = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (y === 0) continue;
    worst = Math.max(worst, Math.abs(x - y) / y);
  }
  return worst;
};

describe("solidRadii · at rest the solid is the outline it came from", () => {
  // The sampler quantises into angular bins, so this is an agreement claim,
  // not an identity. The bar is the bin width's own error, measured: every
  // family lands under 1.2% except the cone, whose radius changes fastest with
  // angle, at 5.8%.
  it.each([
    "round",
    "organic",
    "drop",
    "capsule",
    "cylinder",
    "cone",
    "diamond",
  ] as const)(
    "%s reduces to its flat outline when nothing has turned",
    (shape) => {
      const opts = at({ shape, lobes: 5, wobble: 0.4, seed: 3 });
      const got = solidRadii(opts);
      const want = flatRadii(opts, got.length);
      expect(worstRatio(got, want)).toBeLessThan(0.06);
    },
  );
});

describe("solidRadii · the ellipsoid it replaces", () => {
  // A round body revolved is exactly the ellipsoid projectFace models, so the
  // sampler has a closed form to be checked against.
  it("agrees with the analytic ellipsoid silhouette under yaw", () => {
    for (const perspective of [0, 0.25, 0.6, 1]) {
      for (const y of [0, 15, 45, 90, 135, 180, 270]) {
        const rotation = { x: 0, y, z: 0 };
        const p = projectFace({ ...SIZE, perspective, rotation });
        const r = solidRadii(
          at({ shape: "round", roundness: 1, perspective, rotation }),
        );
        const a = 110 * p.scaleX;
        const b = 100;
        for (let k = 0; k < r.length; k++) {
          const angle = (k * 2 * Math.PI) / r.length;
          const exact =
            1 / Math.hypot(Math.cos(angle) / a, Math.sin(angle) / b);
          expect(Math.abs((r[k] ?? 0) - exact) / exact).toBeLessThan(0.05);
        }
      }
    }
  });

  it("agrees with the analytic silhouette under pitch", () => {
    const rotation = { x: 55, y: 0, z: 0 };
    const p = projectFace({ ...SIZE, perspective: 1, rotation });
    const r = solidRadii(at({ shape: "round", roundness: 1, rotation }));
    const a = 110;
    const b = 100 * p.scaleY;
    for (let k = 0; k < r.length; k++) {
      const angle = (k * 2 * Math.PI) / r.length;
      const exact = 1 / Math.hypot(Math.cos(angle) / a, Math.sin(angle) / b);
      expect(Math.abs((r[k] ?? 0) - exact) / exact).toBeLessThan(0.06);
    }
  });
});

describe("solidRadii · authored depth shapes the turn", () => {
  it("keeps a deep body wide side-on and narrows a shallow one", () => {
    const rotation = { x: 0, y: 90, z: 0 };
    const wide = solidRadii(at({ depth: 300, rotation }));
    const thin = solidRadii(at({ depth: 30, rotation }));
    // Bin 0 looks straight along +x, which side-on is the depth axis.
    expect(wide[0] ?? 0).toBeGreaterThan((thin[0] ?? 0) * 3);
  });
});

describe("solidRadii · the lumps travel (FR-2.7)", () => {
  // This is the assertion the whole feature exists for. Before it, an organic
  // body's outline was byte-identical at every head rotation and only a
  // uniform scale differed, so the lumps stayed pinned in screen space.
  //
  // It also fails against any surface-of-revolution field, however lumpy:
  // revolution makes a yaw-only silhouette exactly the flat outline scaled in
  // x, which is precisely what is subtracted off here.
  it("an organic body shows different lumps once it has turned", () => {
    const organic = {
      shape: "organic" as const,
      lobes: 5,
      wobble: 0.6,
      seed: 3,
    };
    const rest = solidRadii(at({ ...organic, rotation: FLAT }));
    const yawed = solidRadii(
      at({ ...organic, rotation: { x: 0, y: 90, z: 0 } }),
    );

    // Undo the uniform x-scale a revolution solid would have produced, then
    // measure what is left. What is left is the lumps having moved.
    const p = projectFace({
      ...SIZE,
      perspective: 1,
      rotation: { x: 0, y: 90, z: 0 },
    });
    let travel = 0;
    for (let k = 0; k < rest.length; k++) {
      const angle = (k * 2 * Math.PI) / rest.length;
      const scaled =
        (rest[k] ?? 0) *
        Math.hypot(Math.cos(angle) * p.scaleX, Math.sin(angle));
      travel = Math.max(travel, Math.abs((yawed[k] ?? 0) - scaled));
    }
    expect(travel).toBeGreaterThan(10);
  });

  it("a round body has no lumps to travel", () => {
    const rest = solidRadii(at({ shape: "round", roundness: 1 }));
    const yawed = solidRadii(
      at({ shape: "round", roundness: 1, rotation: { x: 0, y: 90, z: 0 } }),
    );
    const p = projectFace({
      ...SIZE,
      perspective: 1,
      rotation: { x: 0, y: 90, z: 0 },
    });
    let travel = 0;
    for (let k = 0; k < rest.length; k++) {
      const angle = (k * 2 * Math.PI) / rest.length;
      const scaled =
        (rest[k] ?? 0) *
        Math.hypot(Math.cos(angle) * p.scaleX, Math.sin(angle));
      travel = Math.max(travel, Math.abs((yawed[k] ?? 0) - scaled));
    }
    expect(travel).toBeLessThan(5);
  });
});

describe("solidOutline", () => {
  it("is deterministic and closed", () => {
    const opts = at({
      shape: "organic",
      wobble: 0.5,
      rotation: { x: 20, y: 40, z: 0 },
    });
    const path = solidOutline(opts);
    expect(path).toBe(solidOutline(opts));
    expect(path.startsWith("M ")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
    expect(path).not.toContain("NaN");
  });

  // The memo must be an optimisation and nothing else: a hit has to return the
  // string a cold call would have produced, and a changed rotation has to miss.
  it("memoises without ever returning a stale outline", () => {
    const a = { ...at({ shape: "cone", rotation: { x: 5, y: 25, z: 0 } }) };
    const b = { ...at({ shape: "cone", rotation: { x: 5, y: 26, z: 0 } }) };
    const first = solidOutline(a);
    expect(solidOutline(a)).toBe(first);
    const other = solidOutline(b);
    expect(other).not.toBe(first);
    // Coming back to the first inputs must rebuild the same string, not the
    // one the memo happens to be holding.
    expect(solidOutline(a)).toBe(first);
  });

  it("stays finite through a full turn on every family", () => {
    for (const shape of [
      "round",
      "organic",
      "drop",
      "capsule",
      "cylinder",
      "cone",
      "diamond",
    ] as const) {
      for (let y = -180; y <= 180; y += 30) {
        const r = solidRadii(
          at({ shape, wobble: 0.5, rotation: { x: 15, y, z: 0 } }),
        );
        for (const v of r) {
          expect(Number.isFinite(v)).toBe(true);
          expect(v).toBeGreaterThan(0);
        }
      }
    }
  });

  it("leaves no empty bin, which would read as a dent that is not there", () => {
    for (let y = 0; y <= 180; y += 15) {
      const r = solidRadii(
        at({ shape: "organic", wobble: 0.6, rotation: { x: 25, y, z: 0 } }),
      );
      for (const v of r) expect(v).toBeGreaterThan(0);
    }
  });
});

describe("isAnalyticSolid", () => {
  it("is true exactly where the flat outline scaled is still correct", () => {
    expect(isAnalyticSolid("round", undefined)).toBe(true);
    expect(isAnalyticSolid("organic", 0)).toBe(true);
    expect(isAnalyticSolid("organic", 0.4)).toBe(false);
    expect(isAnalyticSolid("cone", undefined)).toBe(false);
  });
});

describe("solidRadii · a cube is not a solid of revolution", () => {
  // The whole reason `cube` exists as its own family. Revolving a square
  // profile about the vertical axis gives a cylinder, and a cylinder's
  // silhouette under pure yaw is provably just its flat outline scaled in x.
  // A cube's is not: turn it 45 degrees and its corner comes toward you.
  it("shows a face turning away, not a profile being squashed", () => {
    const rest = solidRadii(at({ shape: "cube" }));
    const yawed = solidRadii(
      at({ shape: "cube", rotation: { x: 0, y: 45, z: 0 } }),
    );
    const p = projectFace({
      ...SIZE,
      perspective: 1,
      rotation: { x: 0, y: 45, z: 0 },
    });

    let departure = 0;
    for (let k = 0; k < rest.length; k++) {
      const angle = (k * 2 * Math.PI) / rest.length;
      const revolved =
        (rest[k] ?? 0) *
        Math.hypot(Math.cos(angle) * p.scaleX, Math.sin(angle));
      departure = Math.max(departure, Math.abs((yawed[k] ?? 0) - revolved));
    }
    expect(departure).toBeGreaterThan(8);
  });

  it("is still its own flat outline when nothing has turned", () => {
    const opts = at({ shape: "cube" });
    const got = solidRadii(opts);
    const want = flatRadii(opts, got.length);
    expect(worstRatio(got, want)).toBeLessThan(0.06);
  });
});

describe("solidRadii · a cube stays a cube from every side", () => {
  // A superellipse is parameterised by angle, but at a boxy exponent almost
  // every parameter value maps to a corner: |cos psi|^0.15 is within a hair of
  // 1 across most of its range and then falls off a cliff. Sampling psi evenly
  // therefore samples the corners densely and the flat faces barely at all,
  // and a cross-section that is really four points instead of a square
  // projects to spikes. Face-on it was hidden — the corners still bound the
  // silhouette — but pitched it came apart into a pinwheel.
  const spread = (r: Float64Array): number => {
    let lo = Infinity;
    let hi = 0;
    for (const v of r) {
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    return lo / hi;
  };

  /** Worst jump between neighbouring bins, as a fraction of the widest. */
  const jitter = (r: Float64Array): number => {
    let hi = 0;
    for (const v of r) hi = Math.max(hi, v);
    let worst = 0;
    for (let i = 0; i < r.length; i++) {
      const a = r[i] ?? 0;
      const b = r[(i + 1) % r.length] ?? 0;
      worst = Math.max(worst, Math.abs(a - b));
    }
    return worst / hi;
  };

  it("never collapses into spikes, at any pitch or yaw", () => {
    for (let x = 0; x <= 180; x += 12) {
      for (const y of [0, 35, 90, 146]) {
        const r = solidRadii(
          at({ shape: "cube", roundness: 0.25, rotation: { x, y, z: 0 } }),
        );
        // A solid box never presents a silhouette whose narrowest radius is a
        // small fraction of its widest; a pinwheel's narrowest is near zero.
        expect({ x, y, spread: spread(r) }).toMatchObject({
          spread: expect.any(Number),
        });
        expect(spread(r)).toBeGreaterThan(0.3);
      }
    }
  });

  // The spike test alone was not enough: at 48 azimuths a nearly edge-on cube
  // still ran 36, 48, 36 across neighbouring bins at its top edge, where the
  // truth is a flat 88. It looked like a pair of notches bitten out of the top
  // and bottom. A boxy cross-section simply needs more samples round it than a
  // round one — its face-centres live in a sliver of the parameter.
  it("draws a flat edge as flat, not as a row of notches", () => {
    for (let x = 60; x <= 180; x += 10) {
      const r = solidRadii(
        at({ shape: "cube", roundness: 0.25, rotation: { x, y: 0, z: 0 } }),
      );
      expect({ x, jitter: jitter(r) }).toMatchObject({
        jitter: expect.any(Number),
      });
      expect(jitter(r)).toBeLessThan(0.06);
    }
  });
});
