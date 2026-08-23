// Scene composition: document + live state → renderable Scene (docs/04).
// Pure: no DOM, no React. The same scene feeds studio stage, snapshots, runtime.
import {
  blobPath,
  capsulePath,
  circlePath,
  ringPath,
  fmt,
} from "../domain/geometry/primitives";
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

function eyeRender(
  bubble: Bubble,
  side: "left" | "right",
  moodEye: MoodEye,
  ambientEyeY: number,
  blink: number,
): EyeRender {
  const face = bubble.restingFace;
  const place = face[side];
  const dir = side === "left" ? -1 : 1;
  const x = dir * (face.spacing / 2) + place.offsetX + moodEye.offsetX;
  const y = place.offsetY + moodEye.offsetY + ambientEyeY;
  return {
    x,
    y,
    width: face.eye.width * place.scaleX * moodEye.scaleX,
    height: face.eye.height * place.scaleY * moodEye.scaleY * (1 - blink),
    rotationDeg: place.rotationDeg + moodEye.rotationZDeg,
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
  // Perspective + head pitch/yaw approximated with skews on the group.
  const skewX =
    Math.tan((live.headRotation.y * surface.perspective * Math.PI) / 180) * 10;
  const skewY =
    Math.tan((live.headRotation.x * surface.perspective * Math.PI) / 180) * 10;

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
    ...eyeRender(bubble, "left", live.mood.left, live.ambient.eyeY, live.blink),
    fill: eyeFill,
  };
  const right = {
    ...eyeRender(
      bubble,
      "right",
      live.mood.right,
      live.ambient.eyeY,
      live.blink,
    ),
    fill: eyeFill,
  };

  return {
    size: SCENE_SIZE,
    body: {
      path: blobPath({
        width: surface.width,
        height: surface.height,
        roundness: surface.roundness,
      }),
      fill: bodyFill,
      transform: `translate(${fmt(surface.x)} ${fmt(bodyY)}) rotate(${fmt(bodyRot)}) skewX(${fmt(skewX)}) skewY(${fmt(skewY)})`,
    },
    extras,
    eyes: { left, right },
  };
}

/** Convenience: evaluate a fully live frame for a playing loop. */
export function liveFrame(
  bubble: Bubble,
  kit: Kit,
  loopId: string,
  tAbsMs: number,
  headRotation: LiveInput["headRotation"],
): { scene: Scene; player: ReturnType<LoopPlayer["advance"]> } {
  const loop = kit.loops.find((l) => l.id === loopId);
  if (!loop) throw new Error(`unknown loop ${loopId}`);
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
export function restingScene(bubble: Bubble, tAbsMs = 0): Scene {
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
    headRotation: { x: 0, y: 0, z: 0 },
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
