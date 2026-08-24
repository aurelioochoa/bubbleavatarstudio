// Pure geometric primitives (FR-2, docs/04 ADR: geometry is plain math).
export interface BlobOptions {
  width: number;
  height: number;
  /** 0..1 — 0: rectangle, 1: ellipse. */
  roundness: number;
  /** Number of samples; fixed default keeps output deterministic. */
  samples?: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Samples the superellipse outline. Roundness counts up toward the ellipse:
 * exponent 2 is an ellipse, large exponents square the corners off.
 */
export function superellipsePoints({
  width,
  height,
  roundness,
  samples = 48,
}: BlobOptions): Point[] {
  const n = lerp(16, 2, clamp(roundness, 0, 1));
  const a = width / 2;
  const b = height / 2;
  const pts: Point[] = [];
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * Math.PI * 2;
    const ct = Math.cos(t);
    const st = Math.sin(t);
    pts.push({
      x: a * Math.sign(ct) * Math.abs(ct) ** (2 / n),
      y: b * Math.sign(st) * Math.abs(st) ** (2 / n),
    });
  }
  return pts;
}

/**
 * A closed Catmull-Rom spline through the points, emitted as cubic Béziers.
 * Sampled outlines were previously joined with straight segments, which reads
 * as a faceted polygon at stage size however many samples are taken.
 */
export function smoothClosedPath(pts: Point[]): string {
  if (pts.length < 3) return "";
  const at = (i: number): Point => {
    // .at rather than [] so the fallback is honestly typed; the index is
    // wrapped into range, so it never actually fires.
    return pts.at(((i % pts.length) + pts.length) % pts.length) ?? { x: 0, y: 0 };
  };
  const first = at(0);
  const out = [`M ${fmt(first.x)} ${fmt(first.y)}`];
  for (let i = 0; i < pts.length; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    // Catmull-Rom to Bézier: the tangent at each knot is a sixth of the span
    // between its neighbours.
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    out.push(
      `C ${fmt(c1.x)} ${fmt(c1.y)} ${fmt(c2.x)} ${fmt(c2.y)} ${fmt(p2.x)} ${fmt(p2.y)}`,
    );
  }
  return `${out.join(" ")} Z`;
}

/** Deterministic superellipse (squircle) path centered at (0,0). */
export function blobPath(options: BlobOptions): string {
  return smoothClosedPath(superellipsePoints(options));
}

/** Capsule: rounded-rect path with full-round ends. */
export function capsulePath(width: number, height: number): string {
  const r = Math.min(width, height) / 2;
  const x = -width / 2;
  const y = -height / 2;
  return [
    `M ${fmt(x + r)} ${fmt(y)}`,
    `H ${fmt(x + width - r)}`,
    `A ${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x + width)} ${fmt(y + r)}`,
    `V ${fmt(y + height - r)}`,
    `A ${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x + width - r)} ${fmt(y + height)}`,
    `H ${fmt(x + r)}`,
    `A ${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x)} ${fmt(y + height - r)}`,
    `V ${fmt(y + r)}`,
    `A ${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x + r)} ${fmt(y)}`,
    "Z",
  ].join(" ");
}

export function circlePath(diameter: number): string {
  const r = diameter / 2;
  return `M ${fmt(-r)} 0 A ${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(r)} 0 A ${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(-r)} 0 Z`;
}

export function ringPath(outer: number, thickness: number): string {
  const ro = outer / 2;
  const ri = Math.max(ro - thickness, 0);
  return `${circlePath(outer)} ${circlePath(ri * 2)}`;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Deterministic number formatting (2 decimals, trailing zeros trimmed). */
/**
 * Precision for multipliers. Coordinates live in a 512-unit space where two
 * decimals are plenty, but a scale factor sits near 1 — breathing spans less
 * than a hundredth, so two decimals quantise the swell into visible steps.
 */
export function fmtScale(v: number): string {
  return fmt4(v);
}

function fmt4(v: number): string {
  const r = Math.round(v * 10_000) / 10_000;
  return String(Object.is(r, -0) ? 0 : r);
}

export function fmt(v: number): string {
  const r = Math.round(v * 100) / 100;
  return String(r);
}
