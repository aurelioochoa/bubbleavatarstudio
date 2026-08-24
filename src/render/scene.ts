// Scene composition: document + live state → renderable Scene (docs/04).
// Pure: no DOM, no React. The same scene feeds studio stage, snapshots, runtime.
import {
  blobPath,
  capsulePath,
  circlePath,
  ringPath,
  fmt,
  fmtScale,
} from "../domain/geometry/primitives";
import { surfacePath } from "../domain/geometry/shapes";
import {
  projectFace,
  type FaceProjection,
} from "../domain/geometry/projection";
import { ambientAt, blinkAt, RESTING_BLINK } from "../domain/playback/ambient";
import { darken, lighten, luminance } from "./color";
import { LoopPlayer, type MoodSample } from "../domain/playback/LoopPlayer";
import type {
  Bubble,
  ExtraPrimitive,
  Kit,
  MoodEye,
} from "../domain/document/types";

export interface EyeRender {
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDeg: number;
  /** Corner rounding, 0 = rectangle, 1 = capsule (FR-3.1). */
  roundness: number;
  /** Fades to 0 as the anchor wraps behind the silhouette (FR-8.2). */
  opacity: number;
  /** Vertical squash incl. mood scale and blink closure (0..1). */
  scaleY: number;
  scaleX: number;
  fill: string;
}

export interface ShapeRender {
  path: string;
  fill: string;
  transform: string;
  /** Volume shading; null renders as a flat fill. */
  shading?: Shading | null;
}

/**
 * Radial shading that makes the silhouette read as a volume: a lit crown, the
 * base colour through the middle, and a darker terminator at the rim. Positions
 * are fractions of the shape's bounding box.
 */
export interface Shading {
  id: string;
  cx: number;
  cy: number;
  radius: number;
  crown: string;
  base: string;
  edge: string;
}

export interface Scene {
  /** Square viewBox side. */
  size: number;
  /**
   * Position and roll of the head. Everything else in the scene is expressed
   * in the face frame and inherits this, so the eyes and extras travel with
   * the body instead of floating over it.
   */
  head: { transform: string };
  body: ShapeRender;
  /** Sorted back-to-front by z. */
  extras: ShapeRender[];
  eyes: { left: EyeRender; right: EyeRender };
}

/** Live (non-persisted) inputs for one frame. */
export interface LiveInput {
  tAbsMs: number;
  mood: MoodSample;
  blink: number; // 0..1 closure
  ambient: ReturnType<typeof ambientAt>;
  headRotation: { x: number; y: number; z: number };
}

export const SCENE_SIZE = 512;

function extraPath(kind: ExtraPrimitive["kind"], w: number, h: number): string {
  switch (kind) {
    case "blob":
      return blobPath({ width: w, height: h, roundness: 0.9 });
    case "capsule":
      return capsulePath(w, h);
    case "circle":
      return circlePath(w);
    case "ring":
      return ringPath(w, Math.min(w, h) * 0.2);
  }
}

const DEG = Math.PI / 180;

/**
 * An eye turned away from the viewer foreshortens along the axis it turns
 * about (FR-4.1). |cos| keeps opposite angles symmetric and never inverts the
 * shape, the same flattening idea the body applies via skew for head rotation.
 */
function foreshorten(deg: number): number {
  return Math.abs(Math.cos(deg * DEG));
}

/** Local foreshortening at an anchor, measured from the projection itself. */
function surfaceScale(
  projection: FaceProjection,
  px: number,
  py: number,
): { x: number; y: number } {
  const step = 1;
  const dx =
    (projection.project(px + step, py).x -
      projection.project(px - step, py).x) /
    (2 * step);
  const dy =
    (projection.project(px, py + step).y -
      projection.project(px, py - step).y) /
    (2 * step);
  return { x: Math.abs(dx), y: Math.abs(dy) };
}

