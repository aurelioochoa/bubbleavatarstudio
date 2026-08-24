// Head projection (FR-8.2). Pure math, no DOM.
//
// The face is treated as living on the front of an ellipsoid rather than on a
// flat card, so turning the head sweeps its anchors along a curved surface,
// foreshortens them, and eventually carries them behind the silhouette. That
// curve is what reads as volume; a shear only reads as a tilted sticker.
//
// Convention: a positive yaw turns the character toward the viewer's right, so
// its right side rotates away and its left side comes into view.

/** Depth radius as a fraction of the smaller in-plane radius. */
const DEPTH_RATIO = 0.85;
const DEG = Math.PI / 180;

export interface FaceProjection {
  /** Silhouette foreshortening, 1 when facing the viewer. */
  scaleX: number;
  scaleY: number;
  /**
   * Maps a face-frame anchor to where it lands after the head turns.
   * `depth` is positive in front of the surface's equator and negative once
   * the anchor has rotated behind it.
   */
  project(px: number, py: number): { x: number; y: number; depth: number };
}

export interface ProjectionInput {
  width: number;
  height: number;
  /** 0 keeps the face flat, 1 applies the full turn. */
  perspective: number;
  rotation: { x: number; y: number; z: number };
}

const lerp = (from: number, to: number, t: number): number =>
  from + (to - from) * t;

export function projectFace({
  width,
  height,
  perspective,
  rotation,
}: ProjectionInput): FaceProjection {
  const rx = Math.max(width, 1) / 2;
  const ry = Math.max(height, 1) / 2;
  const rz = Math.min(rx, ry) * DEPTH_RATIO;

  const yaw = rotation.y * DEG;
  const pitch = rotation.x * DEG;
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);

  // Apparent half-extent of the ellipsoid once turned: the silhouette of an
  // ellipsoid stays an ellipse, and its radius blends the in-plane radius with
  // the (shorter) depth radius as the turn approaches 90°.
  const apparent = (inPlane: number, cos: number, sin: number): number =>
    Math.hypot(inPlane * cos, rz * sin) / inPlane;

  return {
    scaleX: lerp(1, apparent(rx, cosYaw, sinYaw), perspective),
    scaleY: lerp(1, apparent(ry, cosPitch, sinPitch), perspective),

    project(px, py) {
      // Height of the front hemisphere above the anchor; anchors outside the
      // surface flatten to its rim rather than going imaginary.
      const u = px / rx;
      const v = py / ry;
      const z0 = rz * Math.sqrt(Math.max(0, 1 - u * u - v * v));

      // Yaw about the vertical axis, then pitch about the horizontal one.
      const xYaw = px * cosYaw + z0 * sinYaw;
      const zYaw = z0 * cosYaw - px * sinYaw;
      const yPitch = py * cosPitch - zYaw * sinPitch;
      const zPitch = py * sinPitch + zYaw * cosPitch;

      return {
        x: lerp(px, xYaw, perspective),
        y: lerp(py, yPitch, perspective),
        depth: lerp(z0, zPitch, perspective),
      };
    },
  };
}
