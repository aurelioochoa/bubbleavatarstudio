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
  cubeExponent,
  surfacePoints,
  wobbleAt,
  WOBBLE_REACH,
  type ShapeFamily,
  type SurfaceShapeOptions,
} from "./shapes";
import { fmt, smoothClosedPath, type Point } from "./primitives";
import { rotatePoint, turnAngles } from "./projection";

/**
 * How finely the flat outline is resampled before it is revolved. This is not
 * the same as the 48 knots that come back out: revolving only ever sweeps a
 * point *toward* the vertical, so a tapered family like `cone` leaves whole
 * angular gaps near the horizontal if it is revolved at authoring density.
 * Sampling the outline densely fills them from the edges between its corners.
 */
const PROFILE_SAMPLES = 192;
/**
 * Azimuths each profile point is revolved through.
 *
 * Two samplings feed the same angular bins, and which one carries them depends
 * on the turn. Face-on, a screen angle is decided by where the point sits on
 * the profile, and the cross-section only scales it in x. Pole-on, the turn
 * multiplies the profile's own y by `cos(pitch)` and annihilates it: the
 * cross-section then decides every screen angle by itself and the profile
 * contributes none. So the count has to clear `KNOTS` with room to spare —
 * these azimuths are spaced evenly along the ring's perimeter, not evenly in
 * angle, so a count merely equal to the bins still collides in places and
 * leaves holes elsewhere.
 *
 * That is why 48 was enough for years of face-on and yawed poses and then fell
 * apart the first time a character was turned to look straight up. At 48
 * azimuths feeding 96 bins a pole-on body had every other bin guessed at by
 * `fillGaps`, and a drop, capsule, cylinder, cone or diamond ran visibly
 * polygonal — worst jump between neighbouring bins 8-14% of the radius. 96
 * fixes the pole itself but still spikes to 10% a degree short of it; 128
 * holds every family under 2% across the whole approach, and 160 and 192 are
 * indistinguishable from it.
 *
 * A boxy cross-section wanted 128 already, for its own reason: a superellipse
 * spends almost all of its parameter on the corners and crosses each flat face
 * in a sliver of it, so the face centres — the samples that decide how wide a
 * nearly edge-on box looks — are the first thing lost. At 48 a cube pitched
 * past about 80 degrees ran 36, 48, 36 across neighbouring bins along its top
 * edge, where the truth is a flat 88.
 *
 * Two reasons, one number, so there is one constant. The residual against the
 * analytic ellipsoid stopped improving past about 48, so nothing else in the
 * silhouette asks for any of this. Measured cost for the whole silhouette is
 * around a tenth of a frame, and a memo makes even that free unless the head
 * is actually moving.
 */
const AZIMUTHS = 128;
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
/**
 * The solid itself: the outline that generates it, the cross-section it is
 * swept through, and the turn that is about to be applied.
 *
 * Shared so the silhouette and the wireframe are built from one description.
 * A mesh drawn on an ellipsoid while the body was a cube said the opposite of
 * what a wireframe is for.
 */
interface Sweep {
  profile: Point[];
  ring: Point[];
  turn: ReturnType<typeof turnAngles>;
  organic: boolean;
  lobes: number;
  wobble: number;
  seed: number;
}