function eyeRender(
  bubble: Bubble,
  side: "left" | "right",
  moodEye: MoodEye,
  ambientEye: { x: number; y: number },
  blink: number,
  projection: FaceProjection,
): EyeRender {
  const face = bubble.restingFace;
  const place = face[side];
  const dir = side === "left" ? -1 : 1;
  const flatX =
    dir * (face.spacing / 2) + place.offsetX + moodEye.offsetX + ambientEye.x;
  const flatY = place.offsetY + moodEye.offsetY + ambientEye.y;
  const anchor = projection.project(flatX, flatY);
  const surface = surfaceScale(projection, flatX, flatY);
  // Wrapping past the equator hides the eye; the last stretch fades so it does
  // not pop out of existence.
  const rim = Math.max(
    1,
    Math.min(bubble.body.surface.width, bubble.body.surface.height) * 0.06,
  );
  const opacity = Math.max(0, Math.min(1, anchor.depth / rim));
  const x = anchor.x;
  const y = anchor.y;
  return {
    x,
    y,
    opacity,
    width:
      face.eye.width *
      place.scaleX *
      moodEye.scaleX *
      foreshorten(moodEye.rotationYDeg) *
      surface.x,
    height:
      face.eye.height *
      place.scaleY *
      moodEye.scaleY *
      (1 - blink) *
      foreshorten(moodEye.rotationXDeg) *
      surface.y,
    rotationDeg: place.rotationDeg + moodEye.rotationZDeg,
    roundness: face.eye.roundness,
    scaleX: place.scaleX * moodEye.scaleX,
    scaleY: place.scaleY * moodEye.scaleY * (1 - blink),
    fill: bubble.colors.eyes,
  };
}

/**
 * Light sits up and to the left of the viewer and stays put as the character
 * turns, so the lit crown slides across the surface — that travel is most of
 * what sells the volume.
 */
function shadingFor(
  fill: string,
  head: { x: number; y: number; z: number },
): Shading {
  const lit = luminance(fill);
  // Pale characters need a deeper terminator, dark ones a stronger crown, or
  // the shading either blows out or disappears.
  const crown = lighten(fill, 0.34 - lit * 0.16);
  const edge = darken(fill, 0.2 + lit * 0.22);
  const cx = 0.5 - 0.15 - (head.y / 90) * 0.22;
  const cy = 0.5 - 0.18 - (head.x / 90) * 0.2;
  const id = `bs-${hashId(`${fill}:${fmt(cx)}:${fmt(cy)}`)}`;
  return { id, cx, cy, radius: 0.78, crown, base: fill, edge };
}

