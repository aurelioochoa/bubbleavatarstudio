// FR-10/F2 render determinism: byte-exact golden SVG snapshots.
import { describe, expect, it } from "vitest";
import { createBubble } from "../domain/document/create";
import { ambientAt } from "../domain/playback/ambient";
import { restingScene, liveFrame } from "./scene";
import { sceneToSvg } from "./svg";
import type { Bubble, StudioDocument } from "../domain/document/types";
import full from "../test/fixtures/full.json";

const doc = full as unknown as StudioDocument;

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

  it("head rotation changes the transform deterministically", () => {
    const a = liveFrame(bubble, kit, loopId, 3000, {
      x: 15,
      y: -10,
      z: 5,
    }).scene;
    const b = liveFrame(bubble, kit, loopId, 3000, { x: 0, y: 0, z: 0 }).scene;
    expect(a.body.transform).not.toBe(b.body.transform);
    expect(a.body.transform).toBe(
      liveFrame(bubble, kit, loopId, 3000, { x: 15, y: -10, z: 5 }).scene.body
        .transform,
    );
  });
});

describe("ambient feeds the scene", () => {
  it("body position shifts with ambient time", () => {
    const bubble = createBubble("X");
    const s0 = restingScene(bubble, 0);
    const s1 = restingScene(bubble, 1300);
    expect(ambientAt(bubble.ambient, 1300).bodyY).not.toBe(0);
    expect(s0.body.transform).not.toBe(s1.body.transform);
  });
});