function buildSweep(
  o: SolidOutlineOptions,
  profileSamples: number,
  requestedAzimuths?: number,
): Sweep {
  const rx = Math.max(o.width, 1) / 2;
  // Depth enters as the aspect between the depth radius and the in-plane one,
  // so a shallow character sweeps into a disc and a deep one into a barrel.
  const kappa = Math.max(o.depth, 1) / 2 / rx;

  // How the sweep goes round. Six families are solids of revolution, so their
  // cross-section is an ellipse. `cube` is the one that is not: revolve a
  // square profile and you get a cylinder, which is a different character
  // entirely. Sweeping it with superelliptic functions instead builds a real
  // superellipsoid — and because both start at (1, 0), either way the flat
  // outline is still the solid's own equator.
  const boxy = o.shape === "cube";
  const azimuths = Math.max(3, requestedAzimuths ?? AZIMUTHS);
  // The same exponent the profile was drawn at. Sweep at a different one and
  // the solid meets itself at a crease, which shows as the silhouette notching
  // inward once the head turns.
  const power = boxy ? 2 / cubeExponent(o.roundness) : 1;

  // The cross-section, sampled evenly in its own polar angle rather than
  // evenly in the parameter that draws it.
  //
  // Neither of the obvious spacings works. Evenly in the parameter fails for
  // `cube`: a superellipse is parameterised by angle, but at a boxy exponent
  // almost every parameter value lands on a corner — |cos psi|^0.15 sits
  // within a hair of 1 across most of its range and then falls off a cliff —
  // so the corners are sampled densely and the flat faces barely at all, and
  // the ring is four points pretending to be a square.
  //
  // Evenly along the perimeter fixes that and fails for a shallow body. Arc
  // length piles samples onto the ends of the wide axis of an eccentric
  // cross-section and starves its flattened sides, and pole-on those starved
  // directions are the whole silhouette — see `AZIMUTHS` for why the ring
  // carries every screen angle there. A capsule of depth 20 in a 220 box came
  // out with a sawtooth edge, 84% away from its own converged shape.
  //
  // Polar angle is the spacing the bins actually ask for: pole-on a ring
  // sample's screen angle *is* its polar angle, so one sample per direction is
  // one sample per bin whatever the aspect, and a boxy face centre is a
  // direction like any other.
  const ring = byPolarAngle(
    Array.from({ length: azimuths * 4 }, (_, j) => {
      const psi = (2 * Math.PI * j) / (azimuths * 4);
      return boxy
        ? {
            x: signedPow(Math.cos(psi), power),
            y: kappa * signedPow(Math.sin(psi), power),
          }
        : { x: Math.cos(psi), y: kappa * Math.sin(psi) };
    }),
    azimuths,
  );

  const organic = o.shape === "organic" && (o.wobble ?? 0) !== 0;
  // For organic the wobble is applied to the swept point, not carried along
  // the ring — see fact 2 at the top. Everything else sweeps its own outline.
  const profile = evenlySpaced(
    organic ? surfacePoints({ ...o, shape: "round" }) : surfacePoints(o),
    profileSamples,
  );

  return {
    profile,
    ring,
    turn: turnAngles(o.perspective, o.rotation),
    organic,
    lobes: o.lobes ?? 5,
    wobble: o.wobble ?? 0,
    seed: o.seed ?? 0,
  };
}

/** One point of the solid, turned and ready to have its z dropped. */
function sweptPoint(
  s: Sweep,
  p: Point,
  ring: Point,
): { x: number; y: number; z: number } {
  // The ring starts at (1, 0), so its first sample is the outline point
  // itself — which is what makes the flat outline the solid's own equator
  // whichever cross-section it is swept through.
  let x = p.x * ring.x;
  let y = p.y;
  let z = p.x * ring.y;

  if (s.organic) {
    const m =
      1 + wobbleAt(Math.atan2(y, x), s.lobes, s.seed) * s.wobble * WOBBLE_REACH;
    x *= m;
    y *= m;
    z *= m;
  }

  // The same arithmetic `projectFace` uses, so the silhouette, the wireframe
  // and the face anchors all describe one head.
  return rotatePoint(x, y, z, s.turn);
}

export function solidRadii(o: SolidOutlineOptions): Float64Array {
  const bins = Math.max(3, o.knots ?? KNOTS);
  const s = buildSweep(o, PROFILE_SAMPLES, o.azimuths);

  const radii = new Float64Array(bins);
  const step = (2 * Math.PI) / bins;

  for (const p of s.profile) {
    for (const ring of s.ring) {
      const q = sweptPoint(s, p, ring);
      // Orthographic: drop z.
      const r = Math.hypot(q.x, q.y);
      if (r === 0) continue;
      const alpha = Math.atan2(q.y, q.x);
      // Bins are centred on the output angles, so the axes are bin centres —
      // which is what keeps a diamond's tips from being rounded away.
      let k = Math.round(alpha / step) % bins;
      if (k < 0) k += bins;
      if (r > radii[k]) radii[k] = r;
    }
  }

  return smoothRadii(fillGaps(radii));
}

/** Latitude rings the wireframe draws. */
const MESH_PARALLELS = 5;
/** Great circles through the poles. Each spans both sides of the solid. */
const MESH_MERIDIANS = 6;
/** Points along each mesh line. */
const MESH_SAMPLES = 40;

/**
 * A lat/long wireframe over the solid, as SVG path data.
 *
 * Built from the same profile and cross-section the silhouette is, so a cube
 * wears a boxy cage and a cone's rings shrink toward its apex. Drawn on the
 * ellipsoid instead, every character wore the same sphere — which is the
 * opposite of what a wireframe is there to say.
 *
 * Both halves of every line are kept. A near-hemisphere-only mesh reads as a
 * bowl; it is seeing the lines run round the back that makes it read as solid.
 */
