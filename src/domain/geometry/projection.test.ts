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

  it("keeps a turn rigid at every perspective (never shrinks the face)", () => {
    // A blend between the identity and a rotation is not a rotation. Lerping
    // the two agreed near 0 and disagreed everywhere else: at half a turn they
    // point opposite ways, so the blend cancelled and pulled the whole face
    // frame toward the origin. At the shipped default of 0.6 that left the two
    // eyes 15u apart instead of 76u, stacked in the middle of the head, which
    // is exactly what a full-range turn showed. Scaling the *angle* instead
    // keeps every intermediate pose a real rotation, and a rotation is rigid.
    const span = (p: ReturnType<typeof projectFace>): number => {
      const a = p.project(-38, 0);
      const b = p.project(38, 0);
      return Math.hypot(a.x - b.x, a.y - b.y, a.depth - b.depth);
    };
    for (const perspective of [0, 0.25, 0.6, 1]) {
      for (const y of [-180, -140, -90, 0, 90, 140, 180]) {
        for (const x of [-180, -45, 0, 45, 180]) {
          const p = projectFace({
            ...SIZE,
            perspective,
            rotation: { x, y, z: 0 },
          });
          expect(span(p)).toBeCloseTo(76, 6);
        }
      }
    }
  });

  it("keeps the silhouette the envelope of the surface", () => {
    // scaleX and project() have to describe the same head. They were computed
    // by two different blends, so they drifted apart as the turn grew: at half
    // a turn the surface had shrunk to a fifth of the body while the outline
    // was still full width, and the stage drew a full-size blob with a stubby
    // equator rattling around inside it. Sweeping the equator has to touch the
    // rim, at every angle and every perspective.
    const rx = SIZE.width / 2;
    for (const perspective of [0, 0.25, 0.6, 1]) {
      for (const y of [-180, -120, -55, 0, 55, 120, 180]) {
        const p = projectFace({
          ...SIZE,
          perspective,
          rotation: { x: 0, y, z: 0 },
        });
        let reach = 0;
        for (let i = 0; i <= 2000; i++) {
          const px = -rx + (2 * rx * i) / 2000;
          reach = Math.max(reach, Math.abs(p.project(px, 0).x));
        }
        expect(reach / rx).toBeCloseTo(p.scaleX, 3);
      }
    }
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
