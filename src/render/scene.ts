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
import { isAnalyticSolid, solidOutline } from "../domain/geometry/solid";
import {
  projectFace,
  rotatePoint,
  turnAngles,
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
  /** Fades to 0 as the shape wraps behind the silhouette (FR-8.2). */
  opacity: number;
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
  /**
   * The contour itself, lit. A body that only gets darker toward its edge is
   * what a flat disc does; a solid lit from one side catches light again where
   * it turns away, and that last bright line is most of what says "round".
   */
  rim: string;
}

/**
 * FR-8.4: the surface the face is anchored to, drawn so the volume being posed
 * is visible. Present only when the caller asks for it — a snapshot, an export
 * and every golden leave it off, which is why they are unaffected by it.
 */
export interface GuideRender {
  /** Silhouette of the turned ellipsoid: an ellipse under the body's scale. */
  outline: { path: string; transform: string };
  /** Equator and meridian of the front hemisphere, sampled through project(). */
  arcs: string[];
}

/**
 * The character's own shadow on the ground it sits on — the cheapest volume
 * cue there is. Stage chrome, like the guide: an avatar composited into
 * someone else's page has no ground to cast onto, so nothing but the studio
 * stage asks for it and every exported byte is unaffected.
 */
export interface ShadowRender {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  opacity: number;
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
  /** Sorted back-to-front by z, then by the depth a turn gives them. */
  extras: ShapeRender[];
  eyes: { left: EyeRender; right: EyeRender };
  /**
   * The body's own silhouette, used to cut the face off at the limb.
   *
   * The eyes sit *on* the surface, so an eye that has travelled most of the way
   * round should be a sliver cut flat along the contour — which is what a solid
   * does. Fading it out instead read as a decal ghosting away. Extras are not
   * clipped: they are volumes assembled around the body, and theirs are meant
   * to stick out past it.
   */
  faceClip?: { id: string; path: string; transform: string };
  guide?: GuideRender;
  /** Drawn before the head group, so it keeps neither the roll nor the bob. */
  shadow?: ShadowRender;
}

/**
 * Stage-only additions to a frame. Both default off at every layer, which is
 * what keeps snapshots, the ZIP, the runtime and all three goldens unaffected
 * by either of them (FR-8.4).
 */
export interface SceneChrome {
  /** Draw the projection surface the face is anchored to (FR-8.4). */
  guide?: boolean;
  /** Draw the contact shadow under the character. */
  shadow?: boolean;
}

