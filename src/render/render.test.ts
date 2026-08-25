// FR-10/F2 render determinism: byte-exact golden SVG snapshots.
import { describe, expect, it } from "vitest";
import { createBubble } from "../domain/document/create";
import { ambientAt } from "../domain/playback/ambient";
import { buildScene, restingScene, liveFrame } from "./scene";
import { sceneToSvg } from "./svg";
import { luminance } from "./color";
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

// FR-2.6 / FR-2.7: the shape family reaches the renderer. The round family is
// the pre-v2 outline, which is what keeps the goldens above frozen.
describe("surface shape families", () => {
  const shaped = (patch: Partial<Bubble["body"]["surface"]>) => {
    const b = createBubble("Shape");
    return restingScene({
      ...b,
      body: { ...b.body, surface: { ...b.body.surface, ...patch } },
    }).body.path;
  };

  it("round is the outline the pre-v2 renderer drew", () => {
    expect(shaped({ shape: "round" })).toBe(
      shaped({ shape: "organic", wobble: 0 }),
    );
  });

  it("organic wobble moves the outline off round", () => {
    expect(shaped({ shape: "organic", wobble: 0.5 })).not.toBe(
      shaped({ shape: "round" }),
    );
  });

  it("the organic seed picks a different arrangement of the same bumps", () => {
    const a = shaped({ shape: "organic", wobble: 0.5, seed: 1 });
    const b = shaped({ shape: "organic", wobble: 0.5, seed: 2 });
    expect(a).not.toBe(b);
  });

  it("drop narrows the outline toward its top", () => {
    expect(shaped({ shape: "drop" })).not.toBe(shaped({ shape: "round" }));
  });

  it("stays deterministic per family", () => {
    const opts = { shape: "organic" as const, wobble: 0.6, seed: 7, lobes: 6 };
    expect(shaped(opts)).toBe(shaped(opts));
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

describe("volume: the surface is shaded", () => {
  const bubble: Bubble = doc.bubbles[0];

  it("fills the body with a lit-to-shadow gradient rather than a flat colour", () => {
    const svg = sceneToSvg(restingScene(bubble, 0));
    expect(svg).toContain("radialGradient");
    expect(svg).toMatch(/<path id="body"[^>]*fill="url\(#bs-[a-z0-9]+\)"/);
    const stops = [...svg.matchAll(/stop-color="([^"]+)"/g)].map((m) => m[1]);
    expect(stops).toHaveLength(3);
    const [crown, base, edge] = stops;
    expect(luminance(crown ?? "")).toBeGreaterThan(luminance(base ?? ""));
    expect(luminance(edge ?? "")).toBeLessThan(luminance(base ?? ""));
  });

  it("slides the lit crown as the head turns", () => {
    const cx = (yaw: number) => {
      const svg = sceneToSvg(
        buildScene(bubble, {
          tAbsMs: 0,
          mood: { left: ZERO_EYE, right: ZERO_EYE, colorOverride: null },
          blink: 0,
          ambient: {
            bodyY: 0,
            bodyRotationDeg: 0,
            eyeY: 0,
            eyeX: 0,
            bodyScale: 1,
          },
          headRotation: { x: 0, y: yaw, z: 0 },
        }),
      );
      return Number(/radialGradient[^>]*cx="([-0-9.]+)"/.exec(svg)?.[1] ?? "0");
    };
    // The light stays where it is, so the crown travels against the turn.
    expect(cx(40)).toBeLessThan(cx(0));
    expect(cx(-40)).toBeGreaterThan(cx(0));
  });

  it("gives two differently coloured characters their own gradient", () => {
    const other: Bubble = {
      ...bubble,
      colors: { ...bubble.colors, body: "#f0c419" },
    };
    const idOf = (b: Bubble) =>
      /radialGradient id="([^"]+)"/.exec(sceneToSvg(restingScene(b, 0)))?.[1];
    expect(idOf(bubble)).not.toBe(idOf(other));
  });
});

describe("liveness: a resting character keeps moving (FR-7)", () => {
  const bubble: Bubble = doc.bubbles[0];

  it("blinks while nothing is playing", () => {
    const heights = new Set<string>();
    for (let t = 0; t < 12_000; t += 50) {
      const scene = restingScene(bubble, t);
      heights.add(scene.eyes.left.height.toFixed(2));
    }
    // A never-blinking resting face would only ever show one eye height.
    expect(heights.size).toBeGreaterThan(3);
  });

  it("holds the eyes open on the first frame, so snapshots are not caught mid-blink", () => {
    const open = restingScene(bubble, 0).eyes.left.height;
    expect(open).toBeCloseTo(
      bubble.restingFace.eye.height * bubble.restingFace.left.scaleY,
      1,
    );
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
      ambient: { bodyY: 0, bodyRotationDeg: 0, eyeY: 0, eyeX: 0, bodyScale: 1 },
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
      ambient: { bodyY: 0, bodyRotationDeg: 0, eyeY: 0, eyeX: 0, bodyScale: 1 },
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

// FR-8.4: an optional overlay drawing the surface the eyes are anchored to,
// so the volume being posed is visible. Off unless asked for — which is what
// keeps the goldens above frozen.
describe("projection guide (FR-8.4)", () => {
  const bubble = doc.bubbles[0];

  it("is absent unless requested", () => {
    expect(restingScene(bubble, 0).guide).toBeUndefined();
    expect(sceneToSvg(restingScene(bubble, 0))).not.toContain('id="guide"');
  });

  it("draws the silhouette and the two great arcs when requested", () => {
    const scene = restingScene(bubble, 0, { x: 0, y: 0, z: 0 }, { guide: true });
    expect(scene.guide?.arcs).toHaveLength(2);
    expect(scene.guide?.outline.path.startsWith("M")).toBe(true);
    const svg = sceneToSvg(scene);
    expect(svg).toContain('id="guide"');
    // Stage chrome, not character colour: it inherits the host's own accent.
    expect(svg).toContain('stroke="currentColor"');
  });

  it("bends its arcs as the head turns", () => {
    const face = restingScene(bubble, 0, { x: 0, y: 0, z: 0 }, { guide: true });
    const turned = restingScene(bubble, 0, { x: 0, y: 40, z: 0 }, { guide: true });
    expect(turned.guide?.arcs[0]).not.toBe(face.guide?.arcs[0]);
    expect(turned.guide?.outline.transform).not.toBe(
      face.guide?.outline.transform,
    );
  });

  it("stays byte-stable like everything else the renderer emits", () => {
    const once = sceneToSvg(restingScene(bubble, 0, { x: 5, y: 12, z: 0 }, { guide: true }));
    const twice = sceneToSvg(restingScene(bubble, 0, { x: 5, y: 12, z: 0 }, { guide: true }));
    expect(once).toBe(twice);
  });

  it("never reaches a snapshot, which cannot ask for it", async () => {
    // The overlay is a stage affordance; the exported SVG is the character.
    const { snapshotSvg } = await import("../export/avatar");
    expect(snapshotSvg(bubble, { size: 512, background: null })).not.toContain(
      'id="guide"',
    );
  });
});

// Defects found probing a full turn (docs/research/3d-bubble-exploration.md).
describe("volume: the light survives a full turn", () => {
  const bubble: Bubble = doc.bubbles[0];
  const shadingAt = (rotation: { x: number; y: number; z: number }) => {
    const s = buildScene(bubble, {
      tAbsMs: 0,
      mood: { left: ZERO_EYE, right: ZERO_EYE, colorOverride: null },
      blink: 0,
      ambient: { bodyY: 0, bodyRotationDeg: 0, eyeY: 0, eyeX: 0, bodyScale: 1 },
      headRotation: rotation,
    }).body.shading;
    if (!s) throw new Error("body is unshaded");
    return s;
  };

  it("leaves a face-on character's gradient exactly where it was", () => {
    const s = shadingAt({ x: 0, y: 0, z: 0 });
    expect(s.cx).toBeCloseTo(0.35, 10);
    expect(s.cy).toBeCloseTo(0.32, 10);
  });

  it("keeps the lit crown on the character at every yaw", () => {
    for (let yaw = 0; yaw < 360; yaw += 10) {
      const { cx } = shadingAt({ x: 0, y: yaw, z: 0 });
      expect({ yaw, cx }).toMatchObject({ cx: expect.any(Number) });
      expect(cx).toBeGreaterThan(0.15);
      expect(cx).toBeLessThan(0.85);
    }
  });

  it("keeps it on the character at every pitch too", () => {
    for (let pitch = 0; pitch < 360; pitch += 10) {
      const { cy } = shadingAt({ x: pitch, y: 0, z: 0 });
      expect(cy).toBeGreaterThan(0.15);
      expect(cy).toBeLessThan(0.85);
    }
  });

  it("comes back to where it started after a whole turn", () => {
    const start = shadingAt({ x: 0, y: 0, z: 0 });
    const round = shadingAt({ x: 360, y: 360, z: 0 });
    expect(round.cx).toBeCloseTo(start.cx, 6);
    expect(round.cy).toBeCloseTo(start.cy, 6);
  });
});

describe("volume: extras sit on the surface too (FR-8.2)", () => {
  const base: Bubble = doc.bubbles[0];
  const near = "#111111"; // screen-left, authored underneath
  const far = "#222222"; // screen-right, authored on top
  const extra = (
    x: number,
    z: number,
    color: string,
  ): Bubble["body"]["extras"][number] => ({
    id: `ext_${color.slice(1)}`,
    kind: "circle",
    width: 40,
    height: 40,
    roundness: 1,
    x,
    y: 0,
    rotationDeg: 0,
    z,
    colorRole: "custom",
    color,
  });
  const bubble: Bubble = {
    ...base,
    body: {
      surface: { ...base.body.surface, perspective: 1 },
      extras: [extra(-60, 0, near), extra(60, 1, far)],
    },
  };

  const at = (rotation: { x: number; y: number; z: number }) =>
    buildScene(bubble, {
      tAbsMs: 0,
      mood: { left: ZERO_EYE, right: ZERO_EYE, colorOverride: null },
      blink: 0,
      ambient: { bodyY: 0, bodyRotationDeg: 0, eyeY: 0, eyeX: 0, bodyScale: 1 },
      headRotation: rotation,
    });

  const of = (
    scene: ReturnType<typeof at>,
    color: string,
  ): (typeof scene.extras)[number] => {
    const found = scene.extras.find((e) => e.fill === color);
    if (!found) throw new Error(`no extra filled ${color}`);
    return found;
  };
  const xOf = (e: { transform: string }) =>
    Number(/translate\(([-0-9.]+)/.exec(e.transform)?.[1] ?? "0");

  it("leaves a face-on character's extras exactly as they were", () => {
    const scene = at({ x: 0, y: 0, z: 0 });
    expect(of(scene, near).transform).toBe("translate(-60 0) rotate(0)");
    expect(of(scene, far).transform).toBe("translate(60 0) rotate(0)");
    expect(of(scene, near).opacity).toBe(1);
  });

  it("carries an extra around the surface rather than sliding it flat", () => {
    // The eyes are the reference: an extra on the same surface travels with
    // them, and the far side of the head foreshortens toward the silhouette.
    const facing = at({ x: 0, y: 0, z: 0 });
    const turned = at({ x: 0, y: 40, z: 0 });
    // Every anchor on the surface travels the same way the eyes do.
    const eyeTravel = turned.eyes.left.x - facing.eyes.left.x;
    expect(eyeTravel).toBeGreaterThan(0);
    expect(xOf(of(turned, near)) - xOf(of(facing, near))).toBeGreaterThan(0);
    expect(xOf(of(turned, far)) - xOf(of(facing, far))).toBeGreaterThan(0);
    // ...and none of them is still sitting on its authored coordinate.
    expect(xOf(of(turned, near))).not.toBeCloseTo(-60, 1);
    expect(xOf(of(turned, far))).not.toBeCloseTo(60, 1);
  });

  it("foreshortens an extra as its part of the surface turns away", () => {
    const facing = of(at({ x: 0, y: 0, z: 0 }), far);
    const turned = of(at({ x: 0, y: 45, z: 0 }), far);
    expect(turned.path.length).toBeGreaterThan(0);
    expect(turned.path).not.toBe(facing.path);
  });

  it("fades an extra that has rotated behind the silhouette", () => {
    expect(of(at({ x: 0, y: 120, z: 0 }), far).opacity).toBe(0);
    expect(of(at({ x: 0, y: 120, z: 0 }), near).opacity).toBeGreaterThan(0);
  });

  it("orders extras by the depth the turn gives them, not by z alone", () => {
    // Face on, the authored z decides: `far` was put on top.
    expect(at({ x: 0, y: 0, z: 0 }).extras.at(-1)?.fill).toBe(far);
    // Turned, the one that swung toward the viewer is in front of it.
    expect(at({ x: 0, y: 60, z: 0 }).extras.at(-1)?.fill).toBe(near);
  });

  it("omits the opacity attribute while an extra is fully visible", () => {
    const svg = sceneToSvg(at({ x: 0, y: 0, z: 0 }));
    expect(svg).not.toContain('opacity="1"');
    expect(sceneToSvg(at({ x: 0, y: 120, z: 0 }))).toContain('opacity="0"');
  });
});

// The cheapest volume cue there is, and the one the exploration notes found
// missing: without it the character reads as art floating on a backdrop rather
// than a solid sitting in a space. Stage chrome like the guide — an avatar
// composited into someone else's page has no ground to cast onto, so the
// snapshot, the ZIP and the runtime never ask for it and the goldens stay frozen.
describe("contact shadow (stage chrome)", () => {
  const bubble = doc.bubbles[0];
  const lit = (
    rotation: { x: number; y: number; z: number },
    bodyY = 0,
    bodyScale = 1,
  ) =>
    buildScene(bubble, {
      tAbsMs: 0,
      mood: { left: ZERO_EYE, right: ZERO_EYE, colorOverride: null },
      blink: 0,
      ambient: { bodyY, bodyRotationDeg: 0, eyeY: 0, eyeX: 0, bodyScale },
      headRotation: rotation,
      shadow: true,
    });

  it("is absent unless requested", () => {
    expect(restingScene(bubble, 0).shadow).toBeUndefined();
    expect(sceneToSvg(restingScene(bubble, 0))).not.toContain("<ellipse");
  });

  it("draws an ellipse on the ground when requested", () => {
    const scene = lit({ x: 0, y: 0, z: 0 });
    expect(scene.shadow?.rx).toBeGreaterThan(0);
    // Flat: a ground plane seen from the front, not a second body.
    expect(scene.shadow?.ry).toBeLessThan((scene.shadow?.rx ?? 0) / 2);
    expect(sceneToSvg(scene)).toContain("<ellipse");
  });

  it("sits under the character rather than inside the head group", () => {
    // Inside #head it would inherit the roll and the bob, and a shadow that
    // tilts with the character is not a shadow.
    const svg = sceneToSvg(lit({ x: 0, y: 0, z: 30 }));
    expect(svg).toContain("<ellipse");
    expect(svg.indexOf("<ellipse")).toBeLessThan(svg.indexOf('id="head"'));
  });

  it("narrows with the silhouette as the head turns", () => {
    const facing = lit({ x: 0, y: 0, z: 0 });
    const turned = lit({ x: 0, y: 70, z: 0 });
    expect(turned.shadow?.rx).toBeLessThan(facing.shadow?.rx ?? 0);
  });

  it("shrinks and fades as the character bobs up off the ground", () => {
    const down = lit({ x: 0, y: 0, z: 0 }, 4);
    const up = lit({ x: 0, y: 0, z: 0 }, -4);
    expect(up.shadow?.rx).toBeLessThan(down.shadow?.rx ?? 0);
    expect(up.shadow?.opacity).toBeLessThan(down.shadow?.opacity ?? 0);
    expect(up.shadow?.opacity).toBeGreaterThan(0);
  });

  it("stays on the ground while the character bobs", () => {
    const down = lit({ x: 0, y: 0, z: 0 }, 4);
    const up = lit({ x: 0, y: 0, z: 0 }, -4);
    expect(down.shadow?.cy).toEqual(expect.any(Number));
    expect(up.shadow?.cy).toBe(down.shadow?.cy);
  });

  it("stays byte-stable like everything else the renderer emits", () => {
    expect(sceneToSvg(lit({ x: 3, y: 9, z: 0 }))).toBe(
      sceneToSvg(lit({ x: 3, y: 9, z: 0 })),
    );
  });

  it("never reaches a snapshot, the ZIP or the runtime", async () => {
    const { snapshotSvg } = await import("../export/avatar");
    expect(snapshotSvg(bubble, { size: 512, background: null })).not.toContain(
      "<ellipse",
    );
  });
});
