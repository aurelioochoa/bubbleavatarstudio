// Surface shape families (FR-2.6, FR-2.7). Pure math: every family is a
// deterministic function of its parameters, because the renderer, the goldens
// and the exported files all rely on identical input giving identical bytes.
import {
  clamp,
  lerp,
  smoothClosedPath,
  superellipsePoints,
  type Point,
} from "./primitives";

/**
 * Every family, in the order the picker offers them. This array is the single
 * source: the type is derived from it, the validator accepts exactly it, and
 * the picker maps over it — so a new family cannot be half-added.
 */
export const SHAPE_FAMILIES = [
  "round",
  "organic",
  "drop",
  "capsule",
  "cylinder",
  "cone",
  "diamond",
] as const;

export type ShapeFamily = (typeof SHAPE_FAMILIES)[number];

export interface SurfaceShapeOptions {
  shape: ShapeFamily;
  width: number;
  height: number;
  /** 0 squares the silhouette off, 1 is an ellipse. */
  roundness: number;
  /** organic: how many bumps run around the perimeter. */
  lobes?: number | undefined;
  /** organic: how far the radius strays from round, 0..1. */
  wobble?: number | undefined;
  /** organic: which arrangement of bumps. */
  seed?: number | undefined;
  samples?: number | undefined;
}

/** How far full wobble may push the outline past its box. */
export const WOBBLE_REACH = 0.35;
/** How much a drop narrows toward its top. */
const DROP_TAPER = 0.55;
/** Half-width left at a cone's apex, as a fraction of the base. */
const CONE_APEX = 0.1;
/**
 * A cone reads as a cone because it stands on a flat base. Roundness still
 * softens its corners, but only across the lower part of its range — carried
 * straight through, the shipped default of ~0.96 would round the base into an
 * ellipse and leave a teardrop balanced point-up.
 */
const CONE_BASE_ROUNDNESS = 0.45;
/** Cap depth as a fraction of the short half-axis, from square to fully round. */
const CAPSULE_CAP = { min: 0.5, max: 1 };
const CYLINDER_CAP = { min: 0.15, max: 0.42 };
/**
 * Superellipse exponent for the diamond family: 1 is the bare rhombus, 2 the
 * ellipse. It stops short of 2 on purpose — a diamond that can be dialled all
 * the way into a circle is not a family, it is the round one with extra steps.
 */
const DIAMOND_EXPONENT = { sharp: 1, soft: 1.35 };

/** Deterministic hash of a number to [0,1). */
function hash01(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 2654435761) >>> 0;
  h ^= h >>> 15;
  return (h >>> 0) / 4294967295;
}

/**
 * Two out-of-phase harmonics give a lopsided, hand-made outline; one alone
 * reads as a regular flower.
 *
 * Exported because `solid.ts` lifts this same field onto the solid: the lumps
 * a turned character shows have to be the lumps its flat outline shows, or the
 * two disagree the moment the head moves.
 */
export function wobbleAt(theta: number, lobes: number, seed: number): number {
  const phase1 = hash01(seed) * Math.PI * 2;
  const phase2 = hash01(seed + 977) * Math.PI * 2;
  const weight = 0.35 + hash01(seed + 31) * 0.3;
  const primary = Math.sin(theta * lobes + phase1);
  const secondary = Math.sin(theta * Math.max(1, lobes - 2) + phase2);
  return primary * (1 - weight) + secondary * weight;
}

/**
 * Straight sides with a curved cap at each end — the silhouette both a
 * cylinder and a capsule present, differing only in how deep the cap is. The
 * caps go on the ends of the *long* axis, so a body wider than it is tall is a
 * capsule lying down rather than a squashed one standing up.
 *
 * No superellipse can do this: its sides are always curving somewhere. That is
 * the point of the family — the straight run is what the eye reads as a
 * turned cylinder.
 */
