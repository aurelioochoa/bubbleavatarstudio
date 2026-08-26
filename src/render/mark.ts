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
 * The mark's own proportions, stated rather than scaled off the template.
 *
 * The scene is 512 units square whatever the body does, and the template's
 * 220-wide body fills 43% of it. That margin reads right on a stage — it is
 * the room a character turns and bobs in — and reads as a speck in a tab strip
 * or beside a wordmark, where the box is the whole picture. These fill most of
 * the width and stop short of the edge, so the silhouette never looks cropped.
 *
 * Width and height are given separately because the ratio is the shape here,
 * not a side effect of it: a capsule needs a long axis to put its caps on, and
 * one scale over the template's near-square 220×200 left a straight run too
 * short to see — the mark came out a circle wearing a capsule's name.
 */
const MARK_WIDTH = 428;
const MARK_HEIGHT = 340;

/** The character the mark draws. Deterministic: a fresh one every call. */
export function markBubble(): Bubble {
  const bubble = createBubble("Bubble", "bbl_mark0000");
  const { surface } = bubble.body;
  // The capsule's straight run is what survives being shrunk: a round body
  // loses its silhouette to antialiasing at icon size and reads as a smudge,
  // where two flat sides and a hard cap still read as a shape. The caps sit on
  // the *long* axis (see `barrelPoints`), and this body is wider than it is
  // tall, so the mark is a capsule lying down.
  surface.shape = "capsule";
  surface.width = MARK_WIDTH;
  surface.height = MARK_HEIGHT;
  // Depth is the mean of the two: the body is a solid (FR-2.8), and one that
  // grew only across the screen would flatten as it grew.
  surface.depth = (MARK_WIDTH + MARK_HEIGHT) / 2;
  bubble.restingFace.eye = { width: 82, height: 107, roundness: 1 };
  bubble.restingFace.spacing = 172;
  bubble.restingFace.left.offsetX = -14;
  bubble.restingFace.right.offsetX = 14;
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
  return { x: MARK_WIDTH / SCENE_SIZE, y: MARK_HEIGHT / SCENE_SIZE };
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
