// FR-9.8 brand mark: the studio's own character, drawn by the studio's own
// renderer, serving as both the header logo and the favicon. The point of the
// tests below is that the committed `public/favicon.svg` cannot drift from the
// code that produces it, and that the mark stays legible at tab size.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { markBubble, markSvg } from "./mark";
import { restingScene } from "./scene";
import { sceneToSvg } from "./svg";

describe("the mark is what the renderer draws", () => {
  it("is the resting character, not a hand-drawn lookalike", () => {
    expect(markSvg(64)).toBe(
      sceneToSvg(restingScene(markBubble(), 0), { background: null, size: 64 }),
    );
  });

  it("is byte-stable, like every other render this repo ships", () => {
    expect(markSvg(64)).toBe(markSvg(64));
  });

  it("scales without redrawing: only the box changes, never the viewBox", () => {
    const small = markSvg(32);
    const large = markSvg(180);
    expect(small).toContain('width="32" height="32"');
    expect(large).toContain('width="180" height="180"');
    // Same drawing at both sizes: strip the box attributes and they match.
    const strip = (s: string) => s.replace(/width="\d+" height="\d+"/, "");
    expect(strip(small)).toBe(strip(large));
  });
});

/** One device pixel at a 16px raster, as a fraction of the viewBox. */
const PX_16 = 1 / 16;

describe("the mark reads at 16px", () => {
  // A favicon is rasterized to as few as 16 device pixels. The default
  // character's eyes are tuned for a 512px stage and merge into one bar down
  // there, which is the whole reason the mark is its own character.
  const scene = restingScene(markBubble(), 0);
  const { left, right } = scene.eyes;

  it("keeps a gap between the eyes wide enough to survive a 16px raster", () => {
    // `x` is the eye's centre — svg.ts draws each rect at -w/2 inside a group
    // translated there — so the inner edges are half a width in from each.
    const gap = right.x - right.width / 2 - (left.x + left.width / 2);
    // Measured at 16px: the default face leaves 8.2% of the viewBox between
    // the eyes, which is 1.3 device pixels and rasterizes to one bar. This
    // asks for 1.75, which the default cannot reach and the mark clears.
    expect(gap / scene.size).toBeGreaterThan(PX_16 * 1.75);
  });

  it("draws eyes big enough to be more than a pixel each", () => {
    // Same reasoning: the default eye is 1.06 device pixels wide at 16px.
    for (const eye of [left, right]) {
      expect(eye.width / scene.size).toBeGreaterThan(PX_16 * 1.25);
      expect(eye.height / scene.size).toBeGreaterThan(PX_16 * 1.25);
    }
  });

  it("fills its box, so the glyph is not a dot in a field of nothing", () => {
    // The scene is 512 wide whatever the character does, and the default
    // template's 220 fills 43% of it — legible on a stage, a speck in a tab
    // strip or beside a wordmark. An icon wants most of its own box.
    const width = markBubble().body.surface.width;
    expect(width / scene.size).toBeGreaterThan(0.65);
    // Not so far that the silhouette touches the edge and looks cropped.
    expect(width / scene.size).toBeLessThan(0.85);
  });

  it("keeps the face in proportion as the body grows", () => {
    // Scaling the body alone would leave two pinpricks on a large head.
    const bubble = markBubble();
    const eye = bubble.restingFace.eye.width;
    expect(eye / bubble.body.surface.width).toBeGreaterThan(0.15);
  });

  it("sits the character upright and centred, so no crop is needed", () => {
    expect(scene.head.transform).toContain("rotate(0)");
    expect(left.x).toBeCloseTo(-right.x, 5);
    expect(left.y).toBeCloseTo(right.y, 5);
  });
});

describe("the artifacts on disk agree with the code", () => {
  it("public/favicon.svg is exactly what markSvg(64) returns", async () => {
    // A golden like the three in goldens/, and updated the same way
    // (`pnpm vitest -u`). Never hand-edit the file: it ships to the browser
    // and the header logo reads from the same function.
    await expect(markSvg(64)).toMatchFileSnapshot("../../public/favicon.svg");
  });

  it("index.html actually links it — a missing link is a blank tab icon", () => {
    const html = readFileSync("index.html", "utf8");
    expect(html).toContain('rel="icon"');
    expect(html).toContain("/favicon.svg");
  });
});
