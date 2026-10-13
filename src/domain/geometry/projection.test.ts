// Head projection (FR-8.2), which is also what makes a mood portable
// (FR-4.6): its deltas are expressed in the face frame, so one mood reads
// correctly at every head orientation.
//
// The face frame sits on an ellipsoid, so turning
// the head sweeps anchors along a curved surface and foreshortens them, rather
// than shearing the drawing.
import { describe, expect, it } from "vitest";
import { projectFace } from "./projection";

const FLAT = { x: 0, y: 0, z: 0 };
// Depth is authored (FR-2.2). 170 is what the pre-v3 derived rule produced for
// this box — min(220, 200) * 0.85 — so every case below keeps its old numbers.
const SIZE = { width: 220, height: 200, depth: 170 };

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

  it("reaches the back at a half turn with every nonzero perspective", () => {
    for (const perspective of [0.05, 0.25, 0.6, 1]) {
      for (const axis of ["x", "y"] as const) {
        for (const degrees of [-180, 180]) {
          const p = projectFace({
            ...SIZE,
            perspective,
            rotation: { ...FLAT, [axis]: degrees },
          });
          expect(p.project(0, 0).x).toBeCloseTo(0, 6);
          expect(p.project(0, 0).y).toBeCloseTo(0, 6);
          expect(p.project(0, 0).depth).toBeCloseTo(-SIZE.depth / 2, 6);
        }
      }
    }
  });

  it("continues smoothly through the wrapped half turn on both axes", () => {
    for (const perspective of [0, 0.05, 0.25, 0.6, 1]) {
      for (const axis of ["x", "y"] as const) {
        const at = (degrees: number) =>
          projectFace({
            ...SIZE,
            perspective,
            rotation: { ...FLAT, [axis]: degrees },
          }).project(30, -10);
        const before = at(179.99);
        const after = at(-179.99);
        expect(
          Math.hypot(
            before.x - after.x,
            before.y - after.y,
            before.depth - after.depth,
          ),
        ).toBeLessThan(0.04);
        expect(at(180)).toEqual(at(-180));
        expect(at(210)).toEqual(at(-150));
        expect(at(360)).toEqual(at(0));
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
  // FR-2.2: depth is authored, not derived. Before v3 the depth radius was
  // always `min(rx, ry) * 0.85`, so a character could not be made shallow or
  // deep — every solid was as thick as its own narrow axis allowed.
  it("takes an authored depth rather than deriving one from the box", () => {
    const rotation = { x: 0, y: 90, z: 0 };
    const shallow = projectFace({
      width: 220,
      height: 200,
      depth: 40,
      perspective: 1,
      rotation,
    });
    const deep = projectFace({
      width: 220,
      height: 200,
      depth: 300,
      perspective: 1,
      rotation,
    });

    // Turned side-on, what the viewer sees across is the depth: a deep solid
    // stays wide, a shallow one narrows toward a card seen edge-on.
    expect(deep.scaleX).toBeGreaterThan(shallow.scaleX);
    expect(shallow.scaleX).toBeLessThan(0.25);

    // Depth also carries anchors further out of the face plane.
    expect(deep.project(0, 0).x).toBeGreaterThan(shallow.project(0, 0).x);
  });

  // The v2 -> v3 migration writes `min(width, height) * 0.85` so that no saved
  // document changes appearance. This pins that number to the behaviour it is
  // meant to reproduce.
  it("reproduces the pre-v3 derived depth when given min(w, h) * 0.85", () => {
    const rotation = { x: 10, y: 55, z: 0 };
    const derived = Math.min(220, 200) * 0.85;
    const p = projectFace({
      width: 220,
      height: 200,
      depth: derived,
      perspective: 0.6,
      rotation,
    });
    // Values measured off the derived implementation before it was replaced.
    // They must not move: if they do, the migration default is not
    // behaviour-preserving and every saved character just changed shape.
    expect(p.scaleX).toBeCloseTo(0.938344, 6);
    expect(p.scaleY).toBeCloseTo(0.998483, 6);
    expect(p.project(40, -20).x).toBeCloseTo(75.666221, 6);
  });
});
