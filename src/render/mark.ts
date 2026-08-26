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
import { restingScene, SCENE_SIZE } from "./scene";
import { sceneToSvg } from "./svg";
import type { Bubble } from "../domain/document/types";

/**
 * The mark's own size, stated rather than scaled off the template.
 *
 * The scene is 512 units square whatever the body does, and the template's
 * 220-wide body fills 43% of it. That margin reads right on a stage — it is
 * the room a character turns and bobs in — and reads as a speck in a tab strip
 * or beside a wordmark, where the box is the whole picture. This fills most of
 * the box and stops short of the edge, so the silhouette never looks cropped.
 *
 * One number, not two: the mark is round, and round is a circle rather than a
 * squashed one. Giving width and height separately is what made an earlier
 * mark an oval — 428×340 is a perfectly good body and reads as an ellipse at
 * icon size, whatever family draws it.
 */
const MARK_SIZE = 440;

/** The character the mark draws. Deterministic: a fresh one every call. */
export function markBubble(): Bubble {
  const bubble = createBubble("Bubble", "bbl_mark0000");
  const { surface } = bubble.body;
  surface.shape = "round";
  surface.width = MARK_SIZE;
  surface.height = MARK_SIZE;
  // Depth matches: the body is a solid (FR-2.8), and one that grew only across
  // the screen would flatten as it grew.
  surface.depth = MARK_SIZE;
  // Equal sides are half of being round. The other half is here: `roundness`
  // is the superellipse exponent, and only at 1 does it reach an actual
  // ellipse — the template's 0.96 draws the same square body as a rounded
  // square, which is a different mark entirely.
  surface.roundness = 1;
  // Every face number is a fraction of the body, so growing the mark grows the
  // face with it. Held apart as constants, a bigger body would quietly leave a
  // smaller-looking face — which is the same class of bug as an oval drawn by
  // a round family: nothing is wrong with any one number.
  bubble.restingFace.eye = {
    width: MARK_SIZE * 0.205,
    height: MARK_SIZE * 0.2675,
    roundness: 1,
  };
  // 0.32 of the body puts each eye's centre 0.195 of it out from the middle
  // (spacing/2 plus the nudge below), leaving them closer together than they
  // are themselves wide — which is what reads as a face rather than as two
  // marks sharing a body. It stays well clear of the 16px floor
  // `mark.test.ts` holds the pair above.
  bubble.restingFace.spacing = MARK_SIZE * 0.32;
  bubble.restingFace.left.offsetX = -MARK_SIZE * 0.035;
  bubble.restingFace.right.offsetX = MARK_SIZE * 0.035;
  // A logo does not breathe. Ambient is a function of time, and a mark that
  // depends on the clock is a mark that cannot be a golden.
  bubble.ambient = { ...bubble.ambient, enabled: false };
  return bubble;
}

/**
 * How much of the mark's square box the silhouette actually inks, per axis.
 *
 * The scene is square and the capsule is not, so a box tall enough to hold the
 * drawing is taller than the drawing — transparent padding that still occupies
 * layout. A caller that must not grow (the header is a row the stage pays for)
 * uses these to size the hole it leaves rather than guessing at the geometry.
 */
export function markInkRatio(): { x: number; y: number } {
  return { x: MARK_SIZE / SCENE_SIZE, y: MARK_SIZE / SCENE_SIZE };
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
