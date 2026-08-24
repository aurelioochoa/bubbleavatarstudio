// Head projection (FR-8.2): the face frame sits on an ellipsoid, so turning
// the head sweeps anchors along a curved surface and foreshortens them, rather
// than shearing the drawing.
import { describe, expect, it } from "vitest";
import { projectFace } from "./projection";

const FLAT = { x: 0, y: 0, z: 0 };
const SIZE = { width: 220, height: 200 };

describe("projectFace", () => {
  it("is the identity when the head faces the viewer", () => {
    const p = projectFace({ ...SIZE, perspective: 1, rotation: FLAT });
    const anchor = p.project(30, -10);
    expect(anchor.x).toBeCloseTo(30);
    expect(anchor.y).toBeCloseTo(-10);
    expect(anchor.depth).toBeGreaterThan(0);
    expect(p.scaleX).toBeCloseTo(1);
    expect(p.scaleY).toBeCloseTo(1);
  });

  it("sweeps anchors horizontally as the head yaws", () => {
    const p = projectFace({
      ...SIZE,
      perspective: 1,
      rotation: { x: 0, y: 30, z: 0 },
    });
    const centre = p.project(0, 0);
    const right = p.project(60, 0);
    // A yaw to the right carries the whole face with it...
    expect(centre.x).toBeGreaterThan(0);
    // ...and the anchor on the far side crowds toward the silhouette,
    // travelling less than the centre did.
    expect(right.x - 60).toBeLessThan(centre.x);
  });

  it("foreshortens the silhouette as the head turns", () => {
    const yawed = projectFace({
      ...SIZE,
      perspective: 1,
      rotation: { x: 0, y: 40, z: 0 },
    });
    const pitched = projectFace({
      ...SIZE,
      perspective: 1,
      rotation: { x: 40, y: 0, z: 0 },
    });
    expect(yawed.scaleX).toBeLessThan(1);
    expect(yawed.scaleY).toBeCloseTo(1);
    expect(pitched.scaleY).toBeLessThan(1);
    expect(pitched.scaleX).toBeCloseTo(1);
  });

  it("reports depth so anchors turning away can be hidden", () => {
    const p = projectFace({
      ...SIZE,
      perspective: 1,
      rotation: { x: 0, y: 80, z: 0 },
    });
    // A yaw to the viewer's right carries the character's right side away
    // behind the silhouette and brings its left side into view.
    expect(p.project(90, 0).depth).toBeLessThan(0);
    expect(p.project(-90, 0).depth).toBeGreaterThan(0);
  });

  it("scales the whole effect by perspective, flat at zero", () => {
    const rotation = { x: 20, y: 30, z: 0 };
    const flat = projectFace({ ...SIZE, perspective: 0, rotation });
    expect(flat.project(40, 20).x).toBeCloseTo(40);
    expect(flat.project(40, 20).y).toBeCloseTo(20);
    expect(flat.scaleX).toBeCloseTo(1);

    const half = projectFace({ ...SIZE, perspective: 0.5, rotation });
    const full = projectFace({ ...SIZE, perspective: 1, rotation });
    expect(Math.abs(half.project(0, 0).x)).toBeLessThan(
      Math.abs(full.project(0, 0).x),
    );
  });

  it("is deterministic and never returns NaN outside the surface", () => {
    const p = projectFace({
      ...SIZE,
      perspective: 1,
      rotation: { x: 15, y: -25, z: 0 },
    });
    // Anchors beyond the ellipsoid must still resolve to finite numbers.
    for (const [x, y] of [
      [0, 0],
      [500, 0],
      [0, -500],
      [-400, 400],
    ] as const) {
      const a = p.project(x, y);
      expect(Number.isFinite(a.x)).toBe(true);
      expect(Number.isFinite(a.y)).toBe(true);
      expect(Number.isFinite(a.depth)).toBe(true);
    }
    expect(p.project(30, 10)).toEqual(p.project(30, 10));
  });
});
