// Scene composition: document + live state → renderable Scene (docs/04).
// Pure: no DOM, no React. The same scene feeds studio stage, snapshots, runtime.
import {
  blobPath,
  capsulePath,
  circlePath,
  ringPath,
  fmt,
} from "../domain/geometry/primitives";
import { projectFace, type FaceProjection } from "../domain/geometry/projection";
import { ambientAt, blinkAt } from "../domain/playback/ambient";
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
    (projection.project(px + step, py).x - projection.project(px - step, py).x) /
    (2 * step);
  const dy =
    (projection.project(px, py + step).y - projection.project(px, py - step).y) /
    (2 * step);
  return { x: Math.abs(dx), y: Math.abs(dy) };
}

function eyeRender(
  bubble: Bubble,
  side: "left" | "right",
  moodEye: MoodEye,
  ambientEyeY: number,
  blink: number,
  projection: FaceProjection,
): EyeRender {
  const face = bubble.restingFace;
  const place = face[side];
  const dir = side === "left" ? -1 : 1;
  const flatX = dir * (face.spacing / 2) + place.offsetX + moodEye.offsetX;
  const flatY = place.offsetY + moodEye.offsetY + ambientEyeY;
  const anchor = projection.project(flatX, flatY);
  const surface = surfaceScale(projection, flatX, flatY);
  // Wrapping past the equator hides the eye; the last stretch fades so it does
  // not pop out of existence.
  const rim = Math.max(1, Math.min(bubble.body.surface.width, bubble.body.surface.height) * 0.06);
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
      live.ambient.eyeY,
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
      live.ambient.eyeY,
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
      path: blobPath({
        width: surface.width,
        height: surface.height,
        roundness: surface.roundness,
      }),
      fill: bodyFill,
      // Turning the head foreshortens the silhouette rather than shearing it.
      transform: `scale(${fmt(projection.scaleX)} ${fmt(projection.scaleY)})`,
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
    blink: 0,
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