/** Short stable id so two avatars on one page never share a gradient. */
function hashId(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function buildScene(bubble: Bubble, live: LiveInput): Scene {
  const { surface } = bubble.body;
  const bodyY = surface.y + live.ambient.bodyY;
  const bodyRot =
    surface.rotationDeg + live.ambient.bodyRotationDeg + live.headRotation.z;
  const projection = projectFace({
    width: surface.width,
    height: surface.height,
    perspective: surface.perspective,
    rotation: live.headRotation,
  });

  const moodColors = live.mood.colorOverride;
  const bodyFill = moodColors?.body ?? bubble.colors.body;

  const extras: ShapeRender[] = [...bubble.body.extras]
    .sort((a, b) => a.z - b.z)
    .map((e) => ({
      path: extraPath(e.kind, e.width, e.height),
      fill:
        e.colorRole === "body"
          ? bodyFill
          : e.colorRole === "accent"
            ? bubble.colors.accent
            : e.color,
      transform: `translate(${fmt(e.x)} ${fmt(e.y)}) rotate(${fmt(e.rotationDeg)})`,
    }));

  const eyeFill = moodColors?.eyes ?? bubble.colors.eyes;
  const left = {
    ...eyeRender(
      bubble,
      "left",
      live.mood.left,
      { x: live.ambient.eyeX, y: live.ambient.eyeY },
      live.blink,
      projection,
    ),
    fill: eyeFill,
  };
  const right = {
    ...eyeRender(
      bubble,
      "right",
      live.mood.right,
      { x: live.ambient.eyeX, y: live.ambient.eyeY },
      live.blink,
      projection,
    ),
    fill: eyeFill,
  };

  return {
    size: SCENE_SIZE,
    head: {
      transform: `translate(${fmt(surface.x)} ${fmt(bodyY)}) rotate(${fmt(bodyRot)})`,
    },
    body: {
      path: surfacePath({
        shape: surface.shape,
        lobes: surface.lobes,
        wobble: surface.wobble,
        seed: surface.seed,
        width: surface.width,
        height: surface.height,
        roundness: surface.roundness,
      }),
      fill: bodyFill,
      shading: shadingFor(bodyFill, live.headRotation),
      // Turning the head foreshortens the silhouette; breathing swells it.
      // fmtScale, not fmt: breathing spans under a hundredth, so two decimals
      // would quantise the swell into visible steps.
      transform: `scale(${fmtScale(
        projection.scaleX * live.ambient.bodyScale,
      )} ${fmtScale(projection.scaleY * live.ambient.bodyScale)})`,
    },
    extras,
    eyes: { left, right },
  };
}

/**
 * Convenience: evaluate a fully live frame for a playing loop. A loop id the
 * kit does not know — a bubble switched to a different kit lineage, say —
 * falls back to the resting face rather than throwing, so playback stops
 * cleanly instead of tearing down the frame loop (FR-6.4).
 */
export function liveFrame(
  bubble: Bubble,
  kit: Kit,
  loopId: string,
  tAbsMs: number,
  headRotation: LiveInput["headRotation"],
): { scene: Scene; player: ReturnType<LoopPlayer["advance"]> | null } {
  const loop = kit.loops.find((l) => l.id === loopId);
  if (!loop) {
    return { scene: restingScene(bubble, tAbsMs, headRotation), player: null };
  }
  const player = new LoopPlayer(loop, kit);
  const st = player.advance(tAbsMs);
  const ambient = ambientAt(bubble.ambient, tAbsMs);
  const blink = blinkAt(loop.blink, loop.id, tAbsMs);
  const live: LiveInput = {
    tAbsMs,
    mood: st.sample,
    blink,
    ambient,
    headRotation,
  };
  return { scene: buildScene(bubble, live), player: st };
}

/**
 * A single mood held still (FR-4.4). Used to preview a mood on the stage and
 * to draw mood thumbnails, so both show exactly what playback would show.
 */
export function moodScene(
  bubble: Bubble,
  mood: MoodSample,
  tAbsMs = 0,
  headRotation: LiveInput["headRotation"] = { x: 0, y: 0, z: 0 },
): Scene {
  return buildScene(bubble, {
    tAbsMs,
    mood,
    blink: blinkAt(RESTING_BLINK, bubble.id, tAbsMs),
    ambient: ambientAt(bubble.ambient, tAbsMs),
    headRotation,
  });
}

/** Resting scene: neutral pose, ambient only (used for thumbnails/snapshots). */
export function restingScene(
  bubble: Bubble,
  tAbsMs = 0,
  headRotation: LiveInput["headRotation"] = { x: 0, y: 0, z: 0 },
): Scene {
  const mood: MoodSample = {
    left: zeroEye(),
    right: zeroEye(),
    colorOverride: null,
  };
  const ambient = ambientAt(bubble.ambient, tAbsMs);
  return buildScene(bubble, {
    tAbsMs,
    mood,
    // A resting character still blinks (FR-5.5 covers loops; this is idle).
    blink: blinkAt(RESTING_BLINK, bubble.id, tAbsMs),
    ambient,
    headRotation,
  });
}

function zeroEye(): MoodEye {
  return {
    rotationXDeg: 0,
    rotationYDeg: 0,
    rotationZDeg: 0,
    scaleX: 1,
    scaleY: 1,
    offsetX: 0,
    offsetY: 0,
  };
}
