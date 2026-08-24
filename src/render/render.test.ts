// FR-10/F2 render determinism: byte-exact golden SVG snapshots.
import { describe, expect, it } from "vitest";
import { createBubble } from "../domain/document/create";
import { ambientAt } from "../domain/playback/ambient";
import { buildScene, restingScene, liveFrame } from "./scene";
import { sceneToSvg } from "./svg";
import type { Bubble, MoodEye, StudioDocument } from "../domain/document/types";
import full from "../test/fixtures/full.json";

const doc = full as unknown as StudioDocument;

const ZERO_EYE: MoodEye = {
  rotationXDeg: 0,
  rotationYDeg: 0,
  rotationZDeg: 0,
  scaleX: 1,
  scaleY: 1,
  offsetX: 0,
  offsetY: 0,
};

describe("sceneToSvg determinism", () => {
  it("produces byte-identical SVG for identical input", () => {
    const a = sceneToSvg(restingScene(doc.bubbles[0], 0));
    const b = sceneToSvg(restingScene(doc.bubbles[0], 0));
    expect(a).toBe(b);
  });

  it("resting golden (transparent background)", async () => {
    await expect(
      sceneToSvg(restingScene(doc.bubbles[0], 0)),
    ).toMatchFileSnapshot("goldens/resting.svg");
  });

  it("ambient golden (t=1300)", async () => {
    await expect(
      sceneToSvg(restingScene(doc.bubbles[1], 1300)),
    ).toMatchFileSnapshot("goldens/ambient.svg");
  });
});

describe("backgrounds (FR-10)", () => {
  it("solid, linear and radial render differently and stay valid", () => {
    const scene = restingScene(doc.bubbles[0], 0);
    const transparent = sceneToSvg(scene, { background: null });
    const solid = sceneToSvg(scene, {
      background: { type: "solid", color: "#0b0d16" },
    });
    const linear = sceneToSvg(scene, {
      background: { type: "linear", from: "#1a1d2e", to: "#0b0d16" },
    });
    const radial = sceneToSvg(scene, {
      background: { type: "radial", from: "#ffffff", to: "#6c7bff" },
    });
    expect(solid).not.toBe(transparent);
    expect(linear).toContain("linearGradient");
    expect(radial).toContain("radialGradient");
    for (const svg of [solid, linear, radial]) {
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg.endsWith("</svg>")).toBe(true);
    }
  });
});

describe("volume: the face sits on a surface (FR-8.2)", () => {
  const base: Bubble = doc.bubbles[0];
  // perspective 1 turns the face fully; the fixture's own 0.25 is exercised by
  // the "respects perspective" case below.
  const bubble: Bubble = {
    ...base,
    body: {
      ...base.body,
      surface: { ...base.body.surface, perspective: 1 },
    },
  };
  const at = (
    rotation: { x: number; y: number; z: number },
    who: Bubble = bubble,
  ) =>
    buildScene(who, {
      tAbsMs: 0,
      mood: {
        left: ZERO_EYE,
        right: ZERO_EYE,
        colorOverride: null,
      },
      blink: 0,
      ambient: { bodyY: 0, bodyRotationDeg: 0, eyeY: 0 },
      headRotation: rotation,
    });

  it("sweeps the eyes across the face as the head turns", () => {
    const facing = at({ x: 0, y: 0, z: 0 });
    const turned = at({ x: 0, y: 35, z: 0 });
    expect(turned.eyes.left.x).not.toBeCloseTo(facing.eyes.left.x);
    expect(turned.eyes.right.x).not.toBeCloseTo(facing.eyes.right.x);
    // Both eyes travel the same way; the far one lags as it wraps around.
    expect(turned.eyes.left.x).toBeGreaterThan(facing.eyes.left.x);
    expect(turned.eyes.right.x).toBeGreaterThan(facing.eyes.right.x);
  });

  it("foreshortens an eye as its part of the surface turns away", () => {
    const facing = at({ x: 0, y: 0, z: 0 });
    const turned = at({ x: 0, y: 45, z: 0 });
    expect(turned.eyes.right.width).toBeLessThan(facing.eyes.right.width);
  });

  it("hides the eye that has rotated behind the silhouette", () => {
    const extreme = at({ x: 0, y: 85, z: 0 });
    expect(extreme.eyes.right.opacity).toBe(0);
    expect(extreme.eyes.left.opacity).toBeGreaterThan(0);
  });

  it("scales the silhouette instead of shearing it", () => {
    const svg = sceneToSvg(at({ x: 25, y: 25, z: 0 }));
    expect(svg).not.toContain("skew");
    expect(svg).toContain("scale(");
  });

  it("carries the eyes with the head, not just the body", () => {
    // The head group owns position and roll, so every child inherits it —
    // the eyes used to sit outside the rotated body entirely.
    const facing = at({ x: 0, y: 0, z: 0 });
    const rolled = at({ x: 0, y: 0, z: 30 });
    const angle = (scene: { head: { transform: string } }) =>
      Number(/rotate\(([-0-9.]+)\)/.exec(scene.head.transform)?.[1] ?? "0");
    expect(angle(rolled) - angle(facing)).toBeCloseTo(30);
  });

  it("respects the surface's own perspective setting", () => {
    // The unmodified fixture only leans into the turn a quarter of the way.
    const shy = at({ x: 0, y: 85, z: 0 }, base);
    expect(shy.eyes.right.opacity).toBe(1);
  });
});

