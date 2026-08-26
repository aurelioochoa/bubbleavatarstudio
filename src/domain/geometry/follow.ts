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

function clamp(v: number): number {
  return Math.max(-1, Math.min(1, v));
}
