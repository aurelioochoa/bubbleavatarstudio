// Solid silhouettes (FR-2.8, with FR-2.6 and FR-8.2 behind it): the body is a
// solid that turns, not a flat outline that squashes.
import { describe, expect, it } from "vitest";
import { isAnalyticSolid, solidMesh, solidOutline, solidRadii } from "./solid";
import { SHAPE_FAMILIES, surfacePoints } from "./shapes";
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

describe("solidMesh · a complete, readable projection guide", () => {
  const points = (path: string) =>
    [...path.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => ({
      x: Number(m[1]),
      y: Number(m[2]),
    }));

  it("spaces latitude rings across the full height, including the equator", () => {
    const mesh = solidMesh(at());
    const heights = mesh
      .slice(0, 5)
      .map((line) => points(line.front + " " + line.back)[0].y);
    expect(heights).toEqual([-66.67, -33.33, 0, 33.33, 66.67]);
  });

  it("draws six distinct meridian planes through a combined turn", () => {
    const mesh = solidMesh(at({ rotation: { x: 25, y: 40, z: 0 } }));
    const signatures = mesh.slice(5).map((line) =>
      points(line.front + " " + line.back)
        .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
        .sort()
        .join(";"),
    );
    expect(new Set(signatures).size).toBe(6);
  });

  it("separates near and far surface segments using outward normals", () => {
    const meridian = solidMesh(at({ roundness: 1 }))[5];
    expect(points(meridian.front).length).toBeGreaterThan(2);
    expect(points(meridian.back).length).toBeGreaterThan(2);
    expect(
      Math.min(...points(meridian.front).map((p) => p.x)),
    ).toBeGreaterThanOrEqual(-0.01);
    expect(
      Math.max(...points(meridian.back).map((p) => p.x)),
    ).toBeLessThanOrEqual(0.01);
  });

  it.each(SHAPE_FAMILIES)(
    "keeps %s finite at the poles, behind the head and at extreme depths",
    (shape) => {
      for (const depth of [1, 170, 400]) {
        for (const [x, y] of [
          [0, 0],
          [90, 0],
          [-90, 90],
          [25, 40],
          [0, 180],
          [180, -180],
        ]) {
          const mesh = solidMesh(
            at({
              shape,
              depth,
              wobble: 0.6,
              lobes: 5,
              seed: 3,
              rotation: { x, y, z: 0 },
            }),
          );
          expect(mesh).toHaveLength(11);
          for (const line of mesh) {
            const path = line.front + " " + line.back;
            expect(path).not.toMatch(/NaN|Infinity/);
            expect(points(path).length).toBeGreaterThan(2);
          }
        }
      }
    },
  );

  it("invalidates cached mesh geometry when shape, depth or rotation changes", () => {
    const options = at();
    const first = solidMesh(options);
    expect(solidMesh(options)).toEqual(first);
    for (const change of [
      { depth: 20 },
      { shape: "cube" as const },
      { rotation: { x: 35, y: 20, z: 0 } },
    ]) {
      expect(solidMesh({ ...options, ...change })).not.toEqual(first);
      expect(solidMesh(options)).toEqual(first);
    }
  });
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

  // "Not empty" has to be measured against the widest bin, not against zero.
  // Pole-on, `cos(90°)` is 6e-17 rather than 0, so the profile's two poles —
  // single points on the axis of revolution — land in bins as radii of about
  // 1e-14. Positive, so `fillGaps` read them as samples and left them in, and
  // `smoothRadii` then averaged each with its two full-width neighbours into a
  // notch cut halfway to the centre.
  //
  // The shipped azimuth count hides this: a real sample lands in those bins
  // too and overwrites them. Sampled coarsely enough that it does not, the
  // silhouette must still degrade to a coarse ellipse rather than to a
  // starburst — which is what a drop, capsule, cylinder, cone or diamond
  // turned to face the viewer directly used to become.
  it("counts a bin as reached only if a real sample reached it", () => {
    for (const shape of [
      "drop",
      "capsule",
      "cylinder",
      "cone",
      "diamond",
    ] as const) {
      const r = solidRadii(
        at({ shape, azimuths: 48, rotation: { x: 90, y: 0, z: 0 } }),
      );
      let lo = Infinity;
      let hi = 0;
      for (const v of r) {
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
      // The pole-on silhouette is the widest ring: an ellipse whose narrow
      // axis is the depth-to-width aspect, here 170/220.
      expect({ shape, spread: lo / hi }).toMatchObject({
        spread: expect.any(Number),
      });
      expect(lo / hi).toBeGreaterThan(0.7);
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

describe("solidRadii · a solid of revolution seen pole-on is its widest ring", () => {
  // Looking straight down the axis a body is revolved about, the silhouette is
  // the widest ring the profile sweeps and nothing else — a clean ellipse,
  // whatever lumps or tapers the profile has along its height.
  //
  // Two things break there and only there. The profile's own y is multiplied
  // by cos(pitch), so at the pole it contributes no angular variety at all and
  // every screen angle has to come from the cross-section; at 48 azimuths that
  // is half the angular resolution the bins ask for. And cos(pitch) is not
  // zero but 6e-17, so the profile's poles land in bins as radii of about
  // 1e-14 — non-zero, which is what `fillGaps` used to read as "this bin has a
  // sample" before it smoothed each of them into a notch cut to the centre.
  const FAMILIES = [
    "drop",
    "cube",
    "capsule",
    "cylinder",
    "cone",
    "diamond",
  ] as const;

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

  // Swept a degree at a time rather than at a handful of round angles: at 96
  // azimuths the pole itself came out clean and 89.4 degrees still spiked to
  // 10%, because the ring's samples are spaced along its perimeter and only
  // land one per bin when there are comfortably more of them than there are
  // bins. A test that checked 88, 90 and 92 would have passed that.
  it("never collapses into notches at or near the pole", () => {
    for (const shape of FAMILIES) {
      for (let x = 78; x <= 102; x++) {
        for (const sign of [1, -1]) {
          const r = solidRadii(
            at({ shape, rotation: { x: x * sign, y: 0, z: 0 } }),
          );
          expect({ shape, x: x * sign, spread: spread(r) }).toMatchObject({
            spread: expect.any(Number),
          });
          expect(spread(r)).toBeGreaterThan(0.5);
          expect({ shape, x: x * sign, jitter: jitter(r) }).toMatchObject({
            jitter: expect.any(Number),
          });
          // A cube's cross-section really is a square, so a bin either side of
          // a corner really does jump; the surfaces of revolution have no such
          // excuse anywhere near the pole, where their silhouette is a circle.
          expect(jitter(r)).toBeLessThan(shape === "cube" ? 0.06 : 0.03);
        }
      }
    }
  });

  it("is the ellipse the widest ring projects to", () => {
    // Every family here but `cube` is a surface of revolution, so pole-on its
    // silhouette is exactly the circle of the profile's widest point, squashed
    // by the depth-to-width aspect.
    for (const shape of FAMILIES.filter((s) => s !== "cube")) {
      const opts = at({ shape, rotation: { x: 90, y: 0, z: 0 } });
      let rmax = 0;
      for (const p of surfacePoints({ ...opts, samples: 192 })) {
        rmax = Math.max(rmax, Math.abs(p.x));
      }
      const kappa = SIZE.depth / SIZE.width;

      const got = solidRadii(opts);
      const want = Float64Array.from(got, (_, k) => {
        const a = (k * 2 * Math.PI) / got.length;
        return (rmax * kappa) / Math.hypot(kappa * Math.cos(a), Math.sin(a));
      });
      expect({ shape, off: worstRatio(got, want) }).toMatchObject({
        off: expect.any(Number),
      });
      expect(worstRatio(got, want)).toBeLessThan(0.05);
    }
  });
});

describe("solidRadii · the sampler has converged", () => {
  // The honest measure of an artifact: compare the shipped sampling against a
  // heavily oversampled reference of the *same solid*. Real geometry appears
  // in both and cancels; only under-sampling shows up.
  //
  // This is what caught the case the pole test above misses. The cross-section
  // is sampled round its own perimeter, and on an eccentric one — a shallow
  // body, where the depth-to-width aspect is small — arc length piles the
  // samples onto the ends of the wide axis and starves the flattened sides.
  // Those starved directions are exactly the ones a pole-on silhouette is made
  // of, so a shallow capsule a degree off the pole came out with a sawtooth
  // edge: 84% away from its own converged shape at depth 20, against 1.7% at
  // the default depth of 170.
  const REFERENCE_AZIMUTHS = 512;

  const convergence = (o: Parameters<typeof solidRadii>[0]): number => {
    const got = solidRadii(o);
    const want = solidRadii({ ...o, azimuths: REFERENCE_AZIMUTHS });
    let worst = 0;
    for (let i = 0; i < got.length; i++) {
      const a = got[i] ?? 0;
      const b = want[i] ?? 0;
      worst = Math.max(worst, Math.abs(a - b) / Math.max(a, b));
    }
    return worst;
  };

  it("agrees with its own oversampled reference", () => {
    // Depths where 96 angular bins can represent the shape at all. Shallower
    // than that the silhouette is a razor sliver whose tip is a near-cusp, and
    // what limits the reading is the bin count rather than the ring — a
    // different limit, and the one the sawtooth test below covers instead.
    for (const depth of [100, 170, 400]) {
      for (const shape of [
        "round",
        "drop",
        "cube",
        "capsule",
        "cylinder",
        "cone",
        "diamond",
      ] as const) {
        for (const x of [-90.5, -90, 89.5, 90]) {
          for (const y of [0, 60]) {
            const off = convergence({
              ...SIZE,
              depth,
              shape,
              perspective: 1,
              rotation: { x, y, z: 0 },
            });
            expect({ shape, depth, x, y, off }).toMatchObject({
              off: expect.any(Number),
            });
            expect(off).toBeLessThan(0.06);
          }
        }
      }
    }
  });

  // Counting local maxima separates the two things the metrics above conflate.
  // A sliver has two, one at each end, however sharp they are; a sawtooth has
  // one per starved direction. This holds at every depth, including the ones
  // the convergence test cannot speak for.
  const localMaxima = (r: Float64Array): number => {
    const n = r.length;
    let count = 0;
    for (let i = 0; i < n; i++) {
      const a = r[(i - 1 + n) % n] ?? 0;
      const b = r[i] ?? 0;
      const c = r[(i + 1) % n] ?? 0;
      // The margin ignores ripples too small to see: a flat face resolved to
      // within a twentieth of a percent is flat, not a row of teeth.
      if (b > a * 1.0005 && b >= c * 1.0005) count++;
    }
    return count;
  };

  it("draws a shallow body as a sliver, not as a row of teeth", () => {
    for (const depth of [10, 20, 50, 170]) {
      for (const shape of [
        "drop",
        "cube",
        "capsule",
        "cylinder",
        "cone",
        "diamond",
      ] as const) {
        for (let x = -94; x <= -86; x += 0.5) {
          for (const y of [0, 45, 90]) {
            const r = solidRadii({
              ...SIZE,
              depth,
              shape,
              perspective: 1,
              rotation: { x, y, z: 0 },
            });
            const peaks = localMaxima(r);
            // A cube's cross-section has four corners of its own; everything
            // else here is a surface of revolution and pole-on has none.
            const cap = shape === "cube" ? 8 : 4;
            expect({ shape, depth, x, y, peaks }).toMatchObject({
              peaks: expect.any(Number),
            });
            expect(peaks).toBeLessThanOrEqual(cap);
          }
        }
      }
    }
  });
});
