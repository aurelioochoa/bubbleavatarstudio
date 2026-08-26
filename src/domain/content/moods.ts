// The starter mood library (FR-4.7): at least 24 expressions spanning the six
// bands the spec documents, so a new bubble is expressive before the user
// authors anything.
//
// Pure data. Nothing here imports document/create.ts — create.ts composes
// these records into a Kit, not the other way round, so the library stays
// readable as a list and the ids stay create.ts's business.
//
// Cleanroom (docs/CLEANROOM.md §3): the count and the spread of bands are
// capability parity; every name and every delta below is ours.
import type { ColorOverride, HeadPose, MoodEye } from "../document/types";

/** The expressive range FR-4.7 names. Every band carries at least one mood. */
export const MOOD_BANDS = [
  "alert",
  "calm",
  "warm",
  "negative",
  "sleepy",
  "playful",
] as const;

export type MoodBand = (typeof MOOD_BANDS)[number];

/**
 * A mood minus its id. `key` is a stable local handle so loops.ts can name a
 * mood without depending on its position in the array.
 */
export interface MoodSpec {
  key: string;
  name: string;
  band: MoodBand;
  left: MoodEye;
  right: MoodEye;
  head: HeadPose;
  colorOverride: ColorOverride;
}

const NEUTRAL: MoodEye = {
  rotationXDeg: 0,
  rotationYDeg: 0,
  rotationZDeg: 0,
  scaleX: 1,
  scaleY: 1,
  offsetX: 0,
  offsetY: 0,
};

const eye = (patch: Partial<MoodEye>): MoodEye => ({ ...NEUTRAL, ...patch });

const FACING: HeadPose = { x: 0, y: 0, z: 0 };

/**
 * FR-4.10: where each mood turns the whole character, in degrees — pitch on
 * `x`, yaw on `y`, roll on `z`.
 *
 * A table rather than a fifth argument on every entry below, so the list of
 * moods stays a list. A mood absent from here faces straight ahead, which is
 * what every mood did before poses existed.
 *
 * The values are ours and they are deliberately small: a mood is an
 * expression, not a camera move, and a body that swings twenty degrees per
 * keyframe reads as a character being shaken rather than one reacting. They
 * are authored from what each mood means — a bow leans away and down, a proud
 * one lifts its chin, a sceptical one cocks to the side.
 */
const POSES: Record<string, Partial<HeadPose>> = {
  // alert — leaning in, or recoiling from, whatever was noticed
  curious: { x: -3, y: 12, z: 6 },
  surprised: { x: 8, y: -4 },
  attentive: { y: 6 },
  startled: { x: 10, y: -10, z: -6 },
  // calm — small settling movements
  calm: { x: -2 },
  thoughtful: { x: -4, y: -14, z: 8 },
  patient: { x: -6 },
  focused: { x: 3, y: 3 },
  // warm
  happy: { x: 4, z: -3 },
  fond: { x: 2, z: 9 },
  proud: { x: 12, z: -4 },
  grateful: { x: -8, z: 3 },
  // negative — turning away, or sinking
  annoyed: { y: -16, z: -5 },
  sad: { x: -14, z: 4 },
  worried: { x: -8, y: 8 },
  sceptical: { x: 5, y: -12, z: 10 },
  // sleepy — the head drooping further with each stage
  sleepy: { x: -10, z: 5 },
  drowsy: { x: -12, z: 8 },
  dozing: { x: -16, z: 12 },
  yawning: { x: 14, z: -3 },
  // playful
  playful: { x: 4, y: 14, z: -14 },
  wink: { y: 6, z: -10 },
  smug: { x: 6, y: -10, z: 7 },
  mischief: { x: -3, y: 16, z: -9 },
};

const poseOf = (key: string): HeadPose => ({ ...FACING, ...POSES[key] });

/** Both eyes take the same delta — a shared glance, squash or tilt. */
function sym(
  key: string,
  name: string,
  band: MoodBand,
  patch: Partial<MoodEye>,
): MoodSpec {
  const both = eye(patch);
  return {
    key,
    name,
    band,
    left: both,
    right: { ...both },
    head: poseOf(key),
    colorOverride: null,
  };
}

/** The eyes differ — a wink, a one-sided squint, a cocked brow. */
function pair(
  key: string,
  name: string,
  band: MoodBand,
  left: Partial<MoodEye>,
  right: Partial<MoodEye>,
): MoodSpec {
  return {
    key,
    name,
    band,
    left: eye(left),
    right: eye(right),
    head: poseOf(key),
    colorOverride: null,
  };
}

/**
 * Order is load-bearing at the head of the list: `starterKit()` fills injected
 * ids positionally and several tests address the first four moods by index.
 * The remaining twenty are grouped by band for readability only — the `band`
 * field, not the position, is what the UI groups on.
 */
