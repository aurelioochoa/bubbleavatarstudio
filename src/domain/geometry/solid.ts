// Solid geometry (FR-2.6, FR-8.2). Pure math, no DOM.
//
// `shapes.ts` describes a character as a flat outline. That outline never
// turned: the renderer computed it once and applied a uniform scale, so a
// lumpy character kept the same lumps in the same screen positions however far
// the head rotated — the strongest "flat sticker" tell there was.
//
// Here the outline becomes the generatrix of a solid. The solid is revolved
// about the vertical axis, rotated by the real head rotation, projected
// orthographically, and its silhouette read back off as a radius per screen
// angle. At rest the silhouette is the outline it came from; turned, the lumps
// travel.
//
// Two facts worth knowing before changing anything here:
//
//  1. A surface of revolution about the vertical axis has, under *pure yaw*, a
//     silhouette that is exactly its flat outline scaled in x by
//     `hypot(cos yaw, kappa * sin yaw)`. Revolving p = (px, py) gives
//     (px cos psi, py, px kappa sin psi); after yaw the x extent maximises over
//     psi at px * hypot(cos yaw, kappa sin yaw), and y never moves. So for the
//     six families that *are* solids of revolution, a yaw-only turn genuinely
//     produces nothing the old uniform scale did not. Their payload is pitch
//     and combined poses.
//  2. `organic` is the one family that is not a solid of revolution, and it is
//     only not one because `shapes.ts` keys its wobble on the polar angle. A
//     wobble keyed on the sampling parameter would be constant around every
//     revolved ring, fact 1 would apply, and the lumps would never travel.
import {
  surfacePoints,
  wobbleAt,
  WOBBLE_REACH,
  type ShapeFamily,
  type SurfaceShapeOptions,
} from "./shapes";
import { smoothClosedPath, type Point } from "./primitives";

const DEG = Math.PI / 180;

/**
 * How finely the flat outline is resampled before it is revolved. This is not
 * the same as the 48 knots that come back out: revolving only ever sweeps a
 * point *toward* the vertical, so a tapered family like `cone` leaves whole
 * angular gaps near the horizontal if it is revolved at authoring density.
 * Sampling the outline densely fills them from the edges between its corners.
 */
const PROFILE_SAMPLES = 192;
/**
 * Azimuths each profile point is revolved through. Measured: at rest the count
 * makes no difference at all (the widest sample is always the one that has not
 * been swept yet), and under a turn the residual against the analytic
 * ellipsoid stops improving past about 48. Below that a pitched round body
 * starts to disagree with its own closed form. 48 costs roughly a tenth of a
 * frame for the whole silhouette, and a memo makes even that free unless the
 * head is actually moving.
 */
const AZIMUTHS = 48;
/**
 * Output knots, and the number of angular bins.
 *
 * A radial outline resolves a family only as well as its bins are fine, and
 * the error is worst where the radius changes fastest with angle. Measured at
 * rest against each family's own outline: at 48 bins the cone is 11.7% out
 * while every other family is under 2%; at 96 the cone is 5.8% and the rest
 * are under 1.2%; 144 buys the cone another 2.5 points and nothing else.
 *
 * 96 it is. The cost is paid in path bytes, and only by the families that go
 * through the sampler — a round character keeps the analytic path and its
 * exact 48-knot outline, which is why the goldens do not move.
 */
const KNOTS = 96;

export interface SolidOutlineOptions extends SurfaceShapeOptions {
  /** Front-to-back extent, a diameter like width and height. */
  depth: number;
  /** Head rotation in degrees. `z` is roll and belongs to the head group. */
  rotation: { x: number; y: number; z: number };
  /** Scales the angle, exactly as `projectFace` does. */
  perspective: number;
  azimuths?: number | undefined;
  knots?: number | undefined;
}

/**
 * True when the analytic ellipsoid silhouette is exact, so the renderer can
 * keep applying a scale to the flat outline instead of sampling a solid.
 *
 * The round family revolved *is* the ellipsoid `projectFace` already models,
 * so this is a statement about the geometry rather than a shortcut around it.
 * The `wobble === 0` clause mirrors the one `surfacePoints` already carries:
 * an organic character with no wobble is a round one.
 */