describe("mood eye rotation (FR-4.1)", () => {
  const leftEye = (delta: Partial<MoodEye>) =>
    buildScene(doc.bubbles[0], {
      tAbsMs: 0,
      mood: {
        left: { ...ZERO_EYE, ...delta },
        right: ZERO_EYE,
        colorOverride: null,
      },
      blink: 0,
      ambient: { bodyY: 0, bodyRotationDeg: 0, eyeY: 0 },
      headRotation: { x: 0, y: 0, z: 0 },
    }).eyes.left;

  it("foreshortens the eye as it turns away from the viewer", () => {
    const resting = leftEye({});
    // Pitch turns the eye about its horizontal axis, so height shortens.
    const pitched = leftEye({ rotationXDeg: 60 });
    expect(pitched.height).toBeCloseTo(resting.height * 0.5);
    expect(pitched.width).toBeCloseTo(resting.width);
    // Yaw turns it about its vertical axis, so width narrows.
    const yawed = leftEye({ rotationYDeg: 60 });
    expect(yawed.width).toBeCloseTo(resting.width * 0.5);
    expect(yawed.height).toBeCloseTo(resting.height);
  });

  it("treats opposite angles symmetrically and never inverts", () => {
    expect(leftEye({ rotationXDeg: -40 }).height).toBeCloseTo(
      leftEye({ rotationXDeg: 40 }).height,
    );
    expect(leftEye({ rotationYDeg: 200 }).width).toBeGreaterThanOrEqual(0);
  });
});

describe("eye roundness (FR-3.1)", () => {
  const rx = (roundness: number): string => {
    const base = doc.bubbles[0];
    const bubble: Bubble = {
      ...base,
      restingFace: {
        ...base.restingFace,
        eye: { ...base.restingFace.eye, roundness },
      },
    };
    const svg = sceneToSvg(restingScene(bubble, 0));
    return /<rect[^>]*rx="([0-9.]+)"/.exec(svg)?.[1] ?? "";
  };

  it("rounds the eye from a sharp rectangle to a capsule", () => {
    // The capsule is half the shorter side; roundness scales down from there.
    const capsule = Number(rx(1));
    expect(capsule).toBeGreaterThan(0);
    expect(Number(rx(0))).toBe(0);
    expect(Number(rx(0.5))).toBeCloseTo(capsule / 2);
  });
});

describe("output size (FR-10.4)", () => {
  it("scales the rendered box while keeping the coordinate system", () => {
    const scene = restingScene(doc.bubbles[0], 0);
    const scaled = sceneToSvg(scene, { background: null, size: 256 });
    expect(scaled).toContain('width="256"');
    expect(scaled).toContain('height="256"');
    // The viewBox is the drawing's own coordinate space and must not change.
    expect(scaled).toContain('viewBox="0 0 512 512"');
  });

  it("defaults to the scene size", () => {
    const scene = restingScene(doc.bubbles[0], 0);
    expect(sceneToSvg(scene)).toContain('width="512"');
  });
});

describe("live frame with a playing loop", () => {
  const bubble: Bubble = doc.bubbles[0];
  const kit = bubble.ownKit ?? doc.starterKit;
  const loopId = kit.loops[0].id;

  it("golden at a fixed timestamp", async () => {
    const { scene } = liveFrame(bubble, kit, loopId, 3000, {
      x: 0,
      y: 0,
      z: 0,
    });
    await expect(sceneToSvg(scene)).toMatchFileSnapshot(
      "goldens/live-3000.svg",
    );
  });

  it("falls back to the resting face for a loop the kit does not have (FR-6.4)", () => {
    const head = { x: 0, y: 0, z: 0 };
    const frame = liveFrame(bubble, kit, "loop_from_another_kit", 3000, head);
    expect(frame.player).toBeNull();
    expect(sceneToSvg(frame.scene)).toBe(
      sceneToSvg(restingScene(bubble, 3000, head)),
    );
  });

  it("head rotation changes the frame deterministically", () => {
    const frame = (r: { x: number; y: number; z: number }) =>
      sceneToSvg(liveFrame(bubble, kit, loopId, 3000, r).scene);
    const turned = frame({ x: 15, y: -10, z: 5 });
    expect(turned).not.toBe(frame({ x: 0, y: 0, z: 0 }));
    expect(turned).toBe(frame({ x: 15, y: -10, z: 5 }));
  });
});

describe("ambient feeds the scene", () => {
  it("body position shifts with ambient time", () => {
    const bubble = createBubble("X");
    const s0 = restingScene(bubble, 0);
    const s1 = restingScene(bubble, 1300);
    expect(ambientAt(bubble.ambient, 1300).bodyY).not.toBe(0);
    // Ambient drift moves the head group; the body transform is foreshortening.
    expect(s0.head.transform).not.toBe(s1.head.transform);
  });
});
