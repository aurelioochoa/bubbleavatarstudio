// Shape families (FR-2.6, FR-2.7). Each family is a deterministic function of
// its parameters — the renderer, the goldens and the exported files all depend
// on identical input producing identical bytes.
import { describe, expect, it } from "vitest";
import {
  SHAPE_FAMILIES,
  surfacePath,
  surfacePoints,
  wobbleAt,
  WOBBLE_REACH,
} from "./shapes";
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
    surfacePath({
      ...SIZE,
      shape: "organic",
      lobes: 5,
      wobble: 0.2,
      seed: 1,
      ...over,
    });

  it("no wobble collapses back to the round family", () => {
    expect(organic({ wobble: 0 })).toBe(
      surfacePath({ ...SIZE, shape: "round" }),
    );
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

/**
 * Only the knots — every third coordinate pair after the opening M. The
 * Bézier control points between them are not on the outline, and a claim about
 * where the outline actually runs has to ignore them.
 */
function knots(path: string): { x: number; y: number }[] {
  const all = points(path);
  const [first, ...rest] = all;
  const out = first ? [first] : [];
  for (let i = 2; i < rest.length; i += 3) {
    const k = rest[i];
    if (k) out.push(k);
  }
  return out;
}

/** Half-width of the outline at the sampled height nearest `y`. */
function widthAt(path: string, y: number): number {
  const near = knots(path).filter((p) => Math.abs(p.y - y) < 6);
  return near.length ? Math.max(...near.map((p) => Math.abs(p.x))) : 0;
}

const TALL = { width: 140, height: 220, roundness: 0.9 };

describe("surfacePath · capsule", () => {
  it("runs straight down its sides and caps the ends", () => {
    const path = surfacePath({ ...TALL, shape: "capsule" });
    // Straight sides: the outline is at full half-width all the way from the
    // waist to well up the body, which no superellipse does.
    expect(widthAt(path, 0)).toBeCloseTo(70, 0);
    expect(widthAt(path, -40)).toBeCloseTo(70, 0);
    // ...and then the cap closes: at 96% of the height it is down to under
    // 40% of its half-width. Measured near the tip on purpose — at -95 the
    // outline is still on the shoulder of the cap and legitimately wide.
    expect(widthAt(path, -108)).toBeLessThan(0.4 * 70);
  });

  it("caps the long axis, so a wide body is a lying-down capsule", () => {
    // 220 x 140: the ends are now left and right, not top and bottom.
    const wide = surfacePath({
      width: 220,
      height: 140,
      roundness: 0.9,
      shape: "capsule",
    });
    const tallest = (x: number) =>
      Math.max(
        ...knots(wide)
          .filter((p) => Math.abs(p.x - x) < 6)
          .map((p) => Math.abs(p.y)),
      );
    expect(tallest(0)).toBeCloseTo(70, 0);
    expect(tallest(108)).toBeLessThan(0.4 * 70);
  });

  it("is not any of the families we already had", () => {
    for (const shape of ["round", "drop"] as const) {
      expect(surfacePath({ ...TALL, shape: "capsule" })).not.toBe(
        surfacePath({ ...TALL, shape }),
      );
    }
  });
});

describe("surfacePath · cylinder", () => {
  it("keeps the straight sides but flattens the ends", () => {
    const cyl = surfacePath({ ...TALL, shape: "cylinder" });
    const cap = surfacePath({ ...TALL, shape: "capsule" });
    // Same waist...
    expect(widthAt(cyl, 0)).toBeCloseTo(70, 0);
    // ...but a shallower cap, so it is still near full width where the
    // capsule has already curved away.
    expect(widthAt(cyl, -85)).toBeGreaterThan(widthAt(cap, -85));
  });

  it("is deterministic", () => {
    expect(surfacePath({ ...TALL, shape: "cylinder" })).toBe(
      surfacePath({ ...TALL, shape: "cylinder" }),
    );
  });
});

describe("surfacePath · cone", () => {
  it("tapers the whole way up, harder than a drop does", () => {
    const cone = surfacePath({ ...SIZE, shape: "cone" });
    const drop = surfacePath({ ...SIZE, shape: "drop" });
    const band = 0.6 * (SIZE.height / 2);
    const widest = (path: string, keep: (y: number) => boolean) =>
      Math.max(
        ...knots(path)
          .filter((p) => keep(p.y))
          .map((p) => Math.abs(p.x)),
      );
    const top = (path: string) => widest(path, (y) => y < -band);
    const base = (path: string) => widest(path, (y) => y > band);
    // A cone's apex is a point, not a shoulder.
    expect(top(cone) / base(cone)).toBeLessThan(0.3);
    expect(top(cone) / base(cone)).toBeLessThan(top(drop) / base(drop));
  });

  it("sits on a flat base rather than a rounded one", () => {
    // Half the width still there a tenth off the floor is what makes it read
    // as a cone standing up rather than a teardrop lying point-up.
    const cone = surfacePath({ ...SIZE, shape: "cone" });
    const floor = SIZE.height / 2;
    const nearFloor = Math.max(
      ...knots(cone)
        .filter((p) => p.y > floor * 0.9)
        .map((p) => Math.abs(p.x)),
    );
    expect(nearFloor).toBeGreaterThan(0.5 * (SIZE.width / 2));
  });
});

describe("surfacePath · diamond", () => {
  it("reaches full extent on the axes and pulls in between them", () => {
    const path = surfacePath({ ...SIZE, shape: "diamond" });
    const ks = knots(path);
    const reach = (p: { x: number; y: number }) =>
      Math.hypot(p.x / 110, p.y / 100);
    // On-axis knots still touch the box...
    expect(Math.max(...ks.map(reach))).toBeCloseTo(1, 1);
    // ...while the corners between the axes are cut well inside the ellipse,
    // which is the whole of what makes a rhombus a rhombus.
    const corner = ks.filter(
      (p) => Math.abs(Math.abs(p.x / 110) - Math.abs(p.y / 100)) < 0.12,
    );
    expect(corner.length).toBeGreaterThan(0);
    expect(Math.max(...corner.map(reach))).toBeLessThan(0.85);
  });

  it("gets rounder as roundness rises, without becoming an ellipse", () => {
    const cut = (roundness: number) =>
      Math.max(
        ...knots(surfacePath({ ...SIZE, roundness, shape: "diamond" }))
          .filter(
            (p) => Math.abs(Math.abs(p.x / 110) - Math.abs(p.y / 100)) < 0.12,
          )
          .map((p) => Math.hypot(p.x / 110, p.y / 100)),
      );
    expect(cut(1)).toBeGreaterThan(cut(0));
    expect(cut(1)).toBeLessThan(0.9);
  });
});

describe("the family list is the whole story", () => {
  it("draws a distinct outline for every family", () => {
    // `surfacePath` picks its branch with a chain of ifs, so a family added to
    // the union but not to that chain falls through and silently renders as
    // the round one. Nothing about that is a typecheck error, so it is a test.
    // Organic at zero wobble is the one documented duplicate, so give it some.
    const drawn = new Map<string, string>();
    for (const shape of SHAPE_FAMILIES) {
      const path = surfacePath({
        ...TALL,
        shape,
        ...(shape === "organic" ? { wobble: 0.4, lobes: 5, seed: 1 } : {}),
      });
      const clash = drawn.get(path);
      expect(clash, `${shape} draws the same outline as ${clash}`).toBe(
        undefined,
      );
      drawn.set(path, shape);
    }
    expect(drawn.size).toBe(SHAPE_FAMILIES.length);
  });
});

// FR-2.7. The wobble has to be keyed on the angle a bump is *seen* at, not on
// the superellipse sampling parameter. The two are only the same for a true
// ellipse: at the shipped roundness the exponent is 2.56 and they disagree by
// about 6%.
//
// This is not cosmetic. `solid.ts` revolves this outline about the vertical
// axis, and a modulation keyed on the parameter is constant around each
// revolved ring — which would make the organic solid a surface of revolution,
// and a surface of revolution's silhouette under yaw is provably just its flat
// outline scaled. Keyed on the parameter, the lumps could never travel.
describe("organic wobble is radial (FR-2.7)", () => {
  const ORG = {
    ...SIZE,
    shape: "organic" as const,
    lobes: 5,
    wobble: 0.4,
    seed: 1,
  };

  it("modulates by the angle the bump is seen at, not the sampling parameter", () => {
    const base = surfacePoints({ ...SIZE, shape: "round" });
    const org = surfacePoints(ORG);
    expect(org).toHaveLength(base.length);

    for (const [i, b] of base.entries()) {
      const o = org[i];
      if (!o) throw new Error("length mismatch");
      const angle = Math.atan2(b.y, b.x);
      const expected = 1 + wobbleAt(angle, 5, 1) * 0.4 * WOBBLE_REACH;
      expect(Math.hypot(o.x, o.y) / Math.hypot(b.x, b.y)).toBeCloseTo(
        expected,
        10,
      );
    }
  });

  it("still leaves the outline where wobble is zero", () => {
    expect(surfacePath({ ...ORG, wobble: 0 })).toBe(
      surfacePath({ ...SIZE, shape: "round" }),
    );
  });
});

// FR-2.6. A cube is the sixth of the volumetric primaries and the one family
// whose whole point is that it is *not* a solid of revolution — revolve a
// square profile and you get a cylinder, which is a different character.
describe("surfacePath · cube", () => {
  const cornerReach = (path: string): number => {
    // How far the outline gets toward the corner of its own box. A circle
    // reaches 1/sqrt(2) of the way; a square reaches all of it.
    const pts = points(path);
    return Math.max(
      ...pts.map((p) => Math.min(Math.abs(p.x) / 110, Math.abs(p.y) / 100)),
    );
  };

  it("squares off harder than round does at the same roundness", () => {
    const r = cornerReach(surfacePath({ ...SIZE, shape: "round" }));
    const c = cornerReach(surfacePath({ ...SIZE, shape: "cube" }));
    expect(c).toBeGreaterThan(r);
  });

  it("softens with roundness but never rounds into an ellipse", () => {
    const sharp = cornerReach(
      surfacePath({ ...SIZE, shape: "cube", roundness: 0 }),
    );
    const soft = cornerReach(
      surfacePath({ ...SIZE, shape: "cube", roundness: 1 }),
    );
    expect(sharp).toBeGreaterThan(soft);
    // A cube that can be dialled into a sphere is not a family, it is the
    // round one with extra steps — the same rule the diamond follows.
    expect(soft).toBeGreaterThan(0.78);
  });

  it("is deterministic", () => {
    expect(surfacePath({ ...SIZE, shape: "cube" })).toBe(
      surfacePath({ ...SIZE, shape: "cube" }),
    );
  });
});