export const STARTER_MOODS: readonly MoodSpec[] = [
  // ── pinned positions 0-3 ──────────────────────────────────────────────
  sym("happy", "happy", "warm", {
    rotationZDeg: -8,
    scaleX: 1.15,
    scaleY: 0.8,
    offsetY: 4,
  }),
  sym("curious", "curious", "alert", {
    rotationZDeg: 10,
    scaleX: 0.9,
    scaleY: 1.2,
    offsetY: -2,
  }),
  sym("sleepy", "sleepy", "sleepy", {
    scaleX: 0.7,
    scaleY: 0.25,
    offsetY: 10,
  }),
  sym("surprised", "surprised", "alert", {
    scaleX: 1.35,
    scaleY: 1.35,
    offsetY: -6,
  }),

  // ── alert ─────────────────────────────────────────────────────────────
  sym("attentive", "attentive", "alert", {
    scaleX: 1.05,
    scaleY: 1.18,
    offsetY: -3,
    rotationYDeg: 6,
  }),
  sym("startled", "startled", "alert", {
    scaleX: 1.45,
    scaleY: 1.5,
    offsetY: -9,
  }),

  // ── calm ──────────────────────────────────────────────────────────────
  sym("calm", "calm", "calm", { scaleY: 0.86, offsetY: 2 }),
  pair(
    "thoughtful",
    "thoughtful",
    "calm",
    { scaleY: 0.8, rotationZDeg: -6, offsetX: 8 },
    { scaleY: 1.05, rotationZDeg: 4, offsetX: 8 },
  ),
  sym("patient", "patient", "calm", {
    scaleX: 0.95,
    scaleY: 0.72,
    offsetY: 5,
    rotationXDeg: 18,
  }),
  sym("focused", "focused", "calm", {
    scaleX: 0.8,
    scaleY: 0.9,
    offsetX: -4,
    rotationYDeg: 14,
  }),

  // ── warm ──────────────────────────────────────────────────────────────
  sym("fond", "fond", "warm", {
    scaleX: 1.2,
    scaleY: 0.62,
    offsetY: 6,
    rotationZDeg: -5,
  }),
  sym("proud", "proud", "warm", {
    scaleX: 1.1,
    scaleY: 0.75,
    offsetY: -4,
    rotationXDeg: 12,
  }),
  sym("grateful", "grateful", "warm", {
    scaleX: 1.08,
    scaleY: 0.55,
    offsetY: 8,
  }),

  // ── negative ──────────────────────────────────────────────────────────
  pair(
    "annoyed",
    "annoyed",
    "negative",
    { rotationZDeg: 14, scaleY: 0.6 },
    { rotationZDeg: -14, scaleY: 0.6 },
  ),
  pair(
    "sad",
    "sad",
    "negative",
    { rotationZDeg: -12, scaleY: 0.85, offsetY: 8 },
    { rotationZDeg: 12, scaleY: 0.85, offsetY: 8 },
  ),
  pair(
    "worried",
    "worried",
    "negative",
    { rotationZDeg: -8, scaleX: 1.12, scaleY: 1.08, offsetY: 3 },
    { rotationZDeg: 8, scaleX: 1.12, scaleY: 1.08, offsetY: 3 },
  ),
  pair(
    "sceptical",
    "sceptical",
    "negative",
    { scaleY: 0.45, rotationZDeg: 8 },
    { scaleY: 1.1, rotationZDeg: -4 },
  ),

  // ── sleepy ────────────────────────────────────────────────────────────
  sym("drowsy", "drowsy", "sleepy", {
    scaleY: 0.45,
    offsetY: 7,
    rotationXDeg: 24,
  }),
  sym("dozing", "dozing", "sleepy", { scaleY: 0.14, offsetY: 12 }),
  sym("yawning", "yawning", "sleepy", {
    scaleX: 0.6,
    scaleY: 0.3,
    offsetY: 9,
    rotationXDeg: 30,
  }),

  // ── playful ───────────────────────────────────────────────────────────
  pair(
    "playful",
    "playful",
    "playful",
    { scaleX: 1.2, scaleY: 1.1, rotationZDeg: -10, offsetY: -3 },
    { scaleX: 1.2, scaleY: 0.5, rotationZDeg: 10, offsetY: 2 },
  ),
  pair(
    "wink",
    "wink",
    "playful",
    { scaleY: 0.12, rotationZDeg: -6 },
    { scaleY: 1.05 },
  ),
  sym("smug", "smug", "playful", {
    scaleY: 0.55,
    rotationZDeg: 6,
    offsetX: 10,
  }),
  sym("mischief", "mischief", "playful", {
    scaleX: 0.92,
    scaleY: 0.5,
    offsetX: -9,
    rotationYDeg: 18,
  }),
];
