// Pure geometric primitives (FR-2, docs/04 ADR: geometry is plain math).
export interface BlobOptions {
  width: number;
  height: number;
  /** 0..1 — 0: rectangle, 1: ellipse. */
  roundness: number;
  /** Number of samples; fixed default keeps output deterministic. */
  samples?: number;
}

/**
 * Deterministic superellipse (squircle) path centered at (0,0).
 * Roundness interpolates the exponent between a rectangle and an ellipse.
 */
export function blobPath({
  width,
  height,
  roundness,
  samples = 64,
}: BlobOptions): string {
  const n = lerp(2, 16, clamp(roundness, 0, 1));
  const a = width / 2;
  const b = height / 2;
  const pts: string[] = [];
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * Math.PI * 2;
    const ct = Math.cos(t);
    const st = Math.sin(t);
    const x = a * Math.sign(ct) * Math.abs(ct) ** (2 / n);
    const y = b * Math.sign(st) * Math.abs(st) ** (2 / n);
    pts.push(`${i === 0 ? "M" : "L"} ${fmt(x)} ${fmt(y)}`);
  }
  return `${pts.join(" ")} Z`;
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
export function fmt(v: number): string {
  const r = Math.round(v * 100) / 100;
  return String(r);
}