export function solidMesh(o: SolidOutlineOptions, scale = 1): string[] {
  const s = buildSweep(o, MESH_SAMPLES * 2, MESH_SAMPLES);
  const nProfile = s.profile.length;
  const nRing = s.ring.length;

  const trace = (
    at: (i: number) => { x: number; y: number },
    n: number,
  ): string =>
    Array.from({ length: n }, (_, i) => {
      const q = at(i);
      return `${i === 0 ? "M" : "L"} ${fmt(q.x * scale)} ${fmt(q.y * scale)}`;
    }).join(" ");

  const lines: string[] = [];

  // Parallels: one closed cross-section at each of several heights. The poles
  // are skipped, where a ring is a dot.
  for (let i = 1; i <= MESH_PARALLELS; i++) {
    // The profile runs right side, bottom, left side, top; sampling the first
    // half walks it from one pole to the other exactly once.
    const idx = Math.round((nProfile / 2) * (i / (MESH_PARALLELS + 1)));
    const p = s.profile[idx];
    lines.push(trace((j) => sweptPoint(s, p, s.ring[j % nRing]), nRing + 1));
  }

  // Meridians: the whole profile swept to one azimuth, so each is the
  // character's own outline stood up at that angle.
  for (let m = 0; m < MESH_MERIDIANS; m++) {
    const ring = s.ring[Math.round((nRing * m) / MESH_MERIDIANS) % nRing];
    lines.push(
      trace((i) => sweptPoint(s, s.profile[i % nProfile], ring), nProfile + 1),
    );
  }

  return lines;
}

/** |v|^m keeping v's sign, which is what a superellipse needs. */
function signedPow(v: number, m: number): number {
  return Math.sign(v) * Math.abs(v) ** m;
}

/**
 * Resamples a closed, star-shaped ring evenly in polar angle.
 *
 * `pts` must run once counter-clockwise from (1, 0) — both cross-sections do,
 * and both have a polar angle that increases strictly with the parameter, so
 * the walk below never has to search backwards. The returned points keep the
 * ring's own shape; only which points of it are kept changes.
 *
 * The first output is `pts[0]` unchanged, which is what keeps the flat outline
 * the solid's own equator.
 */
function byPolarAngle(pts: Point[], count: number): Point[] {
  const n = pts.length;
  if (n < 3) return pts;

  // Unwrapped so the angles increase monotonically across the seam at ±pi
  // instead of jumping, which is what lets one forward walk cover the ring.
  const angle: number[] = [];
  let turns = 0;
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const a = Math.atan2(p.y, p.x);
    if (i > 0 && a < prev - Math.PI) turns += 2 * Math.PI;
    prev = a;
    angle.push(a + turns);
  }

  const out: Point[] = [];
  let seg = 0;
  for (let k = 0; k < count; k++) {
    const want = (2 * Math.PI * k) / count;
    while (seg < n - 1 && (angle[seg + 1] ?? 0) < want) seg++;
    const a = pts[seg];
    const b = pts[(seg + 1) % n];
    const start = angle[seg] ?? 0;
    const span = (angle[seg + 1] ?? 2 * Math.PI) - start;
    const t = span === 0 ? 0 : (want - start) / span;
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
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
 * How large a bin's radius has to be, relative to the widest, to count as a
 * sample rather than as numerical dust. See `fillGaps`.
 */
const REACHED = 1e-6;

/**
 * Interpolates any bin no sample reached. A hole would otherwise read as a
 * dent the character does not have — and at a sharp taper the gap is real
 * geometry, not noise, so it has to be bridged rather than sampled harder.
 *
 * "Reached" is measured against the widest bin rather than against zero. Seen
 * pole-on the turn annihilates the profile's own y — `cos(90°)` is 6e-17, not
 * 0 — so the profile's two poles, which are single points on the axis, land in
 * bins as radii of about 1e-14. Read as samples they pin those bins to nothing
 * and `smoothRadii` then cuts a notch halfway to the centre beside each one,
 * which is the deformation a drop, capsule, cylinder, cone or diamond showed
 * when it was turned to face the viewer directly.
 */
function fillGaps(radii: Float64Array): Float64Array {
  const n = radii.length;
  let hi = 0;
  for (const v of radii) hi = Math.max(hi, v);
  const floor = hi * REACHED;

  let filled = 0;
  for (const v of radii) if (v > floor) filled++;
  if (filled === n || filled === 0) return radii;

  const out = Float64Array.from(radii);
  for (let i = 0; i < n; i++) {
    if ((out[i] ?? 0) > floor) continue;
    let back = 1;
    while (back < n && (radii[(i - back + n) % n] ?? 0) <= floor) back++;
    let fwd = 1;
    while (fwd < n && (radii[(i + fwd) % n] ?? 0) <= floor) fwd++;
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
