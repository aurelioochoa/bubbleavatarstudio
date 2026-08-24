// Surface shape families (FR-2.6, FR-2.7). Pure math: every family is a
// deterministic function of its parameters, because the renderer, the goldens
// and the exported files all rely on identical input giving identical bytes.
import {
  smoothClosedPath,
  superellipsePoints,
  type Point,
} from "./primitives";

export type ShapeFamily = "round" | "organic" | "drop";

export interface SurfaceShapeOptions {
  shape: ShapeFamily;
  width: number;
  height: number;
  /** 0 squares the silhouette off, 1 is an ellipse. */
  roundness: number;
  /** organic: how many bumps run around the perimeter. */
  lobes?: number;
  /** organic: how far the radius strays from round, 0..1. */
  wobble?: number;
  /** organic: which arrangement of bumps. */
  seed?: number;
  samples?: number;
}

/** How far full wobble may push the outline past its box. */
const WOBBLE_REACH = 0.35;
/** How much a drop narrows toward its top. */
const DROP_TAPER = 0.55;

/** Deterministic hash of a number to [0,1). */
function hash01(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 2654435761) >>> 0;
  h ^= h >>> 15;
  return (h >>> 0) / 4294967295;
}

/**
 * Two out-of-phase harmonics give a lopsided, hand-made outline; one alone
 * reads as a regular flower.
 */
function wobbleAt(theta: number, lobes: number, seed: number): number {
  const phase1 = hash01(seed) * Math.PI * 2;
  const phase2 = hash01(seed + 977) * Math.PI * 2;
  const weight = 0.35 + hash01(seed + 31) * 0.3;
  const primary = Math.sin(theta * lobes + phase1);
  const secondary = Math.sin(theta * Math.max(1, lobes - 2) + phase2);
  return primary * (1 - weight) + secondary * weight;
}

export function surfacePath({
  shape,
  width,
  height,
  roundness,
  lobes = 5,
  wobble = 0,
  seed = 0,
  samples = 48,
}: SurfaceShapeOptions): string {
  const base = superellipsePoints({ width, height, roundness, samples });

  if (shape === "round" || (shape === "organic" && wobble === 0)) {
    return smoothClosedPath(base);
  }

  const shaped: Point[] = base.map((p, i) => {
    const theta = (i / base.length) * Math.PI * 2;
    if (shape === "drop") {
      // SVG y grows downward, so the upper half is where sin is negative.
      const rise = Math.max(0, -Math.sin(theta));
      return { x: p.x * (1 - DROP_TAPER * rise), y: p.y };
    }
    const r = 1 + wobbleAt(theta, lobes, seed) * wobble * WOBBLE_REACH;
    return { x: p.x * r, y: p.y * r };
  });

  return smoothClosedPath(shaped);
}