export function isAnalyticSolid(
  shape: ShapeFamily,
  wobble: number | undefined,
): boolean {
  return shape === "round" || (shape === "organic" && (wobble ?? 0) === 0);
}

/**
 * The turned silhouette as a radius per screen angle, sampled at `knots`
 * angles starting at 0 and running counter-clockwise in SVG's coordinates.
 *
 * A radius per angle is the right description because every family is
 * star-shaped about its own centre, and the orthographic shadow of a
 * star-shaped solid is star-shaped too. A convex hull would be smoother and
 * wrong — it would fill in the valleys between an organic character's lumps,
 * and the valleys are half of what makes it that character.
 */
export function solidRadii(o: SolidOutlineOptions): Float64Array {
  const { width, depth, rotation, perspective } = o;
  const azimuths = Math.max(3, o.azimuths ?? AZIMUTHS);
  const bins = Math.max(3, o.knots ?? KNOTS);

  const rx = Math.max(width, 1) / 2;
  // Depth enters as the aspect between the depth radius and the in-plane one,
  // so a shallow character revolves into a disc and a deep one into a barrel.
  const kappa = Math.max(depth, 1) / 2 / rx;

  const organic = o.shape === "organic" && (o.wobble ?? 0) !== 0;
  // For organic the wobble is applied to the *rotated ring*, not carried along
  // it — see fact 2 above. Everything else revolves its own outline directly.
  const profile: Point[] = evenlySpaced(
    organic ? surfacePoints({ ...o, shape: "round" }) : surfacePoints(o),
    PROFILE_SAMPLES,
  );
  const lobes = o.lobes ?? 5;
  const wobble = o.wobble ?? 0;
  const seed = o.seed ?? 0;

  const yaw = rotation.y * perspective * DEG;
  const pitch = rotation.x * perspective * DEG;
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);

  const radii = new Float64Array(bins);
  const step = (2 * Math.PI) / bins;

  for (const p of profile) {
    for (let j = 0; j < azimuths; j++) {
      const psi = (2 * Math.PI * j) / azimuths;
      // Revolve about the vertical axis. At psi = 0 this is the outline point
      // itself, which is what makes the flat outline the solid's own equator.
      let x = p.x * Math.cos(psi);
      let y = p.y;
      let z = p.x * kappa * Math.sin(psi);

      if (organic) {
        const m =
          1 + wobbleAt(Math.atan2(y, x), lobes, seed) * wobble * WOBBLE_REACH;
        x *= m;
        y *= m;
        z *= m;
      }

      // Yaw about the vertical axis, then pitch about the horizontal one —
      // the same order and the same arithmetic `projectFace` uses, so the
      // silhouette and the face anchors describe one head.
      const xYaw = x * cosYaw + z * sinYaw;
      const zYaw = z * cosYaw - x * sinYaw;
      const yPitch = y * cosPitch - zYaw * sinPitch;

      // Orthographic: drop z.
      const r = Math.hypot(xYaw, yPitch);
      if (r === 0) continue;
      const alpha = Math.atan2(yPitch, xYaw);
      // Bins are centred on the output angles, so the axes are bin centres —
      // which is what keeps a diamond's tips from being rounded away.
      let k = Math.round(alpha / step) % bins;
      if (k < 0) k += bins;
      if (r > radii[k]) radii[k] = r;
    }
  }

  return smoothRadii(fillGaps(radii));
}

/**
 * Resamples a closed outline evenly along its perimeter.
 *
 * The families sample themselves by their own parameter, which clusters points
 * wherever that parameter moves slowly — on a cone almost every point lands on
 * the flat base, leaving its long slant with no vertices at all between 5 and
 * 25 degrees. Revolving only ever sweeps a point toward the vertical, so those
 * angles then have nothing to fill them and the silhouette has to guess across
 * the hole. Spacing by arc length gives every stretch of surface a share of the
 * samples proportional to how much of the outline it actually is.
 */
