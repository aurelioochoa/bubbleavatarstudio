// Head projection (FR-8.2). Pure math, no DOM.
//
// The face is treated as living on the front of an ellipsoid rather than on a
// flat card, so turning the head sweeps its anchors along a curved surface,
// foreshortens them, and eventually carries them behind the silhouette. That
// curve is what reads as volume; a shear only reads as a tilted sticker.
//
// Convention: a positive yaw turns the character toward the viewer's right, so
// its right side rotates away and its left side comes into view.

/**
 * How deep a pre-v3 surface was, as a fraction of its smaller in-plane radius.
 * Depth is authored now (FR-2.2); this survives only as the value the v2 -> v3
 * migration writes, so that no saved character changes shape on upgrade.
 */
export const LEGACY_DEPTH_RATIO = 0.85;
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
  /**
   * Front-to-back size of the solid, in the same units as width and height.
   * Authored rather than derived, so a character can be a flat disc or a
   * deep barrel instead of always being as thick as its narrow axis allows.
   */
  depth: number;
  /**
   * How much of the commanded rotation the face actually takes: 0 keeps it
   * flat (a sticker the turn never reaches), 1 applies the full turn.
   *
   * It scales the *angle*, not the result. Blending the identity with the
   * rotated position — the obvious reading of "0 flat, 1 full" — is only a
   * rotation near 0; the two disagree more the further the head turns, and at
   * half a turn they point opposite ways and cancel. That collapsed the face
   * frame toward the origin instead of carrying it around the head (at the
   * default 0.6, to a fifth of its size), which is why a full-range turn
   * stacked both eyes in the middle of the skull. A scaled angle is a real
   * rotation at every setting, so nothing ever shrinks; and since a rotation
   * by `perspective * angle` matches the blend to first order, small turns
   * look as they always did.
   */
  perspective: number;
  rotation: { x: number; y: number; z: number };
}

export function projectFace({
  width,
  height,
  depth,
  perspective,
  rotation,
}: ProjectionInput): FaceProjection {
  const rx = Math.max(width, 1) / 2;
  const ry = Math.max(height, 1) / 2;
  const rz = Math.max(depth, 1) / 2;

  const yaw = rotation.y * perspective * DEG;
  const pitch = rotation.x * perspective * DEG;
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
    scaleX: apparent(rx, cosYaw, sinYaw),
    scaleY: apparent(ry, cosPitch, sinPitch),

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

      return { x: xYaw, y: yPitch, depth: zPitch };
    },
  };
}
