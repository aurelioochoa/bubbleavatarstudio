// Domain types — Bubble Avatar v4 schema (docs/03). Pure TS, no React/DOM.
import type { ShapeFamily } from "../geometry/shapes";

export type { ShapeFamily };
export interface Vec2 {
  x: number;
  y: number;
}

export type HexColor = string;

export type ExtraKind = "blob" | "capsule" | "circle" | "ring";
export type ColorRole = "body" | "accent" | "custom";

export interface Surface {
  kind: "blob";
  /** FR-2.6. The outline family; "round" is the pre-v2 superellipse. */
  shape: ShapeFamily;
  width: number;
  height: number;
  /**
   * FR-2.2. Front-to-back size of the solid, in the same units as width and
   * height. Authored since v3; before that the projection derived it as
   * `min(width, height) * 0.85`, so no character could be shallow or deep.
   */
  depth: number;
  roundness: number; // 0..1
  x: number;
  y: number;
  rotationDeg: number;
  perspective: number; // 0..1
  /** FR-2.7, organic only. Bumps around the perimeter, 3..10. */
  lobes?: number;
  /** FR-2.7, organic only. How far the radius strays from round, 0..1. */
  wobble?: number;
  /** FR-2.7, organic only. Which arrangement of bumps; any integer. */
  seed?: number;
}

export interface ExtraPrimitive {
  id: string;
  kind: ExtraKind;
  width: number;
  height: number;
  /**
   * FR-2.3. Front-to-back size, in the same units as width and height. An
   * extra is a solid assembled around the body, so it has a volume of its own
   * and turns with the head instead of being scaled by whatever the surface
   * beneath it happens to be doing.
   */
  depth: number;
  roundness: number;
  x: number;
  y: number;
  rotationDeg: number;
  z: number;
  colorRole: ColorRole;
  color: HexColor;
}

export interface Body {
  surface: Surface;
  extras: ExtraPrimitive[];
}

export interface BubbleColors {
  body: HexColor;
  accent: HexColor;
  eyes: HexColor;
}

export interface EyeShape {
  width: number;
  height: number;
  roundness: number;
}

export interface EyePlacement {
  offsetX: number;
  offsetY: number;
  rotationDeg: number;
  scaleX: number;
  scaleY: number;
}

export interface RestingFace {
  eye: EyeShape;
  left: EyePlacement;
  right: EyePlacement;
  spacing: number;
  linked: boolean;
}

export interface AmbientConfig {
  enabled: boolean;
  bodyAmplitude: number;
  bodyPeriodMs: number;
  eyeAmplitude: number;
  eyePeriodMs: number;
}

export interface MoodEye {
  rotationXDeg: number;
  rotationYDeg: number;
  rotationZDeg: number;
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
}

export type ColorOverride = Partial<Pick<BubbleColors, "body" | "eyes">> | null;

/**
 * A three-axis orientation in degrees: yaw on `y`, pitch on `x`, roll on `z`
 * — the same axes and signs `projection.ts` reads for the head, so a pose a
 * mood carries and a pose a drag sets are the same kind of number.
 */
export interface HeadPose {
  x: number;
  y: number;
  z: number;
}

export interface Mood {
  id: string;
  name: string;
  left: MoodEye;
  right: MoodEye;
  /**
   * FR-4.10: where the whole character is turned while this mood shows. A
   * mood used to move only the eyes, on a body that never moved.
   */
  head: HeadPose;
  colorOverride: ColorOverride;
}

export type TransitionStyle = "linear" | "ease" | "spring" | "step";
export type PlaybackMode = "loop" | "once" | "pingpong";

export interface LoopStep {
  id: string;
  moodId: string;
  holdMs: number;
  transition: TransitionStyle;
}

export interface BlinkConfig {
  enabled: boolean;
  minIntervalMs: number;
  maxIntervalMs: number;
  durationMs: number;
}

export interface Loop {
  id: string;
  name: string;
  group: string;
  steps: LoopStep[];
  mode: PlaybackMode;
  springSpeed: number;
  blink: BlinkConfig;
}

export interface Kit {
  moods: Mood[];
  loops: Loop[];
}

export interface Bubble {
  id: string;
  name: string;
  body: Body;
  colors: BubbleColors;
  restingFace: RestingFace;
  ambient: AmbientConfig;
  /** null ⇒ inherits starterKit (copy-on-write, docs/03 §5). */
  ownKit: Kit | null;
}

export type Locale = "es" | "en";

export interface StudioDocument {
  version: 6;
  kind: "bubble-studio-project";
  activeBubbleId: string | null;
  locale: Locale;
  bubbles: Bubble[];
  starterKit: Kit;
}

/** Head rotation applied on the stage (live, not persisted in the document). */
export interface HeadRotation {
  x: number;
  y: number;
  z: number;
}