function barrelPoints(
  width: number,
  height: number,
  capFraction: number,
  samples: number,
): Point[] {
  const upright = height >= width;
  // Work upright, then lay the result down if that is what was asked for.
  const a = (upright ? width : height) / 2;
  const b = (upright ? height : width) / 2;
  const cap = Math.min(b, a * capFraction);
  const flat = b - cap;

  const pts: Point[] = [];
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * Math.PI * 2;
    const along = b * Math.sin(t);
    // Inside the straight run the outline is at full half-width; past it the
    // cap closes as a quarter-ellipse.
    const into = Math.max(0, Math.abs(along) - flat);
    const across =
      a *
      Math.sign(Math.cos(t)) *
      Math.sqrt(Math.max(0, 1 - (into / cap) ** 2));
    pts.push(upright ? { x: across, y: along } : { x: along, y: across });
  }
  return pts;
}

/**
 * Pulls each point of an ellipse in toward the rhombus that shares its box.
 * `n` is the superellipse exponent: at 2 the scale is exactly 1 and nothing
 * moves, at 1 every point lands on |x/a| + |y/b| = 1.
 */
function diamondPoints(
  width: number,
  height: number,
  n: number,
  samples: number,
): Point[] {
  return superellipsePoints({ width, height, roundness: 1, samples }).map(
    (p, i) => {
      const t = (i / samples) * Math.PI * 2;
      const s =
        (Math.abs(Math.cos(t)) ** n + Math.abs(Math.sin(t)) ** n) ** (-1 / n);
      return { x: p.x * s, y: p.y * s };
    },
  );
}

/**
 * The family's outline as points, before it is turned into a path. This is
 * what `surfacePath` draws and what `solid.ts` sweeps into three dimensions —
 * one generatrix, so a solid can never disagree with the flat outline it came
 * from.
 */
export function surfacePoints({
  shape,
  width,
  height,
  roundness,
  lobes = 5,
  wobble = 0,
  seed = 0,
  samples = 48,
}: SurfaceShapeOptions): Point[] {
  if (shape === "capsule" || shape === "cylinder") {
    const range = shape === "capsule" ? CAPSULE_CAP : CYLINDER_CAP;
    const cap = lerp(range.min, range.max, clamp(roundness, 0, 1));
    return barrelPoints(width, height, cap, samples);
  }

  if (shape === "diamond") {
    const { sharp, soft } = DIAMOND_EXPONENT;
    return diamondPoints(
      width,
      height,
      lerp(sharp, soft, clamp(roundness, 0, 1)),
      samples,
    );
  }

  const base = superellipsePoints({
    width,
    height,
    roundness: shape === "cone" ? roundness * CONE_BASE_ROUNDNESS : roundness,
    samples,
  });

  if (shape === "round" || (shape === "organic" && wobble === 0)) {
    return base;
  }

  const halfHeight = Math.max(height, 1) / 2;
  const shaped: Point[] = base.map((p, i) => {
    const theta = (i / base.length) * Math.PI * 2;
    if (shape === "cone") {
      // Taper across the whole height rather than only the upper half, which
      // is what gives a cone its straight slanted sides. 0 at the apex, 1 at
      // the base; SVG y grows downward, so the base is positive y.
      const up = clamp((p.y / halfHeight + 1) / 2, 0, 1);
      return { x: p.x * lerp(CONE_APEX, 1, up), y: p.y };
    }
    if (shape === "drop") {
      // SVG y grows downward, so the upper half is where sin is negative.
      const rise = Math.max(0, -Math.sin(theta));
      return { x: p.x * (1 - DROP_TAPER * rise), y: p.y };
    }
    // Keyed on the angle the bump is seen at, not on `theta` — the two only
    // agree for a true ellipse, and a parameter-keyed wobble is constant
    // around each ring `solid.ts` revolves, which would leave the lumps
    // pinned in screen space however far the head turned.
    const r =
      1 + wobbleAt(Math.atan2(p.y, p.x), lobes, seed) * wobble * WOBBLE_REACH;
    return { x: p.x * r, y: p.y * r };
  });

  return shaped;
}

/** The family's outline as an SVG path. Unchanged by the move to solids. */
export function surfacePath(opts: SurfaceShapeOptions): string {
  return smoothClosedPath(surfacePoints(opts));
}
