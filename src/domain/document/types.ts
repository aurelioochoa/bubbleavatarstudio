// Domain types — Bubble Avatar v1 schema (docs/03). Pure TS, no React/DOM.
export interface Vec2 {
  x: number;
  y: number;
}

export type HexColor = string;

export type ExtraKind = "blob" | "capsule" | "circle" | "ring";
export type ColorRole = "body" | "accent" | "custom";

export interface Surface {
  kind: "blob";
  width: number;
  height: number;
  roundness: number; // 0..1
  x: number;
  y: number;
  rotationDeg: number;
  perspective: number; // 0..1
}

export interface ExtraPrimitive {
  id: string;
  kind: ExtraKind;
  width: number;
  height: number;
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

export interface Mood {
  id: string;
  name: string;
  left: MoodEye;
  right: MoodEye;
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
  version: 1;
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