function evenlySpaced(pts: Point[], count: number): Point[] {
  const n = pts.length;
  if (n < 3) return pts;

  const cum: number[] = [0];
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    cum.push((cum[i] ?? 0) + Math.hypot(b.x - a.x, b.y - a.y));
  }
  const total = cum[n] ?? 0;
  if (total === 0) return pts;

  const out: Point[] = [];
  let seg = 0;
  for (let k = 0; k < count; k++) {
    const want = (total * k) / count;
    while (seg < n - 1 && (cum[seg + 1] ?? 0) < want) seg++;
    const a = pts[seg];
    const b = pts[(seg + 1) % n];
    const start = cum[seg] ?? 0;
    const span = (cum[seg + 1] ?? 0) - start;
    const t = span === 0 ? 0 : (want - start) / span;
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
}

/**
 * Interpolates any bin no sample reached. A hole would otherwise read as a
 * dent the character does not have — and at a sharp taper the gap is real
 * geometry, not noise, so it has to be bridged rather than sampled harder.
 */
function fillGaps(radii: Float64Array): Float64Array {
  const n = radii.length;
  let filled = 0;
  for (const v of radii) if (v > 0) filled++;
  if (filled === n || filled === 0) return radii;

  const out = Float64Array.from(radii);
  for (let i = 0; i < n; i++) {
    if ((out[i] ?? 0) > 0) continue;
    let back = 1;
    while (back < n && (radii[(i - back + n) % n] ?? 0) === 0) back++;
    let fwd = 1;
    while (fwd < n && (radii[(i + fwd) % n] ?? 0) === 0) fwd++;
    const a = radii[(i - back + n) % n] ?? 0;
    const b = radii[(i + fwd) % n] ?? 0;
    out[i] = a + ((b - a) * back) / (back + fwd);
  }
  return out;
}

/**
 * One circular [1,2,1]/4 pass. The sampler quantises the silhouette into
 * angular bins, and neighbouring bins can win by samples a fraction of a
 * degree apart; without this the outline shimmers as the head is dragged.
 */
function smoothRadii(radii: Float64Array): Float64Array {
  const n = radii.length;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const prev = radii[(i - 1 + n) % n] ?? 0;
    const here = radii[i] ?? 0;
    const next = radii[(i + 1) % n] ?? 0;
    out[i] = (prev + 2 * here + next) / 4;
  }
  return out;
}

/**
 * Last call's inputs and result.
 *
 * The outline depends on the shape, its box, its depth, its organic parameters,
 * the head rotation and the perspective — and on nothing else. Not on the
 * breathing swell, which lives in the transform, nor on the mood, the blink or
 * the clock. So while the head is still, every frame of a playing loop asks for
 * the same outline, and the stage asks sixty times a second.
 *
 * Safe under the byte-stability rule for the strongest reason available:
 * `solidOutline` is pure, so a hit can only ever return the string the function
 * would have computed. The key uses `String(v)`, never `fmt`, because `fmt`
 * rounds and two genuinely different rotations must not collide.
 */
let memoKey = "";
let memoValue = "";

/** The turned silhouette as a closed path, already in screen coordinates. */
export function solidOutline(o: SolidOutlineOptions): string {
  const key = [
    o.shape,
    o.width,
    o.height,
    o.depth,
    o.roundness,
    o.lobes,
    o.wobble,
    o.seed,
    o.rotation.x,
    o.rotation.y,
    o.perspective,
    o.azimuths,
    o.knots,
    o.samples,
  ]
    .map((v) => String(v))
    .join("|");
  if (key === memoKey) return memoValue;
  memoKey = key;
  memoValue = buildOutline(o);
  return memoValue;
}

function buildOutline(o: SolidOutlineOptions): string {
  const radii = solidRadii(o);
  const n = radii.length;
  const step = (2 * Math.PI) / n;
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = i * step;
    const r = radii[i] ?? 0;
    pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
  }
  return smoothClosedPath(pts);
}
