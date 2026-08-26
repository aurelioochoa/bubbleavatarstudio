// Angles in degrees, folded and interpolated the way a pose needs them.
//
// Both of these were written twice before this file existed — privately in
// `LoopPlayer` for mood travel, and again in `Stage` for the drag — and the
// cursor-follow would have been a third. They are the same two functions, and
// a pose axis that wraps differently in two places is a defect waiting for the
// turn that crosses ±180.
import type { HeadPose } from "../document/types";

/** Folds an angle into the half turn either side of zero. */
export function wrapDeg(v: number): number {
  return ((((v + 180) % 360) + 360) % 360) - 180;
}

/**
 * Interpolate two angles along the shorter arc between them (FR-4.10).
 *
 * Treating a pose axis as a plain number sends a character from 170° to −170°
 * the long way — three hundred and forty degrees across the front, when the
 * two poses are twenty degrees apart across the back. The eye deltas never hit
 * this because they live inside ±30, but a body pose spans the whole turn.
 */
export function blendAngle(a: number, b: number, t: number): number {
  return wrapDeg(a + wrapDeg(b - a) * t);
}

/** The same, on all three axes of a pose. */
export function blendPose(a: HeadPose, b: HeadPose, t: number): HeadPose {
  return {
    x: blendAngle(a.x, b.x, t),
    y: blendAngle(a.y, b.y, t),
    z: blendAngle(a.z, b.z, t),
  };
}
