// FR-8.6: aiming a head at the cursor, as arithmetic.
//
// Pure on purpose, and split in two. `followTarget` says where the character
// should be looking; `approachPose` says where it is this frame on the way
// there. Neither knows about pointers, elements or frames — the stage feeds
// one a cursor offset it measured and calls the other from the engine's loop,
// which is what keeps React out of the per-frame path (FR-11.2).
import { blendAngle } from "./angles";
import type { HeadPose } from "../document/types";

export interface FollowInput {
  /** Cursor offset from the centre of the stage, in screen px. */
  dx: number;
  dy: number;
  /**
   * The offset at which the turn reaches its limit. Beyond this the character
   * is already looking as far as it will go, so a cursor on a second monitor
   * reads the same as one at the edge of the window.
   */
  reach: number;
  /** How far the head may turn, per axis, in degrees. */
  limits: { yaw: number; pitch: number };
}

export interface GazeInput {
  /** Cursor offset from the centre of the stage, in screen px. */
  dx: number;
  dy: number;
  /** The offset at which the eyes are already as far across as they go. */
  reach: number;
  /** How far the eyes may slide, per axis, in face-frame units. */
  range: { x: number; y: number };
}

/** How far to turn, given where the cursor is. `x` is pitch, `y` is yaw. */
export function followTarget({ dx, dy, reach, limits }: FollowInput): {
  x: number;
  y: number;
} {
  // A zero reach would divide the character's gaze by nothing. It means every
  // offset is already at the limit, so treat the ratio as saturated rather
  // than letting an Infinity through into a transform.
  const ratio = (d: number) => (reach <= 0 ? Math.sign(d) : clamp(d / reach));
  return {
    // Screen y runs downward and a positive pitch lifts the face, so the pitch
    // takes the offset with its sign flipped — the same convention the drag
    // follows in `Stage.onPointerMove`, and the reason the two agree.
    //
    // `+ 0` normalises the negative zero that flipping the sign produces at
    // the centre. It is the same angle, and it serialises as "-0" into a
    // transform this repo holds byte-stable.
    x: -ratio(dy) * limits.pitch + 0,
    y: ratio(dx) * limits.yaw + 0,
  };
}

/**
 * Where the eyes sit, given where the cursor is: the same saturating ratio the
 * turn uses, spent on an offset in the face frame instead of on an angle.
 *
 * Separate from the turn because the two carry the cue at different scales — a
 * head turn says roughly which way, the eyes say exactly what at. Composed on
 * the stage they read as one act of looking, which is what makes it obvious
 * the character is watching the pointer rather than merely leaning about.
 *
 * Neither axis flips: face-frame x runs right and y runs down, the same as the
 * screen. The pitch flips because a positive pitch lifts a face; an eye offset
 * has no such convention to fight.
 */
export function followGaze({ dx, dy, reach, range }: GazeInput): {
  x: number;
  y: number;
} {
  const ratio = (d: number) =>
    reach <= 0 ? Math.sign(d) || 0 : clamp(d / reach);
  return { x: ratio(dx) * range.x + 0, y: ratio(dy) * range.y + 0 };
}

/**
 * One frame of travel toward the aim: a fraction of the remaining angle, per
 * axis, along the shorter arc.
 *
 * Proportional rather than a fixed step, which is what gives the ease-out —
 * fast while the character has a long way to turn, settling as it arrives —
 * and what stops it overshooting and hunting around the target.
 *
 * The roll is passed through untouched. Follow turns a head toward something;
 * tilting it is the gizmo's business, and a follow that quietly straightened
 * an authored tilt would be taking away an edit nobody asked it to touch.
 */
export function approachPose(
  current: HeadPose,
  target: { x: number; y: number },
  factor: number,
): HeadPose {
  return {
    x: blendAngle(current.x, target.x, factor),
    y: blendAngle(current.y, target.y, factor),
    z: current.z,
  };
}

/**
 * One frame of the eyes' travel toward the gaze: the same proportional ease as
 * the pose, on two plain numbers.
 *
 * Plain lerp rather than `blendAngle`, because these are offsets and not
 * angles — there is no shorter arc to take, and wrapping one at ±180 would
 * teleport an eye across the face.
 */
export function approachGaze(
  current: { x: number; y: number },
  target: { x: number; y: number },
  factor: number,
): { x: number; y: number } {
  return {
    x: current.x + (target.x - current.x) * factor,
    y: current.y + (target.y - current.y) * factor,
  };
}

function clamp(v: number): number {
  return Math.max(-1, Math.min(1, v));
}