/** Live (non-persisted) inputs for one frame. */
export interface LiveInput {
  tAbsMs: number;
  mood: MoodSample;
  blink: number; // 0..1 closure
  ambient: ReturnType<typeof ambientAt>;
  headRotation: { x: number; y: number; z: number };
  /** Draw the projection guide over the character (FR-8.4). */
  guide?: boolean;
  /** Draw the contact shadow under the character. */
  shadow?: boolean;
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

/**
 * How much of a shape survives at `depth`: full in front of the equator,
 * fading out over the last sliver so nothing pops out of existence. The rim is
 * measured off the body so a small character fades over a proportionally small
 * distance.
 */
function rimFade(surface: Bubble["body"]["surface"], depth: number): number {
  const rim = Math.max(1, Math.min(surface.width, surface.height) * 0.06);
  return Math.max(0, Math.min(1, depth / rim));
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
  // Wrapping past the equator hides the eye outright. There is no ramp: the
  // silhouette clip has already cut away whatever crossed the limb, and by the
  // time the anchor itself goes behind there is nothing much left to pop.
  const opacity = anchor.depth >= 0 ? 1 : 0;
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
/** Amplitudes matching the previous 0.22-per-90° and 0.2-per-90° slopes. */
const CROWN_YAW = (2 * 0.22) / Math.PI;
const CROWN_PITCH = (2 * 0.2) / Math.PI;

function shadingFor(
  fill: string,
  head: { x: number; y: number; z: number },
  rollDeg: number,
): Shading {
  const lit = luminance(fill);
  // Pale characters need a deeper terminator, dark ones a stronger crown, or
  // the shading either blows out or disappears.
  const crown = lighten(fill, 0.34 - lit * 0.16);
  const edge = darken(fill, 0.2 + lit * 0.22);
  // The crown's travel is a rotation, not a ramp. The old linear term carried
  // the lit centre clean off the shape past ~140° of yaw (cx reached -0.02 at
  // 150°), so the body flattened into a dead silhouette at exactly the angles
  // a full turn has to survive. A sine bounds the travel and closes the loop at
  // 360°; its amplitude is chosen to match the old slope at rest, so a small
  // turn looks exactly as it did and the goldens do not move.
  const offX = -0.15 - CROWN_YAW * Math.sin(head.y * DEG);
  const offY = -0.18 - CROWN_PITCH * Math.sin(head.x * DEG);
  // The gradient is emitted inside the head group, so it inherits the roll.
  // A light that rolls with the head is not a light, it is a decal: the crown
  // swung round the body as the character tilted. Counter-rotating by the roll
  // leaves it where the room put it.
  const roll = -rollDeg * DEG;
  const cx = 0.5 + offX * Math.cos(roll) - offY * Math.sin(roll);
  const cy = 0.5 + offX * Math.sin(roll) + offY * Math.cos(roll);
  // The rim sits on the far side of the key light, which is where the gradient
  // runs out — so the last stop is the one that lands on the shadowed contour.
  const rim = lighten(fill, 0.12 + (1 - lit) * 0.14);
  const id = `bs-${hashId(`${fill}:${fmt(cx)}:${fmt(cy)}`)}`;
  return { id, cx, cy, radius: 0.78, crown, base: fill, edge, rim };
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

/**
 * The body's shading, re-expressed in an extra's own bounding box.
 *
 * A body-coloured extra used to be a flat fill sitting on a gradient body — a
 * visible patch exactly where an assembled character is supposed to stop
 * looking assembled. It cannot simply reuse the body's gradient: SVG's
 * objectBoundingBox units are relative to whatever element references them, so
 * the same definition would restart in the middle of the lobe. Instead the
 * light is located in the face frame and re-projected into the extra's box, so
 * one lit crown runs across the seam.
 *
 * Only body-coloured extras get this. An accent or custom colour is another
 * material, and lighting it with the body's own ramp would be a lie.
 */
function extraShading(
  body: Shading,
  surface: Bubble["body"]["surface"],
  e: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotationDeg: number;
  },
): Shading {
  const rx = Math.max(surface.width, 1) / 2;
  const ry = Math.max(surface.height, 1) / 2;
  // Where the crown sits in the face frame, from its position in the body box.
  const lx = rx * (2 * body.cx - 1);
  const ly = ry * (2 * body.cy - 1);

  // Into the extra's own frame: undo its translate, then its rotation.
  const rot = -e.rotationDeg * DEG;
  const dx = lx - e.x;
  const dy = ly - e.y;
  const ex = dx * Math.cos(rot) - dy * Math.sin(rot);
  const ey = dx * Math.sin(rot) + dy * Math.cos(rot);

  const ew = Math.max(e.width, 1);
  const eh = Math.max(e.height, 1);
  // A gradient radius in objectBoundingBox units is measured against the box's
  // normalised diagonal, so carrying the same physical radius across means
  // rescaling by the ratio of the two diagonals.
  const diag = (w: number, h: number): number => Math.hypot(w, h) / Math.SQRT2;
  const radius = (body.radius * diag(2 * rx, 2 * ry)) / diag(ew, eh);

  const cx = (ex + ew / 2) / ew;
  const cy = (ey + eh / 2) / eh;
  return {
    ...body,
    id: `bs-${hashId(`${body.base}:${fmt(cx)}:${fmt(cy)}:${fmt(radius)}`)}`,
    cx,
    cy,
    radius,
  };
}

/** Gap between the body's lowest point and the ground it sits on. */
const GROUND_GAP = 16;
/** Bob height at which the shadow has shrunk and faded as far as it goes. */
const LIFT_SPAN = 14;
const SHADOW_FLATNESS = 0.17;
// Black on a near-black stage has little room to work in, so the pool is
// deeper than a shadow on paper would be.
const SHADOW_OPACITY = 0.52;

/**
 * The shadow lives on the ground, not on the character: it takes the body's
 * resting position — never the ambient bob — so a breathing character rises
 * off a shadow that stays put, shrinking and fading as it goes. Its width
 * follows the silhouette's own foreshortening, so a turned head casts a
 * narrower shadow without anything extra being computed.
 */
function shadowFor(
  surface: Bubble["body"]["surface"],
  projection: FaceProjection,
  ambient: { bodyY: number; bodyScale: number },
): ShadowRender {
  const halfHeight = (Math.max(surface.height, 1) / 2) * projection.scaleY;
  // Up is negative y, so a rising character has a negative bodyY.
  const lift = Math.max(0, Math.min(1, -ambient.bodyY / LIFT_SPAN));
  const near = 1 - lift * 0.28;
  const rx =
    (Math.max(surface.width, 1) / 2) *
    projection.scaleX *
    ambient.bodyScale *
    0.86 *
    near;
  return {
    cx: surface.x,
    cy: surface.y + halfHeight + GROUND_GAP,
    rx,
    ry: rx * SHADOW_FLATNESS,
    opacity: SHADOW_OPACITY * near,
  };
}

/** How many points each guide arc is sampled at; enough to read as a curve. */
const GUIDE_SAMPLES = 24;
/** Latitude rings, evenly spaced between the poles but not including them. */
const GUIDE_PARALLELS = 5;
/** Great circles through the poles. Each spans both sides of the solid. */
const GUIDE_MERIDIANS = 6;

/**
 * A lat/long wireframe over the solid, plus a highlight tracing the
 * character's own outline.
 *
 * Two arcs used to be enough to say "the face sits on an ellipsoid". They are
 * not enough to say "this is a solid object" — that is what a mesh says, and
 * saying it is the whole job of an overlay that appears while you turn the
 * thing. The far half of every ring is drawn too: a near-hemisphere-only mesh
 * reads as a bowl, and it is seeing the lines run round the back that makes it
 * read as a sphere.
 *
 * It shares `rotatePoint` with the face anchors and the body silhouette, so
 * what it draws is literally where the surface is rather than an illustration
 * of it.
 */
function guideFor(
  surface: Bubble["body"]["surface"],
  headRotation: LiveInput["headRotation"],
  bodyScale: number,
  body: { path: string; transform: string },
): GuideRender {
  const rx = Math.max(surface.width, 1) / 2;
  const ry = Math.max(surface.height, 1) / 2;
  const rz = Math.max(surface.depth, 1) / 2;
  const turn = turnAngles(surface.perspective, headRotation);

  /** A point on the ellipsoid at latitude `u` and longitude `v`. */
  const at = (u: number, v: number): string => {
    const q = rotatePoint(
      rx * Math.cos(u) * Math.cos(v),
      ry * Math.sin(u),
      rz * Math.cos(u) * Math.sin(v),
      turn,
    );
    return `${fmt(q.x * bodyScale)} ${fmt(q.y * bodyScale)}`;
  };

  const trace = (path: (t: number) => string): string =>
    Array.from(
      { length: GUIDE_SAMPLES + 1 },
      (_, i) => `${i === 0 ? "M" : "L"} ${path(i / GUIDE_SAMPLES)}`,
    ).join(" ");

  const arcs: string[] = [];
  for (let i = 1; i <= GUIDE_PARALLELS; i++) {
    // Rings between the poles, poles excluded — a ring of radius zero is a dot.
    const u = -Math.PI / 2 + (Math.PI * i) / (GUIDE_PARALLELS + 1);
    arcs.push(trace((t) => at(u, 2 * Math.PI * t)));
  }
  for (let j = 0; j < GUIDE_MERIDIANS; j++) {
    // Half a great circle at this longitude; the other half is the meridian
    // half a turn away, so `GUIDE_MERIDIANS` of these close the cage.
    const v = (Math.PI * j) / GUIDE_MERIDIANS;
    arcs.push(trace((t) => at(-Math.PI / 2 + Math.PI * t, v)));
    arcs.push(trace((t) => at(-Math.PI / 2 + Math.PI * t, v + Math.PI)));
  }

  // The highlight is the body's own silhouette, not an ellipse around it. On a
  // lumpy character an ellipse visibly is not the thing being edited.
  return { outline: { path: body.path, transform: body.transform }, arcs };
}

export function buildScene(bubble: Bubble, live: LiveInput): Scene {
  const { surface } = bubble.body;
  const bodyY = surface.y + live.ambient.bodyY;
  const bodyRot =
    surface.rotationDeg + live.ambient.bodyRotationDeg + live.headRotation.z;
  const projection = projectFace({
    width: surface.width,
    height: surface.height,
    depth: surface.depth,
    perspective: surface.perspective,
    rotation: live.headRotation,
  });

  const moodColors = live.mood.colorOverride;
  const bodyFill = moodColors?.body ?? bubble.colors.body;

  const shapeOf = {
    shape: surface.shape,
    lobes: surface.lobes,
    wobble: surface.wobble,
    seed: surface.seed,
    width: surface.width,
    height: surface.height,
    roundness: surface.roundness,
  };
  // The round family revolved *is* the ellipsoid the projection already models,
  // and an ellipsoid's orthographic silhouette really is its outline scaled.
  // So the analytic branch is not a shortcut around the solid, it is the solid's
  // own closed form — which is why the goldens never go through the sampler.
  //
  // For every other family the turn is baked into the outline itself, and the
  // transform is left holding only the breathing swell. The contract either way
  // is that the drawn silhouette is `transform` applied to `path`.
  //
  // fmtScale, not fmt: breathing spans under a hundredth, so two decimals would
  // quantise the swell into visible steps.
  const bodyScale = live.ambient.bodyScale;
  const bodyShading = shadingFor(bodyFill, live.headRotation, bodyRot);
  const turned =
    surface.perspective !== 0 &&
    (live.headRotation.x !== 0 || live.headRotation.y !== 0);
  const bodyShape = isAnalyticSolid(surface.shape, surface.wobble)
    ? {
        path: surfacePath(shapeOf),
        transform: `scale(${fmtScale(projection.scaleX * bodyScale)} ${fmtScale(
          projection.scaleY * bodyScale,
        )})`,
      }
    : {
        path: solidOutline({
          ...shapeOf,
          depth: surface.depth,
          rotation: live.headRotation,
          perspective: surface.perspective,
        }),
        transform: `scale(${fmtScale(bodyScale)} ${fmtScale(bodyScale)})`,
      };

  // Extras are anchored on the same ellipsoid the eyes are, so a turn carries
  // them around it, foreshortens them locally and eventually takes them behind
  // the silhouette. Drawn from their authored x/y alone they slid across a
  // turning head like decals stuck to the lens.
  const rest = projectFace({
    width: surface.width,
    height: surface.height,
    depth: surface.depth,
    perspective: surface.perspective,
    rotation: { x: 0, y: 0, z: 0 },
  });
  const extras: ShapeRender[] = [...bubble.body.extras]
    .sort((a, b) => a.z - b.z)
    .map((e) => {
      const anchor = projection.project(e.x, e.y);
      const local = surfaceScale(projection, e.x, e.y);
      return {
        // How far the turn has carried this anchor toward or away from the
        // viewer. Authored z stays the order at rest — it is a control the
        // user sets — and only the travel a rotation induces reorders them,
        // which is zero for every extra while the head faces front.
        travel: anchor.depth - rest.project(e.x, e.y).depth,
        render: {
          path: extraPath(e.kind, e.width * local.x, e.height * local.y),
          fill:
            e.colorRole === "body"
              ? bodyFill
              : e.colorRole === "accent"
                ? bubble.colors.accent
                : e.color,
          transform: `translate(${fmt(anchor.x)} ${fmt(anchor.y)}) rotate(${fmt(e.rotationDeg)})`,
          opacity: rimFade(surface, anchor.depth),
          ...(e.colorRole === "body"
            ? {
                shading: extraShading(bodyShading, surface, {
                  x: e.x,
                  y: e.y,
                  width: e.width * local.x,
                  height: e.height * local.y,
                  rotationDeg: e.rotationDeg,
                }),
              }
            : {}),
        },
      };
    })
    .sort((a, b) => a.travel - b.travel)
    .map((x) => x.render);

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
      ...bodyShape,
      fill: bodyFill,
      opacity: 1,
      shading: bodyShading,
    },
    extras,
    eyes: { left, right },
    // Only when there is a limb to cut against. A clip repeats the whole body
    // path, which is already most of a render's bytes, and at rest it can never
    // remove anything: the face frame is unturned, so no anchor has crossed the
    // contour. Snapshots, the ZIP, the runtime and the mood thumbnails all draw
    // an unturned character, so none of them pay for this.
    ...(turned
      ? {
          faceClip: {
            id: `bc-${hashId(`${bodyShape.path}:${bodyShape.transform}`)}`,
            path: bodyShape.path,
            transform: bodyShape.transform,
          },
        }
      : {}),
    ...(live.guide
      ? {
          guide: guideFor(
            surface,
            live.headRotation,
            live.ambient.bodyScale,
            bodyShape,
          ),
        }
      : {}),
    ...(live.shadow
      ? { shadow: shadowFor(surface, projection, live.ambient) }
      : {}),
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
  chrome: SceneChrome = {},
): { scene: Scene; player: ReturnType<LoopPlayer["advance"]> | null } {
  const loop = kit.loops.find((l) => l.id === loopId);
  if (!loop) {
    return {
      scene: restingScene(bubble, tAbsMs, headRotation, chrome),
      player: null,
    };
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
    ...chrome,
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
  chrome: SceneChrome = {},
): Scene {
  return buildScene(bubble, {
    tAbsMs,
    mood,
    blink: blinkAt(RESTING_BLINK, bubble.id, tAbsMs),
    ambient: ambientAt(bubble.ambient, tAbsMs),
    headRotation,
    ...chrome,
  });
}

/** Resting scene: neutral pose, ambient only (used for thumbnails/snapshots). */
export function restingScene(
  bubble: Bubble,
  tAbsMs = 0,
  headRotation: LiveInput["headRotation"] = { x: 0, y: 0, z: 0 },
  chrome: SceneChrome = {},
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
    ...chrome,
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
