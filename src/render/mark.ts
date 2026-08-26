// The brand mark (FR-9.8): the header logo and the favicon, drawn by the same
// renderer that draws the stage. Pure TS — no React, no DOM.
//
// It is its own character rather than `createBubble()`'s, for one measured
// reason. A favicon is rasterized to as few as 16 device pixels, and the
// default face — a 34px eye at 64px of spacing on a 512px scene — collapses
// into a single bar down there. Widening the eye and pushing the pair apart
// keeps two of them readable at tab size without changing what the mark is.
// `mark.test.ts` pins that as a ratio rather than as these numbers.
import { createBubble } from "../domain/document/create";
import { restingScene } from "./scene";
import { sceneToSvg } from "./svg";
import type { Bubble } from "../domain/document/types";

/**
 * How much bigger the mark is than the studio's default character.
 *
 * The scene is 512 units square whatever the body does, and the template's
 * 220-wide body fills 43% of it. That reads fine on a stage, where the empty
 * margin is the room a character turns and bobs in — and reads as a speck in
 * a tab strip or beside a wordmark, where the box is the whole picture. This
 * takes the silhouette to about three quarters of its box, which is what an
 * icon wants, and stops short of the edge so it never looks cropped.
 */
const MARK_SCALE = 1.7;

/** The character the mark draws. Deterministic: a fresh one every call. */
export function markBubble(): Bubble {
  const bubble = createBubble("Bubble", "bbl_mark0000");
  const { surface } = bubble.body;
  surface.width *= MARK_SCALE;
  surface.height *= MARK_SCALE;
  // Depth travels with the other two: the body is a solid (FR-2.8), and one
  // that grew only across the screen would flatten as it grew.
  surface.depth *= MARK_SCALE;
  bubble.restingFace.eye = {
    width: 46 * MARK_SCALE,
    height: 60 * MARK_SCALE,
    roundness: 1,
  };
  bubble.restingFace.spacing = 92 * MARK_SCALE;
  bubble.restingFace.left.offsetX = -8 * MARK_SCALE;
  bubble.restingFace.right.offsetX = 8 * MARK_SCALE;
  // A logo does not breathe. Ambient is a function of time, and a mark that
  // depends on the clock is a mark that cannot be a golden.
  bubble.ambient = { ...bubble.ambient, enabled: false };
  return bubble;
}

/**
 * The mark as a standalone SVG document, transparent behind the character.
 *
 * `size` is the rendered box only; the viewBox stays the scene's own space, so
 * every size is the same drawing scaled rather than a different one.
 */
export function markSvg(size: number): string {
  return sceneToSvg(restingScene(markBubble(), 0), {
    background: null,
    size,
  });
}
